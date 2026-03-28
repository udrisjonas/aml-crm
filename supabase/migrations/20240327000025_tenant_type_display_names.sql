-- Migration 000025: Fix tenant types — correct 6 values, add display name columns

-- Add display name columns to tenant_type_defaults
ALTER TABLE tenant_type_defaults
  ADD COLUMN IF NOT EXISTS display_name_lt text,
  ADD COLUMN IF NOT EXISTS display_name_en text;

-- Migrate any existing rows to a valid new tenant_type before changing the constraint
UPDATE company_settings
  SET tenant_type = 'real_estate'
  WHERE tenant_type NOT IN ('real_estate', 'accounting', 'audit', 'law_firm', 'investment', 'goods_trader');

-- Drop the old CHECK constraint on company_settings.tenant_type and replace it
ALTER TABLE company_settings
  DROP CONSTRAINT IF EXISTS company_settings_tenant_type_check;

ALTER TABLE company_settings
  ADD CONSTRAINT company_settings_tenant_type_check
    CHECK (tenant_type IN ('real_estate', 'accounting', 'audit', 'law_firm', 'investment', 'goods_trader'));

-- Update default value to a valid type
ALTER TABLE company_settings
  ALTER COLUMN tenant_type SET DEFAULT 'real_estate';

-- Remove old tenant type rows
DELETE FROM tenant_type_defaults
WHERE tenant_type IN ('financial_institution', 'payment_institution', 'crypto', 'notary', 'generic');

-- Update existing real_estate rows to add display names
UPDATE tenant_type_defaults
  SET display_name_lt = 'Nekilnojamojo turto agentai / makleriai',
      display_name_en = 'Real Estate Agents / Brokers'
WHERE tenant_type = 'real_estate';

-- Insert new tenant types with all three setting keys + display names
INSERT INTO tenant_type_defaults (tenant_type, setting_key, setting_value, description, display_name_lt, display_name_en) VALUES
  ('accounting', 'kyc_required_fields', '["source_of_funds","beneficial_owner","pep_check","high_risk_country","purpose_of_relationship"]'::jsonb, 'Required KYC fields for accounting firms', 'Buhalterinės apskaitos įmonės', 'Accounting Firms'),
  ('accounting', 'review_cycle_months', '12'::jsonb, 'Annual review cycle for accounting firms', 'Buhalterinės apskaitos įmonės', 'Accounting Firms'),
  ('accounting', 'risk_threshold_high', '70'::jsonb, 'Score >= 70 is HIGH risk', 'Buhalterinės apskaitos įmonės', 'Accounting Firms'),

  ('audit', 'kyc_required_fields', '["source_of_funds","beneficial_owner","pep_check","high_risk_country","purpose_of_relationship"]'::jsonb, 'Required KYC fields for audit firms', 'Audito įmonės', 'Audit Firms'),
  ('audit', 'review_cycle_months', '12'::jsonb, 'Annual review cycle for audit firms', 'Audito įmonės', 'Audit Firms'),
  ('audit', 'risk_threshold_high', '70'::jsonb, 'Score >= 70 is HIGH risk', 'Audito įmonės', 'Audit Firms'),

  ('law_firm', 'kyc_required_fields', '["source_of_funds","beneficial_owner","pep_check","high_risk_country","purpose_of_relationship"]'::jsonb, 'Required KYC fields for law firms', 'Advokatų kontoros / notarai', 'Law Firms / Notaries'),
  ('law_firm', 'review_cycle_months', '24'::jsonb, 'Biennial review cycle for law firms', 'Advokatų kontoros / notarai', 'Law Firms / Notaries'),
  ('law_firm', 'risk_threshold_high', '70'::jsonb, 'Score >= 70 is HIGH risk', 'Advokatų kontoros / notarai', 'Law Firms / Notaries'),

  ('investment', 'kyc_required_fields', '["source_of_funds","beneficial_owner","pep_check","high_risk_country","cash_transactions","purpose_of_relationship"]'::jsonb, 'Required KYC fields for investment firms', 'Investicinės įmonės', 'Investment Firms'),
  ('investment', 'review_cycle_months', '12'::jsonb, 'Annual review cycle for investment firms', 'Investicinės įmonės', 'Investment Firms'),
  ('investment', 'risk_threshold_high', '60'::jsonb, 'Score >= 60 is HIGH risk', 'Investicinės įmonės', 'Investment Firms'),

  ('goods_trader', 'kyc_required_fields', '["source_of_funds","pep_check","high_risk_country","cash_transactions"]'::jsonb, 'Required KYC fields for high-value goods traders', 'Didelės vertės prekių prekybininkai', 'High-Value Goods Traders'),
  ('goods_trader', 'review_cycle_months', '12'::jsonb, 'Annual review cycle for goods traders', 'Didelės vertės prekių prekybininkai', 'High-Value Goods Traders'),
  ('goods_trader', 'risk_threshold_high', '70'::jsonb, 'Score >= 70 is HIGH risk', 'Didelės vertės prekių prekybininkai', 'High-Value Goods Traders')
ON CONFLICT (tenant_type, setting_key) DO UPDATE
  SET display_name_lt = EXCLUDED.display_name_lt,
      display_name_en = EXCLUDED.display_name_en;
