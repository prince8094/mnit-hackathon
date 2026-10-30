import {
  Organization,
  Project,
  Donation,
  Expense,
  EvidenceFile,
  ProjectUpdate,
  ReportSnapshot,
  ReportAnchorRecord,
  Role
} from '../types';
import { generateSanitisedSnapshot, computeReportHash } from './report-snapshot';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string;
}

const STORAGE_KEY = 'fundtrail_state_v1';

// Initial synthetic seed data from Section 15 of README_FundTrail.md
const INITIAL_ORG: Organization = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Seva Jyoti Foundation (Demo Org)',
  created_at: '2026-09-15T10:00:00Z'
};

const INITIAL_PROJECT: Project = {
  id: '11111111-1111-1111-1111-111111111111',
  organization_id: INITIAL_ORG.id,
  title: 'School Kit Support',
  purpose: 'Provide educational kits to underprivileged students across Rajasthan rural schools',
  goal_amount: 100000,
  currency: 'INR',
  start_date: '2026-10-01',
  end_date: '2026-10-31',
  public_slug: 'school-kit-support-2026',
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00Z'
};

const INITIAL_DONATIONS: Donation[] = [
  {
    id: 'd1111111-0000-0000-0000-000000000001',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    amount_received: 40000,
    received_at: '2026-10-01',
    channel: 'UPI',
    source_reference: 'DEMO-UPI-001',
    private_donor_label: 'Donor Batch Alpha (Redacted)',
    created_at: '2026-10-01T11:30:00Z'
  },
  {
    id: 'd1111111-0000-0000-0000-000000000002',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    amount_received: 35000,
    received_at: '2026-10-03',
    channel: 'Bank transfer',
    source_reference: 'DEMO-BANK-002',
    private_donor_label: 'Corporate Match (Redacted)',
    created_at: '2026-10-03T14:15:00Z'
  },
  {
    id: 'd1111111-0000-0000-0000-000000000003',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    amount_received: 25000,
    received_at: '2026-10-05',
    channel: 'Crowdfunding',
    source_reference: 'DEMO-CF-003',
    private_donor_label: 'Online Campaign Supporters',
    created_at: '2026-10-05T16:45:00Z'
  }
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    amount: 40000,
    spent_at: '2026-10-12',
    category: 'Educational materials',
    description: '60x School Bags, notebooks, stationery sets, geometry kits',
    vendor_label: 'Jaipur School Supplies Pvt Ltd',
    payment_reference: 'TXN-EDU-9901',
    created_at: '2026-10-12T10:00:00Z'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    amount: 15000,
    spent_at: '2026-10-18',
    category: 'Distribution and logistics',
    description: 'Van transport & driver charges for rural school distribution points',
    vendor_label: 'Marwar Logistics',
    payment_reference: 'TXN-LOG-8821',
    created_at: '2026-10-18T15:30:00Z'
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    amount: 10000,
    spent_at: '2026-10-22',
    category: 'Other project expenses',
    description: 'Volunteer refreshments, waterproof kit covers, printing distribution logs',
    vendor_label: 'Various Local Vendors',
    payment_reference: 'TXN-MISC-7742',
    created_at: '2026-10-22T17:00:00Z'
  }
];

const INITIAL_EVIDENCE: EvidenceFile[] = [
  {
    id: 'e3333333-0000-0000-0000-000000000001',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    expense_id: INITIAL_EXPENSES[0].id,
    private_storage_path: 'evidence-private/jaipur_stationery_invoice.pdf',
    sha256: '0xa71b3e9f4c8d2a1b5e6f7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    file_name_safe: 'jaipur_stationery_invoice.pdf',
    file_size_bytes: 342150,
    mime_type: 'application/pdf',
    evidence_type: 'INVOICE',
    visibility: 'PRIVATE',
    review_status: 'DOCUMENT_UPLOADED',
    created_at: '2026-10-12T11:00:00Z'
  },
  {
    id: 'e3333333-0000-0000-0000-000000000002',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    expense_id: INITIAL_EXPENSES[1].id,
    private_storage_path: 'evidence-private/marwar_transport_receipt.pdf',
    sha256: '0xb82c4f0a5d9e3b2c6f7a8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90',
    file_name_safe: 'marwar_transport_receipt.pdf',
    file_size_bytes: 184500,
    mime_type: 'application/pdf',
    evidence_type: 'RECEIPT',
    visibility: 'PRIVATE',
    review_status: 'DOCUMENT_UPLOADED',
    created_at: '2026-10-18T16:00:00Z'
  },
  {
    id: 'e3333333-0000-0000-0000-000000000003',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    expense_id: INITIAL_EXPENSES[2].id,
    private_storage_path: 'evidence-private/refreshments_voucher.pdf',
    sha256: '0xc93d5a1b6e0f4c3d7a8b9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9012',
    file_name_safe: 'refreshments_voucher.pdf',
    file_size_bytes: 215400,
    mime_type: 'application/pdf',
    evidence_type: 'BILL',
    visibility: 'PRIVATE',
    review_status: 'DOCUMENT_UPLOADED',
    created_at: '2026-10-22T17:30:00Z'
  }
];

