-- ============================================================
-- AML CRM — Extend individual_details for full KYC form
-- ============================================================

alter table public.individual_details
  add column if not exists is_lithuanian_resident boolean not null default true,
  add column if not exists foreign_id_number       text,
  add column if not exists is_stateless            boolean not null default false,
  add column if not exists id_issuing_country      text,
  add column if not exists id_issue_date           date,
  add column if not exists residential_address     text,
  add column if not exists correspondence_address  text,
  add column if not exists phone                   text,
  add column if not exists email                   text,
  add column if not exists acting_on_own_behalf    boolean not null default true,
  add column if not exists beneficial_owner_info   text;

-- Expand id_document_type check constraint to include eu_driving_license
alter table public.individual_details
  drop constraint if exists individual_details_id_document_type_check;

alter table public.individual_details
  add constraint individual_details_id_document_type_check
  check (id_document_type in (
    'passport', 'national_id', 'residence_permit', 'eu_driving_license'
  ));
