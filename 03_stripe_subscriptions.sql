-- PHASE 1: SAAS SUBSCRIPTION STRUCTURE & ANALYTICS
-- Run this in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/_/sql/)

-- 1. Modify Core Business Tracking Table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS active_plan text;

-- 2. Establish Secure Cancellation Analytics Hierarchy
CREATE TABLE IF NOT EXISTS cancellation_feedback (
    id uuid primary key default gen_random_uuid(),
    business_id uuid references businesses(id) not null,
    reason text not null,
    canceled_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Lock Down Analytics Table Automatically (Zero-Trust)
ALTER TABLE cancellation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict View - Own Cancellations" 
ON cancellation_feedback FOR SELECT 
USING (auth.uid() = business_id);

CREATE POLICY "Strict Insert - Submit Cancellations" 
ON cancellation_feedback FOR INSERT 
WITH CHECK (auth.uid() = business_id);
