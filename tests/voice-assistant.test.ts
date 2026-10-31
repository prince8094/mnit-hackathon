import { describe, it, expect } from 'vitest';
import { resolveProjectQuestion, AssistantContext } from '../src/lib/voice-assistant';
import { Project, Expense, Donation, ProjectMilestone, DistributionBatch } from '../src/types';

describe('Feature 3: Ask FundTrail Multilingual Voice Assistant', () => {
  const mockProject: Project = {
    id: 'proj-demo-1',
    organization_id: 'org-demo-1',
    title: 'School Kit Support',
    purpose: 'Education for children',
    goal_amount: 100000,
    currency: 'INR',
    start_date: '2026-10-01',
    public_slug: 'school-kit-support-2026',
    status: 'ACTIVE',
    created_at: '2026-10-01T00:00:00Z'
  };

  const mockDonations: Donation[] = [
    {
      id: 'd-1',
      organization_id: 'org-demo-1',
      project_id: 'proj-demo-1',
      amount_received: 40000,
      received_at: '2026-10-01',
      channel: 'UPI',
      created_at: '2026-10-01T00:00:00Z'
    },
    {
      id: 'd-2',
      organization_id: 'org-demo-1',
      project_id: 'proj-demo-1',
      amount_received: 60000,
      received_at: '2026-10-02',
      channel: 'Bank transfer',
      created_at: '2026-10-02T00:00:00Z'
    }
  ];

  const mockExpenses: Expense[] = [
    {
      id: 'e-1',
      organization_id: 'org-demo-1',
      project_id: 'proj-demo-1',
      amount: 40000,
      spent_at: '2026-10-12',
      category: 'Educational materials',
      description: '60x School Bags & Books',
      vendor_label: 'Jaipur Supplies',
      evidence_status: 'REVIEWED',
      created_at: '2026-10-12T00:00:00Z'
    },
    {
      id: 'e-2',
      organization_id: 'org-demo-1',
      project_id: 'proj-demo-1',
      amount: 15000,
      spent_at: '2026-10-18',
      category: 'Logistics',
      description: 'Van Transport',
      vendor_label: 'Marwar Logistics',
      evidence_status: 'FLAGGED',
      created_at: '2026-10-18T00:00:00Z'
    }
  ];

  const mockMilestones: ProjectMilestone[] = [
    {
      id: 'm-1',
      organization_id: 'org-demo-1',
      project_id: 'proj-demo-1',
      milestone_index: 0,
      title: 'Material Purchase',
      allocated_pol: 40,
      released_pol: 40,
      status: 'RELEASED',
      created_at: '2026-10-01T00:00:00Z'
    }
  ];

  const mockBatches: DistributionBatch[] = [
    {
      id: 'b-1',
      organization_id: 'org-demo-1',
      project_id: 'proj-demo-1',
      batch_number: 'BATCH-01',
      batch_name: 'School Distribution',
      distribution_date: '2026-10-25',
      location_or_institution: 'Sanganer School',
      item_description: 'School Kit',
      expected_quantity: 60,
      acknowledged_count: 52,
      status: 'IN_PROGRESS',
      created_at: '2026-10-20T00:00:00Z',
      updated_at: '2026-10-20T00:00:00Z'
    }
  ];

  const context: AssistantContext = {
    project: mockProject,
    donations: mockDonations,
    expenses: mockExpenses,
    milestones: mockMilestones,
    batches: mockBatches,
    anchorTxHash: '0x8e82ae53cba3c48347a6f54720903518f7076cceffe24bd458961552a1502a3b'
  };

  it('answers "How much money was received?" in English with exact verified figures', () => {
    const res = resolveProjectQuestion('How much money was received for this project?', 'en', context);
    expect(res.text).toContain('₹1,00,000');
    expect(res.text).toContain('2 verified contribution');
    expect(res.referenceLink?.targetId).toBe('financial-overview');
  });

  it('answers "Is project mein kitna paisa receive hua?" in Hindi with exact figures', () => {
    const res = resolveProjectQuestion('Is project mein kitna paisa receive hua?', 'hi', context);
    expect(res.text).toContain('₹1,00,000');
    expect(res.text).toContain('प्राप्त');
    expect(res.referenceLink?.targetId).toBe('financial-overview');
  });

  it('answers "How much has been spent?" accurately in English and Hindi', () => {
    const resEn = resolveProjectQuestion('How much money has been spent so far?', 'en', context);
    expect(resEn.text).toContain('₹55,000');
    expect(resEn.referenceLink?.targetId).toBe('expense-breakdown');

    const resHi = resolveProjectQuestion('Abhi tak kitna kharch hua hai?', 'hi', context);
    expect(resHi.text).toContain('₹55,000');
    expect(resHi.text).toContain('खर्च');
  });

  it('answers questions about remaining balance correctly', () => {
    const res = resolveProjectQuestion('What is the remaining balance?', 'en', context);
    // 100,000 - 55,000 = 45,000
    expect(res.text).toContain('₹45,000');
  });

  it('answers Proof of Delivery and beneficiary questions correctly in English & Hindi', () => {
    const resEn = resolveProjectQuestion('How many beneficiaries received items?', 'en', context);
    expect(resEn.text).toContain('52 out of 60');
    expect(resEn.text).toContain('87%');
    expect(resEn.referenceLink?.targetId).toBe('proof-of-delivery');

    const resHi = resolveProjectQuestion('Kitne beneficiaries ne acknowledgement diya?', 'hi', context);
    expect(resHi.text).toContain('52');
    expect(resHi.text).toContain('60');
    expect(resHi.referenceLink?.targetId).toBe('proof-of-delivery');
  });

  it('answers blockchain anchoring questions with Polygon Amoy reference', () => {
    const res = resolveProjectQuestion('Is this report anchored on Polygon Amoy blockchain?', 'en', context);
    expect(res.text).toContain('Polygon Amoy');
    expect(res.text).toContain('80002');
    expect(res.referenceLink?.targetId).toBe('blockchain-verification');
  });

  it('provides a graceful, zero-hallucination fallback for out-of-scope questions', () => {
    const res = resolveProjectQuestion('What is the weather in Jaipur today?', 'en', context);
    expect(res.text).toContain('Sorry, this information is not explicitly documented');
  });
});
