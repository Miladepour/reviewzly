-- ====================================================================================
-- REVIEWZLY SUPER ADMIN RLS POLICIES (Migration 07)
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times — DROP IF EXISTS prevents duplicate-policy errors.
-- Does NOT delete or modify any existing data or existing RLS policies.
-- ====================================================================================

-- 1. Allow super admins to read ALL businesses
DROP POLICY IF EXISTS "super_admin_read_businesses" ON businesses;
CREATE POLICY "super_admin_read_businesses"
ON businesses FOR SELECT
USING (
  EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
);

-- 2. Allow super admins to read ALL clients
DROP POLICY IF EXISTS "super_admin_read_clients" ON clients;
CREATE POLICY "super_admin_read_clients"
ON clients FOR SELECT
USING (
  EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
);

-- 3. Allow super admins to read ALL communications (activity tab)
DROP POLICY IF EXISTS "super_admin_read_communications" ON communications;
CREATE POLICY "super_admin_read_communications"
ON communications FOR SELECT
USING (
  EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
);

-- 4. Allow super admins to read ALL cancellation feedback
DROP POLICY IF EXISTS "super_admin_read_cancellations" ON cancellation_feedback;
CREATE POLICY "super_admin_read_cancellations"
ON cancellation_feedback FOR SELECT
USING (
  EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
);

-- 5. Allow super admins to read the super_admins table (needed for the
--    admin_voodoo_balance edge function verification + Grant Admin form)
DROP POLICY IF EXISTS "super_admin_read_super_admins" ON super_admins;
CREATE POLICY "super_admin_read_super_admins"
ON super_admins FOR SELECT
USING (auth.uid() = user_id);

-- 6. Allow super admins to INSERT new admins (Grant Admin button)
DROP POLICY IF EXISTS "super_admin_insert_super_admins" ON super_admins;
CREATE POLICY "super_admin_insert_super_admins"
ON super_admins FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
);

-- 7. Allow super admins to read ALL audit logs (GDPR deletion log)
DROP POLICY IF EXISTS "super_admin_read_audit_logs" ON admin_audit_logs;
CREATE POLICY "super_admin_read_audit_logs"
ON admin_audit_logs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
);
