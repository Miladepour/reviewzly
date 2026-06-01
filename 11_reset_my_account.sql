-- ====================================================================================
-- RESET A SINGLE ACCOUNT FOR TESTING (Migration 11 — run as needed)
-- Zeros invites + clears subscription/plan state for ONE business by email,
-- so you can re-test the subscribe → invite-grant flow from a clean slate.
-- Run in the Supabase SQL Editor.
-- ====================================================================================

UPDATE businesses
SET sms_credits = 0,
    invites_sent_total = 0,
    active_plan = NULL,
    stripe_subscription_id = NULL
WHERE id = (SELECT id FROM auth.users WHERE email = 'epour.milad@gmail.com');

-- Verify the reset
SELECT id, sms_credits, invites_sent_total, active_plan, stripe_subscription_id
FROM businesses
WHERE id = (SELECT id FROM auth.users WHERE email = 'epour.milad@gmail.com');
