-- Invite Message: collapse the welcome + scheduled-review flow into a single
-- immediate "Invite" SMS. The deferred review send (via Voodoo `schedule`) was
-- returning "Not Delivered"; the single immediate message matches the known-good
-- behaviour.

-- New single-template column.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invite_sms TEXT;

-- Seed it from the existing templates so current accounts keep their wording.
UPDATE businesses
SET invite_sms = COALESCE(NULLIF(welcome_sms, ''), NULLIF(review_sms, ''))
WHERE invite_sms IS NULL;

-- Fill any remaining blanks with the default invite copy.
UPDATE businesses
SET invite_sms = 'Hello, Welcome to {{business_name}} Members Club. Please review us here and share your experience with us: {{review_link}}'
WHERE invite_sms IS NULL OR invite_sms = '';

-- Note: welcome_sms, review_sms and delay_hours_for_invite are now unused by the
-- onboarding flow. They are left in place for backward compatibility (the cron
-- follow-up still reads review_sms as a Step-1 safety net) and can be dropped later.
