-- Add token_language to edd_questionnaires so the client-facing form
-- can render in the language chosen by the AML officer when sending.
ALTER TABLE edd_questionnaires
  ADD COLUMN IF NOT EXISTS token_language text NOT NULL DEFAULT 'lt'
    CHECK (token_language IN ('lt', 'en'));
