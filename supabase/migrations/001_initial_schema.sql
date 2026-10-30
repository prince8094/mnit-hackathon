-- FundTrail Database Schema Migration
-- Designed for Supabase PostgreSQL with Row Level Security (RLS)

-- 1. Create helper extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Organization Memberships
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, user_id)
);

-- Helper function: check if currently authenticated user belongs to an organization
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
    );
$$;

-- Helper function: check if user is organization ADMIN
CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
          AND role = 'ADMIN'
    );
$$;

-- 4. Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    purpose TEXT NOT NULL,
    goal_amount NUMERIC(14,2) NOT NULL CHECK (goal_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    start_date DATE NOT NULL,
    end_date DATE,
    public_slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Donations
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    amount_received NUMERIC(14,2) NOT NULL CHECK (amount_received > 0),
    received_at DATE NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('UPI', 'Bank transfer', 'Crowdfunding', 'Cash', 'Cheque', 'Other')),
    source_reference TEXT,
    private_donor_label TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for duplicate source_reference checks within a project
CREATE INDEX IF NOT EXISTS idx_donations_project_ref ON public.donations (project_id, source_reference);

-- 6. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    spent_at DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    vendor_label TEXT,
    payment_reference TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Evidence Files
CREATE TABLE IF NOT EXISTS public.evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    private_storage_path TEXT NOT NULL,
    public_storage_path TEXT,
    sha256 TEXT NOT NULL,
    file_name_safe TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    evidence_type TEXT NOT NULL DEFAULT 'INVOICE' CHECK (evidence_type IN ('INVOICE', 'RECEIPT', 'BILL', 'VOUCHER', 'OTHER')),
    visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'PUBLIC_REDACTED')),
    review_status TEXT NOT NULL DEFAULT 'DOCUMENT_UPLOADED' CHECK (review_status IN ('NGO_REPORTED', 'DOCUMENT_UPLOADED', 'NGO_REVIEWED', 'INDEPENDENTLY_VERIFIED')),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Project Updates
CREATE TABLE IF NOT EXISTS public.project_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    update_date DATE NOT NULL,
    summary TEXT NOT NULL,
    beneficiary_count INTEGER CHECK (beneficiary_count IS NULL OR beneficiary_count >= 0),
    status TEXT NOT NULL DEFAULT 'NGO_REPORTED' CHECK (status IN ('NGO_REPORTED', 'DOCUMENT_UPLOADED', 'NGO_REVIEWED', 'INDEPENDENTLY_VERIFIED')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Report Snapshots
CREATE TABLE IF NOT EXISTS public.report_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    public_slug TEXT NOT NULL,
    snapshot_json JSONB NOT NULL,
    report_hash TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, version),
    UNIQUE (public_slug)
);

-- 10. Report Anchors
CREATE TABLE IF NOT EXISTS public.report_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_snapshot_id UUID NOT NULL REFERENCES public.report_snapshots(id) ON DELETE CASCADE,
    chain_id INTEGER NOT NULL DEFAULT 80002,
    contract_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    publisher_wallet TEXT NOT NULL,
    anchor_status TEXT NOT NULL CHECK (anchor_status IN ('PENDING', 'MINED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =======================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_anchors ENABLE ROW LEVEL SECURITY;

-- Organizations Policies
CREATE POLICY "Members can view their own organizations"
    ON public.organizations FOR SELECT
    USING (public.is_org_member(id));

CREATE POLICY "Authenticated users can create an organization"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their organization"
    ON public.organizations FOR UPDATE
    USING (public.is_org_admin(id));

-- Organization Members Policies
CREATE POLICY "Members can view org members"
    ON public.organization_members FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can add/modify members"
    ON public.organization_members FOR ALL
    USING (public.is_org_admin(organization_id));

-- Projects Policies
CREATE POLICY "Members can view projects"
    ON public.projects FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update projects"
    ON public.projects FOR UPDATE
    USING (public.is_org_member(organization_id));

-- Donations Policies
CREATE POLICY "Members can view donations"
    ON public.donations FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can insert donations"
    ON public.donations FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update donations"
    ON public.donations FOR UPDATE
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can delete donations"
    ON public.donations FOR DELETE
    USING (public.is_org_member(organization_id));

-- Expenses Policies
CREATE POLICY "Members can view expenses"
    ON public.expenses FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can insert expenses"
    ON public.expenses FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update expenses"
    ON public.expenses FOR UPDATE
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can delete expenses"
    ON public.expenses FOR DELETE
    USING (public.is_org_member(organization_id));

-- Evidence Files Policies
CREATE POLICY "Members can view evidence files"
    ON public.evidence_files FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can insert evidence files"
    ON public.evidence_files FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update evidence files"
    ON public.evidence_files FOR UPDATE
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can delete evidence files"
    ON public.evidence_files FOR DELETE
    USING (public.is_org_member(organization_id));

-- Project Updates Policies
CREATE POLICY "Members can view project updates"
    ON public.project_updates FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can insert project updates"
    ON public.project_updates FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update project updates"
    ON public.project_updates FOR UPDATE
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can delete project updates"
    ON public.project_updates FOR DELETE
    USING (public.is_org_member(organization_id));

-- Report Snapshots Policies
-- Members can view snapshots
CREATE POLICY "Members can view all report snapshots"
    ON public.report_snapshots FOR SELECT
    USING (public.is_org_member(organization_id));

-- Anyone (public/unauthenticated) can view published snapshots by public_slug
CREATE POLICY "Public can view published report snapshots"
    ON public.report_snapshots FOR SELECT
    USING (true);

-- Snapshots are immutable once inserted
CREATE POLICY "Members can insert report snapshots"
    ON public.report_snapshots FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- Report Anchors Policies
-- Anyone can read safe anchor metadata
CREATE POLICY "Public can view report anchors"
    ON public.report_anchors FOR SELECT
    USING (true);

CREATE POLICY "Members can insert report anchors"
    ON public.report_anchors FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.report_snapshots s
            WHERE s.id = report_snapshot_id
              AND public.is_org_member(s.organization_id)
        )
    );

-- Storage bucket creation instruction
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-private', 'evidence-private', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-public', 'evidence-public', true)
ON CONFLICT (id) DO NOTHING;

