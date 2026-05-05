-- PHASE 1: BUSINESS-SPECIFIC UNSUBSCRIBE
-- Run this in your Supabase Dashboard SQL Editor

CREATE OR REPLACE FUNCTION business_opt_out(p_business_id UUID, p_phone TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This securely finds the client for the specific business, ignoring any formatting in the phone number,
    -- and marks them as unsubscribed while removing them from any active automated drip sequence.
    UPDATE public.clients 
    SET is_unsubscribed = TRUE, next_action_time = NULL 
    WHERE business_id = p_business_id 
    AND regexp_replace(phone, '\D', '', 'g') LIKE '%' || regexp_replace(p_phone, '\D', '', 'g') || '%';
END;
$$;
