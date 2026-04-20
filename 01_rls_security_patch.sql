-- PHASE 1: SUPABASE ZERO-TRUST SECURITY PATCH
-- Run this completely in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/_/sql/)

-- 1. TURN ON RLS MASTER SWITCH
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- 2. SECURING BUSINESSES TABLE
-- Businesses can only view and edit their own isolated profile
CREATE POLICY "Strict View - Business Profile" 
ON businesses FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Strict Update - Business Profile" 
ON businesses FOR UPDATE 
USING (auth.uid() = id);

-- (Assuming Insert is handled by a Secure Auth Trigger. If you insert directly from the frontend on signup, enable this:)
-- CREATE POLICY "Strict Insert - Business Profile" ON businesses FOR INSERT WITH CHECK (auth.uid() = id);


-- 3. SECURING CLIENTS TABLE
-- Businesses can only inherently VIEW, INSERT, UPDATE, or DELETE clients their business explicitly owns
CREATE POLICY "Strict View - Business Clients" 
ON clients FOR SELECT 
USING (auth.uid() = business_id);

CREATE POLICY "Strict Insert - Business Clients" 
ON clients FOR INSERT 
WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Strict Update - Business Clients" 
ON clients FOR UPDATE 
USING (auth.uid() = business_id);

CREATE POLICY "Strict Delete - Business Clients" 
ON clients FOR DELETE 
USING (auth.uid() = business_id);


-- 4. SECURING COMMUNICATIONS TABLE 
-- Same strict ownership principles for SMS logs and inbound texts
CREATE POLICY "Strict View - Communications" 
ON communications FOR SELECT 
USING (auth.uid() = business_id);

CREATE POLICY "Strict Insert - Communications" 
ON communications FOR INSERT 
WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Strict Update - Communications" 
ON communications FOR UPDATE 
USING (auth.uid() = business_id);

CREATE POLICY "Strict Delete - Communications" 
ON communications FOR DELETE 
USING (auth.uid() = business_id);

-- MISSION ACCOMPLISHED: FRONTEND IS OFFICIALLY LOCKED DOWN
