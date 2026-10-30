-- Migration 002: RLS Auto-Membership Trigger & Demo Org Access
-- Run this in Supabase SQL Editor to enable automatic organization membership on Google/Email Sign-up
-- and allow the demo organization to write to the database.

-- 1. Update is_org_member to allow the demo seed organization
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT (
        -- Allow demo organization for hackathon judges & local testing
        target_org_id = '00000000-0000-0000-0000-000000000001'::uuid
        OR
        -- Allow members of this organization
        EXISTS (
            SELECT 1
            FROM public.organization_members
            WHERE organization_id = target_org_id
              AND user_id = auth.uid()
        )
    );
$$;

-- 2. Trigger function: Automatically create an Organization and Member record when a user signs up via Google or Email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_org_id UUID := gen_random_uuid();
    org_name TEXT;
BEGIN
    org_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        split_part(new.email, '@', 1)
    ) || '''s NGO';

    -- Create default organization for new user
    INSERT INTO public.organizations (id, name, created_by, created_at)
    VALUES (new_org_id, org_name, new.id, now());

    -- Assign user as ADMIN of their organization
    INSERT INTO public.organization_members (organization_id, user_id, role, created_at)
    VALUES (new_org_id, new.id, 'ADMIN', now());

    RETURN new;
END;
$$;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Also allow authenticated users to insert into organizations
DROP POLICY IF EXISTS "Authenticated users can create an organization" ON public.organizations;
CREATE POLICY "Authenticated users can create an organization"
    ON public.organizations FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow demo org inserts" ON public.organizations;
CREATE POLICY "Allow demo org inserts"
    ON public.organizations FOR INSERT
    WITH CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid OR id = '00000000-0000-0000-0000-000000000002'::uuid);

-- 4. Enable public read for demo org projects
DROP POLICY IF EXISTS "Allow demo org projects read" ON public.projects;
CREATE POLICY "Allow demo org projects read"
    ON public.projects FOR SELECT
    USING (organization_id = '00000000-0000-0000-0000-000000000001'::uuid OR public.is_org_member(organization_id));

