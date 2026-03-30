-- ── compliance_documents ─────────────────────────────────────────────────────

create table if not exists compliance_documents (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           text not null,
  document_type       text not null check (document_type in (
    'aml_policy',
    'internal_control_procedures',
    'risk_assessment_methodology',
    'staff_training_programme',
    'suspicious_transaction_reporting_procedure',
    'customer_due_diligence_procedure',
    'sanctions_implementation_procedure',
    'monitoring_procedure',
    'other'
  )),
  title               text not null,
  description         text,
  version             text not null default '1.0',
  version_number      integer not null default 1,
  status              text not null default 'active'
                        check (status in ('draft','active','superseded')),
  file_name           text not null,
  file_path           text not null,
  file_size           integer,
  mime_type           text,
  uploaded_by         uuid references profiles(id),
  uploaded_at         timestamptz not null default now(),
  approval_date       date,
  approved_by_name    text,
  next_review_date    date,
  changelog           text,
  superseded_at       timestamptz,
  superseded_by       uuid references compliance_documents(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── responsible_persons ───────────────────────────────────────────────────────

create table if not exists responsible_persons (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   text not null,
  user_id                     uuid references profiles(id),
  full_name                   text not null,
  position                    text not null,
  appointment_date            date not null,
  appointment_document_path   text,
  appointment_document_name   text,
  regulator_contact_email     text,
  regulator_contact_phone     text,
  regulator_name              text default 'Finansinių nusikaltimų tyrimo tarnyba (FNTT)',
  status                      text not null default 'active'
                                check (status in ('active','terminated')),
  termination_date            date,
  termination_reason          text,
  appointed_by                uuid references profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- ── Auto-supersede trigger ────────────────────────────────────────────────────
-- When a new compliance_document with status='active' is inserted,
-- mark all previous active docs of the same type + tenant as 'superseded'.

create or replace function auto_supersede_compliance_docs()
returns trigger language plpgsql as $$
begin
  if new.status = 'active' then
    update compliance_documents
    set
      status       = 'superseded',
      superseded_at = now(),
      superseded_by = new.id,
      updated_at    = now()
    where
      tenant_id     = new.tenant_id
      and document_type = new.document_type
      and status    = 'active'
      and id        != new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_supersede_compliance_docs on compliance_documents;
create trigger trg_auto_supersede_compliance_docs
  after insert on compliance_documents
  for each row execute function auto_supersede_compliance_docs();

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table compliance_documents enable row level security;
alter table responsible_persons   enable row level security;

-- All authenticated users may read
create policy "compliance_docs_read" on compliance_documents
  for select using (auth.role() = 'authenticated');

create policy "responsible_persons_read" on responsible_persons
  for select using (auth.role() = 'authenticated');

-- Only system_admin / senior_manager may write
create policy "compliance_docs_write" on compliance_documents
  for all using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.name in ('system_admin', 'senior_manager')
    )
  );

create policy "responsible_persons_write" on responsible_persons
  for all using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.name in ('system_admin', 'senior_manager')
    )
  );
