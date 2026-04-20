-- PHASE 1: STRIPE BILLING LEDGER SECURITY
-- Run this in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/_/sql/)

-- Create an isolated Server-Side Function to prevent client-side Race Conditions
CREATE OR REPLACE FUNCTION add_sms_credits(p_biz_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We strictly lock the row to automatically increment the global balance
  UPDATE businesses
  SET sms_credits = COALESCE(sms_credits, 0) + p_amount
  WHERE id = p_biz_id;
END;
$$;
