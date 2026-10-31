import { describe, it, expect } from 'vitest';
import { evaluateEvidenceIntelligence } from '../src/lib/evidence-intelligence';
import { generateTokensForBatch } from '../src/lib/proof-of-delivery';
import { resolveProjectQuestion, AssistantContext } from '../src/lib/voice-assistant';
import { store } from '../src/lib/store';
import { Project, Expense, EvidenceFile, DistributionBatch, ProjectMilestone, Donation } from '../src/types';

describe('Public Application Verification - 3 Integrated Features', () => {
  // =========================================================================
  // 1. EVIDENCE INTELLIGENCE ENGINE
  // =========================================================================
  describe('1. Evidence Intelligence Verification', () => {
    const mockProject: Project = {
      id: 'proj-verif-1',
      organization_id: 'org-verif-1',
      title: 'School Kit Support Drive',
      purpose: 'School kit distribution to underprivileged students',
      goal_amount: 100000,
      currency: 'INR',
      start_date: '2026-10-01',
      public_slug: 'school-kit-support-2026',
      status: 'ACTIVE',
      created_at: '2026-10-01T00:00:00Z'
    };

    it('Scenario 1A: Detects Duplicate Receipt (Identical SHA-256 within Organization)', () => {
      const duplicateSha256 = '0x8f2d5a3c1e4b7a9f0d2c4e6a8b1d3f5e7c9a2b4d6f8e0a1c3e5b7d9f1a2c4e6a';

      const expenses: Expense[] = [
        {
          id: 'exp-original',
          organization_id: 'org-verif-1',
          project_id: 'proj-verif-1',
          amount: 25000,
          spent_at: '2026-10-10',
          category: 'Educational materials',
          description: 'Original Invoice for Notebooks & Kits',
          vendor_label: 'Stationery World',
          created_at: '2026-10-10T00:00:00Z'
        },
        {
          id: 'exp-duplicate',
          organization_id: 'org-verif-1',
          project_id: 'proj-verif-1',
          amount: 25000,
          spent_at: '2026-10-15',
          category: 'Educational materials',
          description: 'Duplicate claim attempt with same receipt',
          vendor_label: 'Stationery World Duplicate',
          created_at: '2026-10-15T00:00:00Z'
        }
      ];

      const evidenceFiles: EvidenceFile[] = [
        {
          id: 'ev-1',
          organization_id: 'org-verif-1',
          project_id: 'proj-verif-1',
          expense_id: 'exp-original',
          private_storage_path: 'invoices/stationery_oct10.pdf',
          sha256: duplicateSha256,
          file_name_safe: 'stationery_oct10.pdf',
          file_size_bytes: 18450,
          mime_type: 'application/pdf',
          evidence_type: 'INVOICE',
          visibility: 'PRIVATE',
          review_status: 'DOCUMENT_UPLOADED',
          created_at: '2026-10-10T00:00:00Z'
        },
        {
          id: 'ev-2',
          organization_id: 'org-verif-1',
          project_id: 'proj-verif-1',
          expense_id: 'exp-duplicate',
          private_storage_path: 'invoices/stationery_oct15_dup.pdf',
          sha256: duplicateSha256, // IDENTICAL SHA-256 HASH
          file_name_safe: 'stationery_oct15_dup.pdf',
          file_size_bytes: 18450,
          mime_type: 'application/pdf',
          evidence_type: 'INVOICE',
          visibility: 'PRIVATE',
          review_status: 'DOCUMENT_UPLOADED',
          created_at: '2026-10-15T00:00:00Z'
        }
      ];

      const { flags, summary } = evaluateEvidenceIntelligence(
        expenses,
        evidenceFiles,
        mockProject,
        evidenceFiles
      );

      // Verify flag triggers with exact details
      expect(summary.duplicateWarningsCount).toBeGreaterThanOrEqual(1);
      const dupFlag = flags.find((f) => f.flag_type === 'DUPLICATE_EVIDENCE');
      expect(dupFlag).toBeDefined();
      expect(dupFlag?.severity).toBe('HIGH');
      expect(dupFlag?.details?.duplicate_sha256).toBe(duplicateSha256);
      expect((dupFlag?.details as any)?.duplicate_filename).toBe('stationery_oct15_dup.pdf');
    });

    it('Scenario 1B: Detects Amount Mismatch (Recorded ₹5,000 vs Invoice ₹4,500)', () => {
      const expenses: Expense[] = [
        {
          id: 'exp-mismatch-test',
          organization_id: 'org-verif-1',
          project_id: 'proj-verif-1',
          amount: 5000,          // Recorded NGO Expense: ₹5,000
          invoice_amount: 4500,  // Verified Invoice: ₹4,500
          spent_at: '2026-10-12',
          category: 'Logistics',
          description: 'School Delivery Van Hire',
          vendor_label: 'City Express Logistics',
          created_at: '2026-10-12T00:00:00Z'
        }
      ];

      const evidenceFiles: EvidenceFile[] = [
        {
          id: 'ev-mismatch',
          organization_id: 'org-verif-1',
          project_id: 'proj-verif-1',
          expense_id: 'exp-mismatch-test',
          private_storage_path: 'invoices/van_hire.pdf',
          sha256: '0x3344556677889900aabbccddeeff0011223344556677889900aabbccddeeff00',
          file_name_safe: 'van_hire.pdf',
          file_size_bytes: 8400,
          mime_type: 'application/pdf',
          evidence_type: 'INVOICE',
          visibility: 'PRIVATE',
          review_status: 'DOCUMENT_UPLOADED',
          created_at: '2026-10-12T00:00:00Z'
        }
      ];

      const { flags, summary } = evaluateEvidenceIntelligence(
        expenses,
        evidenceFiles,
        mockProject,
        evidenceFiles
      );

      expect(summary.amountMismatchCount).toBe(1);
      const mismatchFlag = flags.find((f) => f.flag_type === 'AMOUNT_MISMATCH');
      expect(mismatchFlag).toBeDefined();
      expect(mismatchFlag?.severity).toBe('HIGH');
      expect(mismatchFlag?.details?.recorded_amount).toBe(5000);
      expect(mismatchFlag?.details?.invoice_amount).toBe(4500);
      expect(mismatchFlag?.details?.difference).toBe(500);
      expect(mismatchFlag?.message).toContain('Difference: ₹500');
    });

    it('Scenario 1C: Tenant-Scoped Isolation (Does not leak or flag cross-organization files)', () => {
      // Organization 2 has the same hash, but org 1 evaluation only receives org 1 evidence
      const crossOrgSharedHash = '0xdeadbeef11223344556677889900aabbccddeeff0011223344556677889900';
      const org1Expenses: Expense[] = [
        {
          id: 'exp-org1',
          organization_id: 'org-verif-1',
          project_id: 'proj-verif-1',
          amount: 10000,
          spent_at: '2026-10-14',
          category: 'Educational materials',
          description: 'Org 1 textbooks',
          vendor_label: 'Govt Depot',
          created_at: '2026-10-14T00:00:00Z'
        }
      ];
      const org1Evidence: EvidenceFile[] = [
        {
          id: 'ev-org1',
          organization_id: 'org-verif-1',
          project_id: 'proj-verif-1',
          expense_id: 'exp-org1',
          private_storage_path: 'invoices/org1_depot.pdf',
          sha256: crossOrgSharedHash,
          file_name_safe: 'org1_depot.pdf',
          file_size_bytes: 9200,
          mime_type: 'application/pdf',
          evidence_type: 'INVOICE',
          visibility: 'PRIVATE',
          review_status: 'DOCUMENT_UPLOADED',
          created_at: '2026-10-14T00:00:00Z'
        }
      ];

      // Scoped only to org-verif-1
      const { flags, summary } = evaluateEvidenceIntelligence(
        org1Expenses,
        org1Evidence,
        mockProject,
        org1Evidence
      );

      expect(summary.duplicateWarningsCount).toBe(0);
      expect(flags.find((f) => f.flag_type === 'DUPLICATE_EVIDENCE')).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. PROOF OF DELIVERY (QR ACKNOWLEDGEMENT & REJECTION)
  // =========================================================================
  describe('2. Proof of Delivery QR Lifecycle Verification', () => {
    const testBatch: DistributionBatch = {
      id: 'batch-verif-99',
      organization_id: 'org-verif-1',
      project_id: 'proj-verif-1',
      batch_number: 'BATCH-VERIF-99',
      batch_name: 'Jaipur Rural Verification Distribution',
      distribution_date: '2026-10-28',
      location_or_institution: 'Govt Upper Primary School, Sanganer',
      item_description: 'School Kit (Bag + Stationery)',
      expected_quantity: 3,
      acknowledged_count: 0,
      status: 'IN_PROGRESS',
      created_at: '2026-10-28T00:00:00Z',
      updated_at: '2026-10-28T00:00:00Z'
    };

    it('Scan QR -> Acknowledge -> Scan Again -> Confirm Rejection', async () => {
      // 1. Generate single-use tokens & QR cards
      const { cards, tokensToStore } = await generateTokensForBatch(testBatch, 'http://localhost:5173');
      expect(cards.length).toBe(3);
      expect(tokensToStore.length).toBe(3);

      // 2. Store batch and tokens in local store
      await store.createDistributionBatch(testBatch);
      await store.storeDeliveryTokens(tokensToStore);

      const targetCard = cards[0];
      const targetToken = targetCard.token;

      // 3. First scan & acknowledgement attempt
      const firstAttempt = await store.redeemDeliveryToken(targetToken);

      expect(firstAttempt.success).toBe(true);
      expect(firstAttempt.redeemed_at).toBeDefined();

      // Check batch acknowledged count incremented to 1
      const batches = store.getDistributionBatches(testBatch.project_id);
      const updated = batches.find((b) => b.id === testBatch.id);
      expect(updated?.acknowledged_count).toBe(1);

      // 4. Second scan attempt with the SAME QR token -> MUST BE REJECTED
      const secondAttempt = await store.redeemDeliveryToken(targetToken);

      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.error).toBe('ALREADY_REDEEMED');
      expect(secondAttempt.message).toContain('already been acknowledged');

      // Check batch acknowledged count did not double-increment
      const batchesAfterRejection = store.getDistributionBatches(testBatch.project_id);
      const afterRejection = batchesAfterRejection.find((b) => b.id === testBatch.id);
      expect(afterRejection?.acknowledged_count).toBe(1);
    });
  });

  // =========================================================================
  // 3. ASK FUNDTRAIL MULTILINGUAL VOICE ASSISTANT
  // =========================================================================
  describe('3. Ask FundTrail Voice Assistant Verification vs Live Report Values', () => {
    // Exact seed project numbers
    const totalDonations = 100000;
    const totalSpent = 65000;
    const remainingBalance = 35000;

    const mockProject: Project = {
      id: 'proj-school-kit',
      organization_id: 'org-demo',
      title: 'School Kit Support',
      purpose: 'School kit distribution to underprivileged students',
      goal_amount: 100000,
      currency: 'INR',
      start_date: '2026-10-01',
      public_slug: 'school-kit-support-2026-v1',
      status: 'ACTIVE',
      created_at: '2026-10-01T00:00:00Z'
    };

    const mockDonations: Donation[] = [
      {
        id: 'don-1',
        organization_id: 'org-demo',
        project_id: 'proj-school-kit',
        amount_received: 40000,
        received_at: '2026-10-01',
        channel: 'UPI',
        created_at: '2026-10-01T00:00:00Z'
      },
      {
        id: 'don-2',
        organization_id: 'org-demo',
        project_id: 'proj-school-kit',
        amount_received: 35000,
        received_at: '2026-10-02',
        channel: 'Bank transfer',
        created_at: '2026-10-02T00:00:00Z'
      },
      {
        id: 'don-3',
        organization_id: 'org-demo',
        project_id: 'proj-school-kit',
        amount_received: 25000,
        received_at: '2026-10-03',
        channel: 'Crowdfunding',
        created_at: '2026-10-03T00:00:00Z'
      }
    ];

    const mockExpenses: Expense[] = [
      {
        id: 'exp-1',
        organization_id: 'org-demo',
        project_id: 'proj-school-kit',
        amount: 40000,
        spent_at: '2026-10-12',
        category: 'Educational materials',
        description: '60 school bags, notebooks & stationery sets',
        vendor_label: 'Jaipur Stationery Mart',
        evidence_status: 'REVIEWED',
        created_at: '2026-10-12T00:00:00Z'
      },
      {
        id: 'exp-2',
        organization_id: 'org-demo',
        project_id: 'proj-school-kit',
        amount: 15000,
        spent_at: '2026-10-15',
        category: 'Logistics',
        description: 'Van hire for distribution across 3 schools',
        vendor_label: 'Marwar Logistics',
        evidence_status: 'REVIEWED',
        created_at: '2026-10-15T00:00:00Z'
      },
      {
        id: 'exp-3',
        organization_id: 'org-demo',
        project_id: 'proj-school-kit',
        amount: 10000,
        spent_at: '2026-10-18',
        category: 'Refreshments & on-site',
        description: 'Snacks & water for volunteers and student beneficiaries',
        vendor_label: 'Annapurna Caterers',
        evidence_status: 'EVIDENCE_UPLOADED',
        created_at: '2026-10-18T00:00:00Z'
      }
    ];

    const mockMilestones: ProjectMilestone[] = [
      {
        id: 'm-1',
        organization_id: 'org-demo',
        project_id: 'proj-school-kit',
        milestone_index: 0,
        title: 'Procurement of 60 School Kits',
        allocated_pol: 40,
        released_pol: 40,
        status: 'RELEASED',
        created_at: '2026-10-01T00:00:00Z'
      }
    ];

    const mockBatches: DistributionBatch[] = [
      {
        id: 'batch-1',
        organization_id: 'org-demo',
        project_id: 'proj-school-kit',
        batch_number: 'BATCH-01',
        batch_name: 'School Kit Distribution Drive',
        distribution_date: '2026-10-25',
        location_or_institution: 'Govt School Sanganer',
        item_description: 'School Kit (Bag + Stationery)',
        expected_quantity: 60,
        acknowledged_count: 52,
        status: 'IN_PROGRESS',
        created_at: '2026-10-20T00:00:00Z',
        updated_at: '2026-10-20T00:00:00Z'
      }
    ];

    const assistantCtx: AssistantContext = {
      project: mockProject,
      donations: mockDonations,
      expenses: mockExpenses,
      milestones: mockMilestones,
      batches: mockBatches,
      anchorTxHash: '0x8e82ae53cba3c48347a6f54720903518f7076cceffe24bd458961552a1502a3b'
    };

    it('English Query: "How much money was received?" matches report total (₹1,00,000)', () => {
      const res = resolveProjectQuestion('How much money was received for this project?', 'en', assistantCtx);
      expect(res.text).toContain('₹1,00,000');
      expect(res.text).toContain('3 verified contribution');
      expect(res.referenceLink?.targetId).toBe('financial-overview');
    });

    it('English Query: "How much has been spent?" matches report total (₹65,000)', () => {
      const res = resolveProjectQuestion('How much has been spent so far?', 'en', assistantCtx);
      expect(res.text).toContain('₹65,000');
      expect(res.text).toContain('3 expense items');
      expect(res.referenceLink?.targetId).toBe('expense-breakdown');
    });

    it('English Query: "What is the remaining balance?" matches report balance (₹35,000)', () => {
      const res = resolveProjectQuestion('What is the remaining balance in reserve?', 'en', assistantCtx);
      expect(res.text).toContain('₹35,000');
      expect(res.referenceLink?.targetId).toBe('financial-overview');
    });

    it('Hindi Query: "Kitna paisa bacha hai?" matches report balance (₹35,000)', () => {
      const res = resolveProjectQuestion('Kitna paisa bacha hai?', 'hi', assistantCtx);
      expect(res.text).toContain('₹35,000');
      expect(res.text).toContain('शेष');
      expect(res.referenceLink?.targetId).toBe('financial-overview');
    });

    it('Hindi Query: "Kharche kitne hue?" matches report total expenses (₹65,000)', () => {
      const res = resolveProjectQuestion('Is project me kharche kitne hue?', 'hi', assistantCtx);
      expect(res.text).toContain('₹65,000');
      expect(res.text).toContain('खर्च');
      expect(res.referenceLink?.targetId).toBe('expense-breakdown');
    });

    it('Hindi Query: "Kitne kits distribute hue?" matches Proof of Delivery count (52 out of 60)', () => {
      const res = resolveProjectQuestion('School kit kitne distribute hue?', 'hi', assistantCtx);
      expect(res.text).toContain('52');
      expect(res.text).toContain('60');
      expect(res.referenceLink?.targetId).toBe('proof-of-delivery');
    });

    it('Zero-Hallucination Guardrail: Unrelated query triggers explicit fallback', () => {
      const res = resolveProjectQuestion('Who won the cricket match yesterday?', 'en', assistantCtx);
      expect(res.text).toContain('Sorry, this information is not explicitly documented');
    });
  });
});
