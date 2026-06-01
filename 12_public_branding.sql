-- ====================================================================================
-- REVIEWZLY PUBLIC BRANDING (Migration 12)
-- Run in the Supabase SQL Editor. Safe to re-run. Does NOT delete data.
--
-- Adds branding fields shown on the public review page + a public Storage bucket
-- for business logos.
-- ====================================================================================

-- 1. New branding columns on businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_website TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_address TEXT;
-- (business_phone already exists.)

-- 2. Public Storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage policies:
--    - Anyone can READ logos (public review page is unauthenticated).
--    - Authenticated users can upload/update/delete files in their OWN folder
--      (we store each business's logo under a path prefixed by their user id).
DROP POLICY IF EXISTS "logos public read" ON storage.objects;
CREATE POLICY "logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos owner upload" ON storage.objects;
CREATE POLICY "logos owner upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "logos owner update" ON storage.objects;
CREATE POLICY "logos owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "logos owner delete" ON storage.objects;
CREATE POLICY "logos owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Make sure the public review RPC returns the new fields.
-- get_public_tracking_link returns the business row; since it uses SELECT * /
-- row_to_json on businesses, the new columns flow through automatically. If your
-- RPC hand-picks columns, add: logo_url, business_website, business_address,
-- business_phone to its business JSON.
