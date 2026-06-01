-- ====================================================================================
-- REVIEWZLY RESET ALL INVITE BALANCES (Migration 10)
-- Run ONCE in the Supabase SQL Editor to zero every account's invite balance and
-- lifetime counter, for a clean slate before going live.
--
-- WARNING: This sets EVERY business's balance to 0. Only run while there are no
-- paying users (as intended).
-- ====================================================================================

UPDATE businesses SET sms_credits = 0;

-- Reset the lifetime sent counter too (run migration 09 first so the column exists).
UPDATE businesses SET invites_sent_total = 0;