const INITIAL_UPDATES: ProjectUpdate[] = [
  {
    id: 'u4444444-0000-0000-0000-000000000001',
    organization_id: INITIAL_ORG.id,
    project_id: INITIAL_PROJECT.id,
    update_date: '2026-10-25',
    summary: 'Distribution activity completed: 60 educational kits distributed to students across 2 village primary schools in Sanganer block.',
    beneficiary_count: 60,
    status: 'NGO_REPORTED',
    created_at: '2026-10-25T18:00:00Z'
  }
];

interface AppState {
  organizations: Organization[];
  projects: Project[];
  donations: Donation[];
  expenses: Expense[];
  evidenceFiles: EvidenceFile[];
  updates: ProjectUpdate[];
  snapshots: ReportSnapshot[];
  anchors: ReportAnchorRecord[];
  currentUser: UserSession | null;
}

class Store {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): AppState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load local storage state:', e);
    }

    // Default seeded state
    return {
      organizations: [INITIAL_ORG],
      projects: [INITIAL_PROJECT],
      donations: INITIAL_DONATIONS,
      expenses: INITIAL_EXPENSES,
      evidenceFiles: INITIAL_EVIDENCE,
      updates: INITIAL_UPDATES,
      snapshots: [],
      anchors: [],
      currentUser: {
        id: 'u-admin-1',
        email: 'priya.sharma@sevajyoti.org',
        fullName: 'Priya Sharma',
        role: 'ADMIN',
        organizationId: INITIAL_ORG.id
      }
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  // --- Auth & Session ---
  public getCurrentUser(): UserSession | null {
    return this.state.currentUser;
  }

  public loginAs(role: Role): void {
    if (role === 'ADMIN') {
      this.state.currentUser = {
        id: 'u-admin-1',
        email: 'priya.sharma@sevajyoti.org',
        fullName: 'Priya Sharma',
        role: 'ADMIN',
        organizationId: INITIAL_ORG.id
      };
    } else {
      this.state.currentUser = {
        id: 'u-staff-2',
        email: 'amit.verma@sevajyoti.org',
        fullName: 'Amit Verma',
        role: 'STAFF',
        organizationId: INITIAL_ORG.id
      };
    }
    this.saveState();
  }

  public logout(): void {
    this.state.currentUser = null;
    this.saveState();
  }

  // --- Projects ---
  public getProjects(orgId?: string): Project[] {
    const targetOrg = orgId || this.state.currentUser?.organizationId;
    if (!targetOrg) return [];
    return this.state.projects.filter(p => p.organization_id === targetOrg);
  }

  public getProjectById(projectId: string): Project | undefined {
    return this.state.projects.find(p => p.id === projectId);
  }

  public getProjectBySlug(slug: string): Project | undefined {
    return this.state.projects.find(p => p.public_slug === slug);
  }

  public addProject(data: Omit<Project, 'id' | 'created_at'>): Project {
    const project: Project = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.projects.push(project);
    this.saveState();
    return project;
  }

  // --- Donations ---
  public getDonations(projectId: string): Donation[] {
    return this.state.donations
      .filter(d => d.project_id === projectId)
      .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  }

  public addDonation(donation: Omit<Donation, 'id' | 'created_at'>): Donation {
    const newDonation: Donation = {
      ...donation,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.donations.push(newDonation);
    this.saveState();
    return newDonation;
  }

  public addDonationsBulk(donations: Omit<Donation, 'id' | 'created_at'>[]): number {
    const created = donations.map(d => ({
      ...d,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    }));
    this.state.donations.push(...created);
    this.saveState();
    return created.length;
  }

  // --- Expenses ---
  public getExpenses(projectId: string): Expense[] {
    return this.state.expenses
      .filter(e => e.project_id === projectId)
      .sort((a, b) => new Date(b.spent_at).getTime() - new Date(a.spent_at).getTime());
  }

  public addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.expenses.push(newExpense);
    this.saveState();
    return newExpense;
  }

  // --- Evidence Files ---
  public getEvidenceFiles(projectId: string): EvidenceFile[] {
    return this.state.evidenceFiles.filter(e => e.project_id === projectId);
  }

  public addEvidenceFile(evidence: Omit<EvidenceFile, 'id' | 'created_at'>): EvidenceFile {
    const newEvidence: EvidenceFile = {
      ...evidence,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.evidenceFiles.push(newEvidence);
    this.saveState();
    return newEvidence;
  }

  // --- Updates ---
  public getUpdates(projectId: string): ProjectUpdate[] {
    return this.state.updates
      .filter(u => u.project_id === projectId)
      .sort((a, b) => new Date(b.update_date).getTime() - new Date(a.update_date).getTime());
  }

  public addUpdate(update: Omit<ProjectUpdate, 'id' | 'created_at'>): ProjectUpdate {
    const newUpdate: ProjectUpdate = {
      ...update,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.updates.push(newUpdate);
    this.saveState();
    return newUpdate;
  }

  // --- Snapshots ---
  public getSnapshots(projectId: string): ReportSnapshot[] {
    return this.state.snapshots
      .filter(s => s.project_id === projectId)
      .sort((a, b) => b.version - a.version);
  }

  public getSnapshotBySlug(slug: string): ReportSnapshot | undefined {
    return this.state.snapshots.find(s => s.public_slug === slug);
  }

  public async publishSnapshot(projectId: string): Promise<ReportSnapshot> {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const existingSnapshots = this.getSnapshots(projectId);
    const nextVersion = existingSnapshots.length > 0 
      ? Math.max(...existingSnapshots.map(s => s.version)) + 1 
      : 1;

    const donations = this.getDonations(projectId);
    const expenses = this.getExpenses(projectId);
    const evidence = this.getEvidenceFiles(projectId);
    const updates = this.getUpdates(projectId);

    const snapshotData = generateSanitisedSnapshot(
      project,
      nextVersion,
      donations,
      expenses,
      evidence,
      updates
    );

    const { reportHash } = await computeReportHash(snapshotData);
    const slug = `${project.public_slug}-v${nextVersion}`;

    const newSnapshot: ReportSnapshot = {
      id: crypto.randomUUID(),
      organization_id: project.organization_id,
      project_id: projectId,
      version: nextVersion,
      public_slug: slug,
      snapshot_json: snapshotData,
      report_hash: reportHash,
      published_at: snapshotData.publishedAt,
      published_by: this.state.currentUser?.id,
      created_at: new Date().toISOString()
    };

    this.state.snapshots.push(newSnapshot);
    this.saveState();
    return newSnapshot;
  }

  // --- Anchors ---
  public getAnchorForSnapshot(snapshotId: string): ReportAnchorRecord | undefined {
    return this.state.anchors.find(a => a.report_snapshot_id === snapshotId);
  }

  public recordAnchor(anchor: Omit<ReportAnchorRecord, 'id' | 'created_at'>): ReportAnchorRecord {
    const record: ReportAnchorRecord = {
      ...anchor,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    // replace any existing anchor for this snapshot
    this.state.anchors = this.state.anchors.filter(
      a => a.report_snapshot_id !== anchor.report_snapshot_id
    );
    this.state.anchors.push(record);
    this.saveState();
    return record;
  }

  // --- Demo Verification Helper: Tamper Simulator for Test T13 ---
  public simulateTamperSnapshot(snapshotId: string): void {
    const snapshot = this.state.snapshots.find(s => s.id === snapshotId);
    if (snapshot) {
      // Modify financials or project purpose in snapshot JSON to trigger mismatch
      snapshot.snapshot_json.financials.totalReceived = "999999.00";
      snapshot.snapshot_json.project.title += " (MODIFIED POST-PUBLISH)";
      this.saveState();
    }
  }

  // --- Reset to Initial Seed Data ---
  public resetToSeed(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.loadState();
    this.notify();
  }
}

export const store = new Store();

