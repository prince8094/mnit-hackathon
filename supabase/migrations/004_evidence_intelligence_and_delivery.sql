-- Migration 004: Evidence Intelligence Engine & Proof of Delivery Schema
-- FundTrail: Transparent Charity Donations & Milestone Fund Tracking

-- 1. Extend expenses table with invoice metadata and evidence intelligence status
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS evidence_status TEXT NOT NULL DEFAULT 'MISSING_EVIDENCE' 
    CHECK (evidence_status IN ('MISSING_EVIDENCE', 'EVIDENCE_UPLOADED', 'NEEDS_REVIEW', 'REVIEWED', 'FLAGGED')),
ADD COLUMN IF NOT EXISTS extracted_metadata JSONB;

-- 2. Evidence Intelligence Flags Table
CREATE TABLE IF NOT EXISTS public.evidence_intelligence_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('DUPLICATE_EVIDENCE', 'AMOUNT_MISMATCH', 'MISSING_EVIDENCE', 'BUDGET_OVERRUN', 'MISSING_METADATA')),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flags_project ON public.evidence_intelligence_flags(project_id);
CREATE INDEX IF NOT EXISTS idx_flags_expense ON public.evidence_intelligence_flags(expense_id);
CREATE INDEX IF NOT EXISTS idx_flags_org ON public.evidence_intelligence_flags(organization_id);

-- 3. Distribution Batches Table (Proof of Delivery)
CREATE TABLE IF NOT EXISTS public.distribution_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    batch_name TEXT NOT NULL,
    distribution_date DATE NOT NULL,
    location_or_institution TEXT NOT NULL,
    item_description TEXT NOT NULL,
    expected_quantity INTEGER NOT NULL CHECK (expected_quantity > 0),
    acknowledged_count INTEGER NOT NULL DEFAULT 0 CHECK (acknowledged_count >= 0),
    public_description TEXT,
    distribution_evidence_cid TEXT,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_dist_batches_project ON public.distribution_batches(project_id);
CREATE INDEX IF NOT EXISTS idx_dist_batches_org ON public.distribution_batches(organization_id);

-- 4. Delivery Tokens Table (Cryptographic Single-Use QR Acknowledgements)
-- NOTE: Never stores raw tokens. Tokens are stored as SHA-256 hashes.
-- ZERO beneficiary PII is collected or stored.
CREATE TABLE IF NOT EXISTS public.delivery_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.distribution_batches(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    recipient_index INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'REDEEMED', 'REVOKED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_tokens_hash ON public.delivery_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_delivery_tokens_batch ON public.delivery_tokens(batch_id);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.evidence_intelligence_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tokens ENABLE ROW LEVEL SECURITY;

-- Flags Policies
CREATE POLICY "Members can view their org flags"
    ON public.evidence_intelligence_flags FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can manage their org flags"
    ON public.evidence_intelligence_flags FOR ALL
    USING (public.is_org_member(organization_id));

-- Distribution Batches Policies
-- Public can view distribution batches for public transparency
CREATE POLICY "Public can view distribution batches"
    ON public.distribution_batches FOR SELECT
    USING (true);

-- Org members can insert/update their batches
CREATE POLICY "Members can manage their org distribution batches"
    ON public.distribution_batches FOR ALL
    USING (public.is_org_member(organization_id));

-- Delivery Tokens Policies
-- Org members can view and manage tokens
CREATE POLICY "Members can manage their org delivery tokens"
    ON public.delivery_tokens FOR ALL
    USING (public.is_org_member(organization_id));

-- Public can verify and redeem an acknowledgement token safely without login
CREATE POLICY "Public can query token by hash for acknowledgement"
    ON public.delivery_tokens FOR SELECT
    USING (true);

-- 6. Helper Atomic Function for Token Redemption (Prevents Race Conditions)
CREATE OR REPLACE FUNCTION public.redeem_delivery_token(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token RECORD;
    v_batch RECORD;
    v_project RECORD;
BEGIN
    -- 1. Find and lock the token row for update
    SELECT * INTO v_token
    FROM public.delivery_tokens
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TOKEN', 'message', 'This acknowledgement link or QR code is invalid.');
    END IF;

    -- 2. Check if already redeemed
    IF v_token.status = 'REDEEMED' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'ALREADY_REDEEMED', 
            'message', 'This delivery has already been acknowledged.',
            'redeemed_at', v_token.redeemed_at
        );
    END IF;

    -- 3. Check if revoked or expired
    IF v_token.status = 'REVOKED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'REVOKED', 'message', 'This acknowledgement token has been revoked by the organization.');
    END IF;

    IF v_token.expires_at < now() THEN
        UPDATE public.delivery_tokens SET status = 'EXPIRED' WHERE id = v_token.id;
        RETURN jsonb_build_object('success', false, 'error', 'EXPIRED', 'message', 'This delivery acknowledgement token has expired.');
    END IF;

    -- 4. Mark token as REDEEMED
    UPDATE public.delivery_tokens
    SET status = 'REDEEMED',
        redeemed_at = now()
    WHERE id = v_token.id;

    -- 5. Atomically increment the acknowledged count on the distribution batch
    UPDATE public.distribution_batches
    SET acknowledged_count = acknowledged_count + 1,
        updated_at = now()
    WHERE id = v_token.batch_id
    RETURNING * INTO v_batch;

    -- 6. Get project details for return payload
    SELECT title INTO v_project
    FROM public.projects
    WHERE id = v_token.project_id;

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', v_batch.id,
        'batch_name', v_batch.batch_name,
        'item_description', v_batch.item_description,
        'project_title', v_project.title,
        'redeemed_at', now()
    );
END;
$$;

