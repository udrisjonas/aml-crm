-- ============================================================
-- AML CRM — Add VAT fields to company_settings
-- ============================================================

alter table public.company_settings
  add column if not exists vat_number  text,
  add column if not exists vat_country text;
