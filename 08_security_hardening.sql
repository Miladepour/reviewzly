-- ====================================================================================
-- REVIEWZLY SECURITY HARDENING (Migration 08)
-- Run this in the Supabase SQL Editor. Safe to run multiple times.
-- Does NOT delete data.
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- FIX 1 (CRITICAL): business_opt_out used a LIKE '%phone%' substring match, which
-- could unsubscribe EVERY client whose number merely contained the entered digits,
-- and the endpoint is public. Switch to an EXACT normalized-number match.
-- ------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION business_opt_out(p_business_id UUID, p_phone TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.clients
    SET is_unsubscribed = TRUE, next_action_time = NULL
    WHERE business_id = p_business_id
      AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
END;
$$;

-- ------------------------------------------------------------------------------------
-- FIX 2 (HIGH): add_sms_credits is SECURITY DEFINER and adjusts SMS credit balances.
-- If callable by anon/authenticated, any logged-in user could grant themselves
-- unlimited credits. Restrict execution to the service role only (used by the
-- Stripe webhook and cron, which authenticate with the service role key).
-- ------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION add_sms_credits(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION add_sms_credits(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION add_sms_credits(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION add_sms_credits(uuid, integer) TO service_role;

-- ------------------------------------------------------------------------------------
-- FIX 3 (HIGH): Lock down the super_admins table so a user cannot make themselves
-- an admin. RLS must be ON, and INSERT must require the caller to already be an
-- admin. (The SuperAdmin "Grant Admin" UI insert then only works for real admins.)
-- ------------------------------------------------------------------------------------
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- A user may read only their own admin row (to check their own status).
DROP POLICY IF EXISTS "super_admin_read_super_admins" ON super_admins;
CREATE POLICY "super_admin_read_super_admins"
ON super_admins FOR SELECT
USING (auth.uid() = user_id);

-- Only an existing admin may insert new admins.
DROP POLICY IF EXISTS "super_admin_insert_super_admins" ON super_admins;
CREATE POLICY "super_admin_insert_super_admins"
ON super_admins FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM super_admins sa WHERE sa.user_id = auth.uid())
);

-- No UPDATE/DELETE policies => those operations are denied for normal users
-- (service role still bypasses RLS for any maintenance you need).

-- ------------------------------------------------------------------------------------
-- FIX 4 (HIGH, defense in depth): ensure the inbound-SMS auto-created client rows
-- and the cancellation_feedback table aren't writable by the wrong party. If
-- cancellation_feedback lacks RLS, enable it (insert scoped to the owner).
-- ------------------------------------------------------------------------------------
ALTER TABLE cancellation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_cancellation_insert" ON cancellation_feedback;
CREATE POLICY "own_cancellation_insert"
ON cancellation_feedback FOR INSERT
WITH CHECK (auth.uid() = business_id);
