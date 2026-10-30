-- FundTrail Synthetic Demo Dataset Seed Script
-- WARNING: SYNTHETIC DEMO DATA ONLY. NOT REAL BENEFICIARIES OR PRIVATE FINANCIALS.

DO $$
DECLARE
    demo_org_id UUID := '00000000-0000-0000-0000-000000000001';
    demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
    demo_proj_id UUID := '11111111-1111-1111-1111-111111111111';
    exp1_id UUID := '22222222-2222-2222-2222-222222222221';
    exp2_id UUID := '22222222-2222-2222-2222-222222222222';
    exp3_id UUID := '22222222-2222-2222-2222-222222222223';
BEGIN
    -- 1. Create Demo Organization
    INSERT INTO public.organizations (id, name, created_at)
    VALUES (demo_org_id, 'Seva Jyoti Foundation (Demo Org)', '2026-09-15 10:00:00Z')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Create Demo Project: School Kit Support
    INSERT INTO public.projects (
        id, organization_id, title, purpose, goal_amount, currency,
        start_date, end_date, public_slug, status, created_at
    )
    VALUES (
        demo_proj_id, demo_org_id, 'School Kit Support',
        'Provide educational kits to underprivileged students across Rajasthan rural schools',
        100000.00, 'INR', '2026-10-01', '2026-10-31',
        'school-kit-support-2026', 'ACTIVE', '2026-10-01 09:00:00Z'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 3. Demo Donations (Total: ₹1,00,000)
    INSERT INTO public.donations (
        organization_id, project_id, amount_received, received_at,
        channel, source_reference, private_donor_label, created_at
    )
    VALUES
        (demo_org_id, demo_proj_id, 40000.00, '2026-10-01', 'UPI', 'DEMO-UPI-001', 'Donor Batch Alpha (Redacted)', '2026-10-01 11:30:00Z'),
        (demo_org_id, demo_proj_id, 35000.00, '2026-10-03', 'Bank transfer', 'DEMO-BANK-002', 'Corporate Match (Redacted)', '2026-10-03 14:15:00Z'),
        (demo_org_id, demo_proj_id, 25000.00, '2026-10-05', 'Crowdfunding', 'DEMO-CF-003', 'Online Campaign Supporters', '2026-10-05 16:45:00Z')
    ON CONFLICT DO NOTHING;

    -- 4. Demo Expenses (Total: ₹65,000)
    INSERT INTO public.expenses (
        id, organization_id, project_id, amount, spent_at,
        category, description, vendor_label, payment_reference, created_at
    )
    VALUES
        (exp1_id, demo_org_id, demo_proj_id, 40000.00, '2026-10-12', 'Educational materials', '60x School Bags, notebooks, stationery sets, geometry kits', 'Jaipur School Supplies Pvt Ltd', 'TXN-EDU-9901', '2026-10-12 10:00:00Z'),
        (exp2_id, demo_org_id, demo_proj_id, 15000.00, '2026-10-18', 'Distribution and logistics', 'Van transport & driver charges for rural school distribution points', 'Marwar Logistics', 'TXN-LOG-8821', '2026-10-18 15:30:00Z'),
        (exp3_id, demo_org_id, demo_proj_id, 10000.00, '2026-10-22', 'Other project expenses', 'Volunteer refreshments, waterproof kit covers, printing distribution logs', 'Various Local Vendors', 'TXN-MISC-7742', '2026-10-22 17:00:00Z')
    ON CONFLICT (id) DO NOTHING;

    -- 5. Demo Evidence Files
    INSERT INTO public.evidence_files (
        organization_id, project_id, expense_id, private_storage_path,
        sha256, file_name_safe, file_size_bytes, mime_type, evidence_type, visibility, review_status, created_at
    )
    VALUES
        (demo_org_id, demo_proj_id, exp1_id, '00000000-0000-0000-0000-000000000001/school-kits/invoice_jaipur_stationery.pdf', '0xa71b3e9f4c8d2a1b5e6f7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f', 'invoice_jaipur_stationery.pdf', 342150, 'application/pdf', 'INVOICE', 'PRIVATE', 'DOCUMENT_UPLOADED', '2026-10-12 11:00:00Z'),
        (demo_org_id, demo_proj_id, exp2_id, '00000000-0000-0000-0000-000000000001/school-kits/receipt_marwar_transport.pdf', '0xb82c4f0a5d9e3b2c6f7a8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90', 'receipt_marwar_transport.pdf', 184500, 'application/pdf', 'RECEIPT', 'PRIVATE', 'DOCUMENT_UPLOADED', '2026-10-18 16:00:00Z'),
        (demo_org_id, demo_proj_id, exp3_id, '00000000-0000-0000-0000-000000000001/school-kits/voucher_refreshments_logistics.pdf', '0xc93d5a1b6e0f4c3d7a8b9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9012', 'voucher_refreshments_logistics.pdf', 215400, 'application/pdf', 'BILL', 'PRIVATE', 'DOCUMENT_UPLOADED', '2026-10-22 17:30:00Z')
    ON CONFLICT DO NOTHING;

    -- 6. Demo Project Updates
    INSERT INTO public.project_updates (
        organization_id, project_id, update_date, summary, beneficiary_count, status, created_at
    )
    VALUES (
        demo_org_id, demo_proj_id, '2026-10-25',
        'Distribution activity completed: 60 educational kits distributed to students across 2 village primary schools in Sanganer block.',
        60, 'NGO_REPORTED', '2026-10-25 18:00:00Z'
    )
    ON CONFLICT DO NOTHING;
END $$;

