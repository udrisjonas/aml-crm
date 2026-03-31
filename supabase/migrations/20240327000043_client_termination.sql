-- ============================================================
-- AML CRM — Client Termination & Revival
-- ============================================================

-- ── Add termination columns to clients ───────────────────────────────────────

ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_by uuid references profiles(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS termination_reason text CHECK (termination_reason IN (
  'relationship_completed',
  'client_request',
  'no_longer_requires_services',
  'cdd_not_completed',
  'suspicious_activity',
  'sanctions_pep_concerns',
  'refused_information',
  'other_aml_reason'
));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS termination_notes text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS termination_category text CHECK (termination_category IN ('normal','aml'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS revival_requires_aml_review boolean not null default false;

-- ── client_revivals ───────────────────────────────────────────────────────────

create table if not exists public.client_revivals (
  id                   uuid        primary key default gen_random_uuid(),
  original_client_id   uuid        not null references clients(id),
  new_client_id        uuid        references clients(id),
  revived_by           uuid        not null references profiles(id),
  revival_justification text,
  reviewed_by          uuid        references profiles(id),
  reviewed_at          timestamptz,
  reviewer_notes       text,
  status               text        not null default 'pending'
                         check (status in ('pending','approved','rejected')),
  created_at           timestamptz not null default now()
);

alter table public.client_revivals enable row level security;

-- Staff can read revivals for clients in their scope
create policy "revivals_staff_select"
  on public.client_revivals for select
  using (public.has_role('aml_officer') or public.has_role('broker') or public.has_role('system_admin') or public.has_role('senior_manager'));

-- Only staff can insert revivals
create policy "revivals_staff_insert"
  on public.client_revivals for insert
  with check (public.has_role('aml_officer') or public.has_role('broker') or public.has_role('system_admin'));

-- Only AML officers / system_admin can update revivals
create policy "revivals_aml_update"
  on public.client_revivals for update
  using (public.has_role('aml_officer') or public.has_role('system_admin'));
