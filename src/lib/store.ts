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
import { supabase, isSupabaseConfigured, signOutFromSupabase } from './supabase';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string;
  organizationName?: string;
}

const STORAGE_KEY = 'fundtrail_state_v1';

// Initial synthetic seed data from Section 15 of README_FundTrail.md
const INITIAL_ORG_A: Organization = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Seva Jyoti Foundation (NGO A)',
  created_at: '2026-09-15T10:00:00Z'
};

const INITIAL_ORG_B: Organization = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'Aarogya Seva Trust (NGO B)',
  created_at: '2026-10-01T10:00:00Z'
};

const INITIAL_PROJECT_A: Project = {
  id: '11111111-1111-1111-1111-111111111111',
  organization_id: INITIAL_ORG_A.id,
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
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
    amount_received: 40000,
    received_at: '2026-10-01',
    channel: 'UPI',
    source_reference: 'DEMO-UPI-001',
    private_donor_label: 'Donor Batch Alpha (Redacted)',
    created_at: '2026-10-01T11:30:00Z'
  },
  {
    id: 'd1111111-0000-0000-0000-000000000002',
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
    amount_received: 35000,
    received_at: '2026-10-03',
    channel: 'Bank transfer',
    source_reference: 'DEMO-BANK-002',
    private_donor_label: 'Corporate Match (Redacted)',
    created_at: '2026-10-03T14:15:00Z'
  },
  {
    id: 'd1111111-0000-0000-0000-000000000003',
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
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
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
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
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
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
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
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
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
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
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
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
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
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
    organization_id: INITIAL_ORG_A.id,
    project_id: INITIAL_PROJECT_A.id,
    update_date: '2026-10-25',
    summary: 'Distribution activity completed: 60 educational kits distributed to students across 2 village primary schools in Sanganer block.',
    beneficiary_count: 60,
    status: 'NGO_REPORTED',
    created_at: '2026-10-25T18:00:00Z'
  }
];

interface RegisteredUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  organizationId: string;
  role: Role;
}

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
  users: RegisteredUser[];
}

class Store {
  private state: AppState;
  private listeners: Set<() => void> = new Set();
  private isSupabaseSyncing = false;

