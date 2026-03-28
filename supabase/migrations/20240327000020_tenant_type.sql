-- Migration 000020: Tenant type column + defaults table

-- Add tenant_type to company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS tenant_type text NOT NULL DEFAULT 'generic'
    CHECK (tenant_type IN ('real_estate', 'financial_institution', 'payment_institution', 'crypto', 'notary', 'generic'));

-- Tenant type defaults table
CREATE TABLE IF NOT EXISTS tenant_type_defaults (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_type             text NOT NULL,
  setting_key             text NOT NULL,
  setting_value           jsonb NOT NULL,
  description             text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_type, setting_key)
);

-- RLS
ALTER TABLE tenant_type_defaults ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_type_defaults_staff_select" ON tenant_type_defaults;
CREATE POLICY "tenant_type_defaults_staff_select"
  ON tenant_type_defaults FOR SELECT
  USING (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

-- Seed defaults
INSERT INTO tenant_type_defaults (tenant_type, setting_key, setting_value, description) VALUES
  ('real_estate', 'kyc_required_fields', '["source_of_funds","beneficial_owner","pep_check","high_risk_country"]'::jsonb, 'Required KYC fields for real estate operators'),
  ('real_estate', 'review_cycle_months', '12'::jsonb, 'Annual review cycle for real estate'),
  ('real_estate', 'risk_threshold_high', '70'::jsonb, 'Score >= 70 is HIGH risk'),
  ('financial_institution', 'kyc_required_fields', '["source_of_funds","beneficial_owner","pep_check","high_risk_country","cash_transactions","purpose_of_relationship"]'::jsonb, 'Required KYC fields for financial institutions'),
  ('financial_institution', 'review_cycle_months', '12'::jsonb, 'Annual review cycle for financial institutions'),
  ('financial_institution', 'risk_threshold_high', '60'::jsonb, 'Score >= 60 is HIGH risk'),
  ('payment_institution', 'kyc_required_fields', '["source_of_funds","pep_check","high_risk_country","cash_transactions","purpose_of_relationship"]'::jsonb, 'Required KYC fields for payment institutions'),
  ('payment_institution', 'review_cycle_months', '12'::jsonb, 'Annual review cycle for payment institutions'),
  ('payment_institution', 'risk_threshold_high', '60'::jsonb, 'Score >= 60 is HIGH risk'),
  ('crypto', 'kyc_required_fields', '["source_of_funds","beneficial_owner","pep_check","high_risk_country","cash_transactions","purpose_of_relationship","crypto_wallet"]'::jsonb, 'Required KYC fields for crypto asset service providers'),
  ('crypto', 'review_cycle_months', '6'::jsonb, 'Semi-annual review cycle for crypto'),
  ('crypto', 'risk_threshold_high', '55'::jsonb, 'Score >= 55 is HIGH risk'),
  ('notary', 'kyc_required_fields', '["source_of_funds","beneficial_owner","pep_check","high_risk_country","purpose_of_relationship"]'::jsonb, 'Required KYC fields for notaries'),
  ('notary', 'review_cycle_months', '24'::jsonb, 'Biennial review cycle for notaries'),
  ('notary', 'risk_threshold_high', '70'::jsonb, 'Score >= 70 is HIGH risk'),
  ('generic', 'kyc_required_fields', '["source_of_funds","pep_check"]'::jsonb, 'Minimal required KYC fields for generic operators'),
  ('generic', 'review_cycle_months', '12'::jsonb, 'Annual review cycle for generic operators'),
  ('generic', 'risk_threshold_high', '70'::jsonb, 'Score >= 70 is HIGH risk')
ON CONFLICT (tenant_type, setting_key) DO NOTHING;
