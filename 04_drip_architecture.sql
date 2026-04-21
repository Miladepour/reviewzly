-- ====================================================================================
-- REVIEWZLY ADVANCED DRIP CAMPAIGN & OPT-OUT ARCHITECTURE (Migration 04)
-- Run this securely inside the Supabase SQL Editor.
-- ====================================================================================

-- 1. UPGRADE THE CLIENTS TABLE TO SUPPORT CHRONOLOGICAL QUEUING
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS drip_step INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS next_action_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_unsubscribed BOOLEAN DEFAULT FALSE;

-- 2. UPGRADE THE BUSINESSES TABLE TO SUPPORT CUSTOM SEQUENCE CONFIGURATIONS
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS welcome_sms TEXT DEFAULT NULL;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS delay_hours_for_invite INTEGER DEFAULT 2;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS follow_up_sms TEXT DEFAULT NULL;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS follow_up_days INTEGER DEFAULT 7;

-- 3. CREATE SECURE UNSUBSCRIBE RPC (Bypasses RLS strictly for opting out)
CREATE OR REPLACE FUNCTION unsubscribe_client(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.clients 
    SET is_unsubscribed = TRUE, next_action_time = NULL 
    WHERE id = p_client_id;
END;
$$;

-- 4. ENABLE HTTP EXTENSION SO DATABASE AWARENESS CAN BIND TO THE CLOUDFLARE EDGE
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

/* 
====================================================================================
IMPORTANT POST-DEPLOYMENT INSTRUCTIONS:
To activate the fully automated 30-minute processing loop, you must schedule a cron job inside Supabase.
Run the following block AFTER updating the URL to match your live deployed website!

SELECT cron.schedule(
  'process_drip_queue',
  '0,30 * * * *',
  $$
    SELECT net.http_post(
        url:='https://reviewzly.com/api/cron_dispatch',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer REVIEWZLY_CRON_LOCK_123"}'::jsonb,
        body:='{"source": "supabase_cron"}'::jsonb
    );
  $$
);
====================================================================================
*/