  constructor() {
    this.state = this.loadState();
    this.initSupabaseSync();
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

    return {
      organizations: [INITIAL_ORG_A, INITIAL_ORG_B],
      projects: [INITIAL_PROJECT_A],
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
        organizationId: INITIAL_ORG_A.id,
        organizationName: INITIAL_ORG_A.name
      },
      users: [
        {
          id: 'u-admin-1',
          email: 'priya.sharma@sevajyoti.org',
          passwordHash: 'demo-password',
          fullName: 'Priya Sharma',
          organizationId: INITIAL_ORG_A.id,
          role: 'ADMIN'
        },
        {
          id: 'u-staff-2',
          email: 'amit.verma@sevajyoti.org',
          passwordHash: 'demo-password',
          fullName: 'Amit Verma',
          organizationId: INITIAL_ORG_A.id,
          role: 'STAFF'
        },
        {
          id: 'u-admin-ngo-b',
          email: 'vikram.malhotra@aarogya.org',
          passwordHash: 'demo-password',
          fullName: 'Vikram Malhotra',
          organizationId: INITIAL_ORG_B.id,
          role: 'ADMIN'
        }
      ]
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

  // --- Live Supabase Synchronization ---
  private async initSupabaseSync() {
    if (!supabase) return;

    // Listen to Supabase Auth state changes (including Google OAuth callbacks)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const email = session.user.email || 'user@ngo.org';
        const fullName = session.user.user_metadata?.full_name || email.split('@')[0];
        
        // Find existing organization or generate one for this Google user
        let userOrg = this.state.organizations.find(o => o.created_by === session.user.id);
        if (!userOrg) {
          const orgName = `${fullName}'s NGO`;
          userOrg = {
            id: crypto.randomUUID(),
            name: orgName,
            created_by: session.user.id,
            created_at: new Date().toISOString()
          };
          this.state.organizations.push(userOrg);
          
          // Save to Supabase
          if (supabase) {
            try {
              await supabase.from('organizations').upsert([userOrg]);
            } catch (e) {
              console.warn('Failed to insert org into Supabase:', e);
            }
          }
        }

        this.state.currentUser = {
          id: session.user.id,
          email,
          fullName,
          role: 'ADMIN',
          organizationId: userOrg.id,
          organizationName: userOrg.name
        };
        this.saveState();
      }
    });

    // Initial sync from database tables
    await this.syncFromSupabase();
  }

  public async syncFromSupabase(): Promise<void> {
    if (!supabase || this.isSupabaseSyncing) return;
    this.isSupabaseSyncing = true;

    try {
      const [
        orgsRes,
        projectsRes,
        donationsRes,
        expensesRes,
        evidenceRes,
        updatesRes,
        snapshotsRes,
        anchorsRes
      ] = await Promise.all([
        supabase.from('organizations').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('donations').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('evidence_files').select('*'),
        supabase.from('project_updates').select('*'),
        supabase.from('report_snapshots').select('*'),
        supabase.from('report_anchors').select('*')
      ]);

      // If Supabase has data, merge it into active state
      if (orgsRes.data && orgsRes.data.length > 0) {
        this.state.organizations = orgsRes.data;
      }
      if (projectsRes.data && projectsRes.data.length > 0) {
        this.state.projects = projectsRes.data.map(p => ({
          ...p,
          goal_amount: Number(p.goal_amount)
        }));
      }
      if (donationsRes.data && donationsRes.data.length > 0) {
        this.state.donations = donationsRes.data.map(d => ({
          ...d,
          amount_received: Number(d.amount_received)
        }));
      }
      if (expensesRes.data && expensesRes.data.length > 0) {
        this.state.expenses = expensesRes.data.map(e => ({
          ...e,
          amount: Number(e.amount)
        }));
      }
      if (evidenceRes.data && evidenceRes.data.length > 0) {
        this.state.evidenceFiles = evidenceRes.data;
      }
      if (updatesRes.data && updatesRes.data.length > 0) {
        this.state.updates = updatesRes.data;
      }
      if (snapshotsRes.data && snapshotsRes.data.length > 0) {
        this.state.snapshots = snapshotsRes.data;
      }
      if (anchorsRes.data && anchorsRes.data.length > 0) {
        this.state.anchors = anchorsRes.data;
      }

      // If Supabase is currently empty, optionally seed the initial project
      if ((!projectsRes.data || projectsRes.data.length === 0) && isSupabaseConfigured) {
        await this.pushSeedToSupabase();
      }

      this.saveState();
    } catch (err) {
      console.warn('Supabase sync warning (using local fallback):', err);
    } finally {
      this.isSupabaseSyncing = false;
    }
  }

  // Push baseline seed dataset to Supabase so live database is populated
  public async pushSeedToSupabase(): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.from('organizations').upsert([INITIAL_ORG_A, INITIAL_ORG_B]);
      await supabase.from('projects').upsert([INITIAL_PROJECT_A]);
      await supabase.from('donations').upsert(INITIAL_DONATIONS);
      await supabase.from('expenses').upsert(INITIAL_EXPENSES);
      await supabase.from('evidence_files').upsert(INITIAL_EVIDENCE);
      await supabase.from('project_updates').upsert(INITIAL_UPDATES);
    } catch (err) {
      console.warn('Initial seed push notice:', err);
    }
  }

  // --- Auth & Session ---
  public getCurrentUser(): UserSession | null {
    return this.state.currentUser;
  }

  public getOrganization(orgId: string): Organization | undefined {
    return this.state.organizations.find(o => o.id === orgId);
  }

  public async login(email: string, password: string): Promise<UserSession> {
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });
        if (!error && data.user) {
          const user = data.user;
          const fullName = user.user_metadata?.full_name || email.split('@')[0];
          let org = this.state.organizations.find(o => o.created_by === user.id);
          if (!org) {
            org = this.state.organizations[0];
          }
          this.state.currentUser = {
            id: user.id,
            email: user.email || email,
            fullName,
            role: 'ADMIN',
            organizationId: org ? org.id : INITIAL_ORG_A.id,
            organizationName: org ? org.name : INITIAL_ORG_A.name
          };
          this.saveState();
          return this.state.currentUser;
        }
      } catch (e) {
        console.warn('Supabase auth attempt:', e);
      }
    }

    const user = this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.passwordHash !== password) {
      throw new Error('Invalid email or password. Please verify your credentials.');
    }
    const org = this.getOrganization(user.organizationId);
    this.state.currentUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: org?.name || 'NGO'
    };
    this.saveState();
    return this.state.currentUser;
  }

  public async signUp(fullName: string, email: string, password: string, orgName: string): Promise<UserSession> {
    if (this.state.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email address already exists.');
    }

    const orgId = crypto.randomUUID();
    const newOrg: Organization = {
      id: orgId,
      name: orgName.trim(),
      created_at: new Date().toISOString()
    };
    this.state.organizations.push(newOrg);

    const userId = crypto.randomUUID();
    const newUser: RegisteredUser = {
      id: userId,
      email: email.trim().toLowerCase(),
      passwordHash: password,
      fullName: fullName.trim(),
      organizationId: orgId,
      role: 'ADMIN'
    };
    this.state.users.push(newUser);

    this.state.currentUser = {
      id: userId,
      email: newUser.email,
      fullName: newUser.fullName,
      role: 'ADMIN',
      organizationId: orgId,
      organizationName: newOrg.name
    };

    // Save to Supabase if connected
    if (supabase) {
      try {
        await supabase.from('organizations').insert([newOrg]);
      } catch (e) {
        console.warn('Failed to insert org to Supabase:', e);
      }
    }

    this.saveState();
    return this.state.currentUser;
  }

  public loginAs(roleOrUser: 'ADMIN' | 'STAFF' | 'NGO_B'): void {
    if (roleOrUser === 'ADMIN') {
      this.state.currentUser = {
        id: 'u-admin-1',
        email: 'priya.sharma@sevajyoti.org',
        fullName: 'Priya Sharma',
        role: 'ADMIN',
        organizationId: INITIAL_ORG_A.id,
        organizationName: INITIAL_ORG_A.name
      };
    } else if (roleOrUser === 'STAFF') {
      this.state.currentUser = {
        id: 'u-staff-2',
        email: 'amit.verma@sevajyoti.org',
        fullName: 'Amit Verma',
        role: 'STAFF',
        organizationId: INITIAL_ORG_A.id,
        organizationName: INITIAL_ORG_A.name
      };
    } else {
      this.state.currentUser = {
        id: 'u-admin-ngo-b',
        email: 'vikram.malhotra@aarogya.org',
        fullName: 'Vikram Malhotra',
        role: 'ADMIN',
        organizationId: INITIAL_ORG_B.id,
        organizationName: INITIAL_ORG_B.name
      };
    }
    this.saveState();
  }

  public async logout(): Promise<void> {
    this.state.currentUser = null;
    await signOutFromSupabase();
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

  public async addProject(data: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
    const project: Project = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.projects.push(project);
    this.saveState();

    // Persist to Supabase
    if (supabase) {
      try {
        await supabase.from('projects').insert([project]);
      } catch (e) {
        console.error('Supabase project insert error:', e);
      }
    }

    return project;
  }

  public async editProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const idx = this.state.projects.findIndex(p => p.id === projectId);
    if (idx === -1) throw new Error('Project not found');
    this.state.projects[idx] = {
      ...this.state.projects[idx],
      ...updates
    };
    this.saveState();

    if (supabase) {
      try {
        await supabase.from('projects').update(updates).eq('id', projectId);
      } catch (e) {
        console.error('Supabase project update error:', e);
      }
    }

    return this.state.projects[idx];
  }

  public async archiveProject(projectId: string): Promise<void> {
    await this.editProject(projectId, { status: 'ARCHIVED' });
  }

  public async deleteProject(projectId: string): Promise<void> {
    this.state.projects = this.state.projects.filter(p => p.id !== projectId);
    this.saveState();
    if (supabase) {
      try {
        await supabase.from('projects').delete().eq('id', projectId);
      } catch (e) {
        console.error('Supabase project delete error:', e);
      }
    }
  }

  // --- Donations ---
  public getDonations(projectId: string): Donation[] {
    return this.state.donations
      .filter(d => d.project_id === projectId)
      .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  }

  public async addDonation(donation: Omit<Donation, 'id' | 'created_at'>): Promise<Donation> {
    const newDonation: Donation = {
      ...donation,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.donations.push(newDonation);
    this.saveState();

    if (supabase) {
      try {
        await supabase.from('donations').insert([newDonation]);
      } catch (e) {
        console.error('Supabase donation insert error:', e);
      }
    }

    return newDonation;
  }

  public async addDonationsBulk(donations: Omit<Donation, 'id' | 'created_at'>[]): Promise<number> {
    const created = donations.map(d => ({
      ...d,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    }));
    this.state.donations.push(...created);
    this.saveState();

    if (supabase) {
      try {
        await supabase.from('donations').insert(created);
      } catch (e) {
        console.error('Supabase bulk donation insert error:', e);
      }
    }

    return created.length;
  }

  // --- Expenses ---
  public getExpenses(projectId: string): Expense[] {
    return this.state.expenses
      .filter(e => e.project_id === projectId)
      .sort((a, b) => new Date(b.spent_at).getTime() - new Date(a.spent_at).getTime());
  }

  public async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.expenses.push(newExpense);
    this.saveState();

    if (supabase) {
      try {
        await supabase.from('expenses').insert([newExpense]);
      } catch (e) {
        console.error('Supabase expense insert error:', e);
      }
    }

    return newExpense;
  }

  // --- Evidence Files ---
  public getEvidenceFiles(projectId: string): EvidenceFile[] {
    return this.state.evidenceFiles.filter(e => e.project_id === projectId);
  }

  public async addEvidenceFile(
    evidence: Omit<EvidenceFile, 'id' | 'created_at'>,
    fileBlob?: File | null
  ): Promise<EvidenceFile> {
    const newEvidence: EvidenceFile = {
      ...evidence,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };

    // If Supabase Storage is configured and fileBlob is passed, upload to private bucket
    if (supabase && fileBlob) {
      try {
        const filePath = `${evidence.organization_id}/${evidence.project_id}/${newEvidence.id}_${fileBlob.name}`;
        const { error: uploadError } = await supabase.storage
          .from('evidence-private')
          .upload(filePath, fileBlob);

        if (!uploadError) {
          newEvidence.private_storage_path = filePath;
        }
      } catch (e) {
        console.warn('Storage bucket upload notice:', e);
      }
    }

    this.state.evidenceFiles.push(newEvidence);
    this.saveState();

    if (supabase) {
      try {
        await supabase.from('evidence_files').insert([newEvidence]);
      } catch (e) {
        console.error('Supabase evidence insert error:', e);
      }
    }

    return newEvidence;
  }

  // --- Updates ---
  public getUpdates(projectId: string): ProjectUpdate[] {
    return this.state.updates
      .filter(u => u.project_id === projectId)
      .sort((a, b) => new Date(b.update_date).getTime() - new Date(a.update_date).getTime());
  }

  public async addUpdate(update: Omit<ProjectUpdate, 'id' | 'created_at'>): Promise<ProjectUpdate> {
    const newUpdate: ProjectUpdate = {
      ...update,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.updates.push(newUpdate);
    this.saveState();

    if (supabase) {
      try {
        await supabase.from('project_updates').insert([newUpdate]);
      } catch (e) {
        console.error('Supabase update insert error:', e);
      }
    }

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

    if (supabase) {
      try {
        await supabase.from('report_snapshots').insert([newSnapshot]);
      } catch (e) {
        console.error('Supabase snapshot insert error:', e);
      }
    }

    return newSnapshot;
  }

  // --- Anchors ---
  public getAnchorForSnapshot(snapshotId: string): ReportAnchorRecord | undefined {
    return this.state.anchors.find(a => a.report_snapshot_id === snapshotId);
  }

  public async recordAnchor(anchor: Omit<ReportAnchorRecord, 'id' | 'created_at'>): Promise<ReportAnchorRecord> {
    const record: ReportAnchorRecord = {
      ...anchor,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.anchors = this.state.anchors.filter(
      a => a.report_snapshot_id !== anchor.report_snapshot_id
    );
    this.state.anchors.push(record);
    this.saveState();

    if (supabase) {
      try {
        await supabase.from('report_anchors').insert([record]);
      } catch (e) {
        console.error('Supabase anchor insert error:', e);
      }
    }

    return record;
  }

  // --- Demo Verification Helper: Tamper Simulator for Test T13 ---
  public simulateTamperSnapshot(snapshotId: string): void {
    const snapshot = this.state.snapshots.find(s => s.id === snapshotId);
    if (snapshot) {
      snapshot.snapshot_json.financials.totalReceived = "999999.00";
      snapshot.snapshot_json.project.title += " (MODIFIED POST-PUBLISH)";
      this.saveState();
    }
  }

  // --- Reset to Initial Seed Data ---
  public async resetToSeed(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.loadState();
    await this.pushSeedToSupabase();
    this.notify();
  }
}

export const store = new Store();
