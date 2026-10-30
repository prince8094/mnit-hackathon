-- Migration 003: Milestone Escrow & On-Chain Transparency Schema
-- FundTrail: Transparent Milestone-Based Accountability on Polygon Amoy

-- 1. Extend projects table with on-chain metadata
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_project_id TEXT,
ADD COLUMN IF NOT EXISTS onchain_escrow_address TEXT,
ADD COLUMN IF NOT EXISTS ngo_wallet TEXT,
ADD COLUMN IF NOT EXISTS verifier_wallet TEXT,
ADD COLUMN IF NOT EXISTS goal_amount_pol NUMERIC(18,6) DEFAULT 0;

-- 2. Project Milestones Table
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    milestone_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    allocated_pol NUMERIC(18,6) NOT NULL CHECK (allocated_pol > 0),
    released_pol NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (released_pol >= 0),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RELEASED')),
    ipfs_cid TEXT,
    evidence_hash TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    review_reason TEXT,
    release_tx_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, milestone_index)
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.project_milestones(project_id);

-- 3. On-chain Contributions Table
CREATE TABLE IF NOT EXISTS public.onchain_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    donor_wallet TEXT NOT NULL,
    amount_pol NUMERIC(18,6) NOT NULL CHECK (amount_pol > 0),
    tx_hash TEXT NOT NULL,
    contributed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onchain_contrib_project ON public.onchain_contributions(project_id);

-- 4. Milestone Verifications Table
CREATE TABLE IF NOT EXISTS public.milestone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    verifier_wallet TEXT NOT NULL,
    approved BOOLEAN NOT NULL,
    review_reason TEXT NOT NULL,
    tx_hash TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verifications_milestone ON public.milestone_verifications(milestone_id);

-- 5. Row Level Security (RLS)
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onchain_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_verifications ENABLE ROW LEVEL SECURITY;

-- Public can view milestones for transparency
CREATE POLICY "Public can view project milestones"
    ON public.project_milestones FOR SELECT
    USING (true);

-- Authenticated organization members can manage their milestones
CREATE POLICY "Members can insert/update project milestones"
    ON public.project_milestones FOR ALL
    USING (public.is_org_member(organization_id));

-- Public can view on-chain contributions
CREATE POLICY "Public can view onchain contributions"
    ON public.onchain_contributions FOR SELECT
    USING (true);

CREATE POLICY "Anyone can record onchain contributions"
    ON public.onchain_contributions FOR INSERT
    WITH CHECK (true);

-- Public can view milestone verifications
CREATE POLICY "Public can view milestone verifications"
    ON public.milestone_verifications FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert milestone verifications"
    ON public.milestone_verifications FOR INSERT
    WITH CHECK (true);

