-- ====================================================================================
-- REVIEWZLY INVITE LEDGER (Migration 09)
-- Run in the Supabase SQL Editor. Safe to run multiple times. Does NOT delete data.
--
-- Adds a tamper-proof lifetime counter of invites actually sent, independent of
-- the clients table. Adding/deleting a contact never changes this; it only
-- increments when an SMS invite is genuinely sent.
-- ====================================================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invites_sent_total INTEGER DEFAULT 0;

-- Helper RPC the edge functions call after a successful send to bump the lifetime
-- counter by 1 (service-role only, same trust model as add_sms_credits).
CREATE OR REPLACE FUNCTION increment_invites_sent(p_biz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE businesses
  SET invites_sent_total = COALESCE(invites_sent_total, 0) + 1
  WHERE id = p_biz_id;
END;
$$;

REVOKE ALL ON FUNCTION increment_invites_sent(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_invites_sent(uuid) FROM anon;
REVOKE ALL ON FUNCTION increment_invites_sent(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_invites_sent(uuid) TO service_role;
