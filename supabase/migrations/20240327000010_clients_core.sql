-- ============================================================
-- AML CRM — Individual Client KYC Core Tables (idempotent)
-- ============================================================

-- ── Clients ────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          text        not null,
  client_type        text        not null
                       check (client_type in ('individual', 'legal_entity')),
  assigned_broker_id uuid        references public.profiles(id),
  kyc_status         text        not null default 'draft'
                       check (kyc_status in (
                         'draft','sent_to_client','client_completed',
                         'broker_verified_originals','submitted','under_review',
                         'edd_triggered','edd_sent','edd_completed',
                         'escalated','verified','rejected'
                       )),
  edd_status         text        not null default 'not_required'
                       check (edd_status in (
                         'not_required','triggered','sent_to_client',
                         'client_completed','under_review','completed'
                       )),
  risk_rating        text        not null default 'not_assessed'
                       check (risk_rating in ('low','medium','high','not_assessed')),
  client_status      text        not null default 'active'
                       check (client_status in ('active','pending_review','edd','archived','rejected')),
  is_represented     boolean     not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid        references public.profiles(id),
  last_reviewed_at   timestamptz,
  last_reviewed_by   uuid        references public.profiles(id),
  notes              text
);

-- ── Individual Details ─────────────────────────────────────────────────
create table if not exists public.individual_details (
  id                    uuid    primary key default gen_random_uuid(),
  client_id             uuid    not null references public.clients(id) on delete cascade unique,
  first_name            text    not null,
  last_name             text    not null,
  date_of_birth         date,
  personal_id_number    text,
  nationality           text,
  country_of_residence  text,
  pep_status            text    not null default 'unknown'
                          check (pep_status in ('yes','no','unknown')),
  pep_self_declared     boolean not null default false,
  pep_details           text,
  sanctions_status      text    not null default 'unknown'
                          check (sanctions_status in ('clear','hit','unknown')),
  adverse_media_status  text    not null default 'unknown'
                          check (adverse_media_status in ('clear','hit','unknown')),
  source_of_funds       text,
  source_of_wealth      text,
  occupation            text,
  purpose_of_relationship text,
  id_document_type      text    check (id_document_type in ('passport','national_id','residence_permit')),
  id_document_number    text,
  id_document_expiry    date,
  id_verified           boolean not null default false,
  id_verified_at        timestamptz,
  id_verified_by        uuid    references public.profiles(id),
  liveness_checked      boolean not null default false,
  liveness_checked_at   timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── Client Representatives ─────────────────────────────────────────────
create table if not exists public.client_representatives (
  id                  uuid    primary key default gen_random_uuid(),
  client_id           uuid    not null references public.clients(id) on delete cascade,
  first_name          text    not null,
  last_name           text    not null,
  date_of_birth       date,
  personal_id_number  text,
  nationality         text,
  relationship_type   text    not null
                        check (relationship_type in ('parent','guardian','poa_holder','court_appointed')),
  pep_status          text    not null default 'unknown'
                        check (pep_status in ('yes','no','unknown')),
  sanctions_status    text    not null default 'unknown'
                        check (sanctions_status in ('clear','hit','unknown')),
  id_verified         boolean not null default false,
  id_verified_at      timestamptz,
  id_verified_by      uuid    references public.profiles(id),
  liveness_checked    boolean not null default false,
  liveness_checked_at timestamptz,
  notes               text,
  created_at          timestamptz not null default now()
);

-- ── Client Documents ───────────────────────────────────────────────────
create table if not exists public.client_documents (
  id               uuid    primary key default gen_random_uuid(),
  client_id        uuid    not null references public.clients(id) on delete cascade,
  tenant_id        text    not null,
  uploaded_by      uuid    references public.profiles(id),
  document_type    text    not null
                     check (document_type in (
                       'photo','passport','national_id','residence_permit',
                       'proof_of_address','poa_document','birth_certificate',
                       'court_order','other_representation','company_registration',
                       'company_accounts','pep_check_screenshot',
                       'sanctions_check_screenshot','adverse_media_screenshot',
                       'edd_document','other'
                     )),
  file_name        text    not null,
  file_path        text    not null,
  file_size        integer,
  mime_type        text,
  notes            text,
  uploaded_by_type text    not null default 'broker'
                     check (uploaded_by_type in ('broker','client','aml_officer','system')),
  created_at       timestamptz not null default now()
);

-- ── Client KYC Tokens ─────────────────────────────────────────────────
create table if not exists public.client_kyc_tokens (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references public.clients(id) on delete cascade,
  token       text        not null unique default gen_random_uuid()::text,
  token_type  text        not null check (token_type in ('kyc','edd')),
  language    text        not null default 'lt' check (language in ('lt','en')),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  is_active   boolean     not null default true,
  created_by  uuid        references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ── Client Field Changes ───────────────────────────────────────────────
create table if not exists public.client_field_changes (
  id               uuid        primary key default gen_random_uuid(),
  client_id        uuid        not null references public.clients(id) on delete cascade,
  token_id         uuid        references public.client_kyc_tokens(id),
  field_name       text        not null,
  old_value        text,
  new_value        text,
  changed_by_type  text        not null
                     check (changed_by_type in ('broker','client','aml_officer','system')),
  changed_by       uuid        references public.profiles(id),
  changed_at       timestamptz not null default now()
);

-- ── Client KYC Signatures ─────────────────────────────────────────────
create table if not exists public.client_kyc_signatures (
  id                uuid        primary key default gen_random_uuid(),
  client_id         uuid        not null references public.clients(id) on delete cascade,
  token_id          uuid        not null references public.client_kyc_tokens(id),
  signed_by_name    text        not null,
  signed_at         timestamptz not null default now(),
  ip_address        text,
  is_representative boolean     not null default false,
  representative_id uuid        references public.client_representatives(id),
  declaration_text  text        not null,
  created_at        timestamptz not null default now()
);

-- ── Client Originals Verified ──────────────────────────────────────────
create table if not exists public.client_originals_verified (
  id           uuid        primary key default gen_random_uuid(),
  client_id    uuid        not null references public.clients(id) on delete cascade,
  verified_by  uuid        not null references public.profiles(id),
  verified_at  timestamptz not null default now(),
  notes        text
);

-- ══════════════════════════════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════════════════════════════
create index if not exists clients_tenant_idx              on public.clients(tenant_id);
create index if not exists clients_broker_idx              on public.clients(assigned_broker_id);
create index if not exists clients_kyc_status_idx          on public.clients(kyc_status);
create index if not exists clients_risk_rating_idx         on public.clients(risk_rating);
create index if not exists client_documents_client_idx     on public.client_documents(client_id);
create index if not exists client_kyc_tokens_token_idx     on public.client_kyc_tokens(token);
create index if not exists client_field_changes_client_idx on public.client_field_changes(client_id);

-- ══════════════════════════════════════════════════════════════════════
-- updated_at helper (create or replace — idempotent)
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists clients_updated_at          on public.clients;
drop trigger if exists individual_details_updated_at on public.individual_details;

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger individual_details_updated_at
  before update on public.individual_details
  for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════
alter table public.clients                   enable row level security;
alter table public.individual_details        enable row level security;
alter table public.client_representatives    enable row level security;
alter table public.client_documents          enable row level security;
alter table public.client_kyc_tokens         enable row level security;
alter table public.client_field_changes      enable row level security;
alter table public.client_kyc_signatures     enable row level security;
alter table public.client_originals_verified enable row level security;

-- ── clients ───────────────────────────────────────────────────────────
drop policy if exists "clients_select"  on public.clients;
drop policy if exists "clients_insert"  on public.clients;
drop policy if exists "clients_update"  on public.clients;
drop policy if exists "clients_delete"  on public.clients;

create policy "clients_select"
  on public.clients for select
  to authenticated
  using (
    tenant_id = 'default' and (
      public.has_role('system_admin')
      or public.has_role('aml_officer')
      or public.has_role('senior_manager')
      or (public.has_role('broker') and assigned_broker_id = auth.uid())
    )
  );

create policy "clients_insert"
  on public.clients for insert
  to authenticated
  with check (
    tenant_id = 'default' and (
      public.has_role('system_admin')
      or public.has_role('aml_officer')
      or public.has_role('broker')
    )
  );

create policy "clients_update"
  on public.clients for update
  to authenticated
  using (
    tenant_id = 'default' and (
      public.has_role('system_admin')
      or public.has_role('aml_officer')
      or (public.has_role('broker') and assigned_broker_id = auth.uid())
    )
  );

create policy "clients_delete"
  on public.clients for delete
  to authenticated
  using (public.has_role('system_admin'));

-- ── individual_details ────────────────────────────────────────────────
drop policy if exists "individual_details_select" on public.individual_details;
drop policy if exists "individual_details_insert" on public.individual_details;
drop policy if exists "individual_details_update" on public.individual_details;

create policy "individual_details_select"
  on public.individual_details for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or public.has_role('senior_manager')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

create policy "individual_details_insert"
  on public.individual_details for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

create policy "individual_details_update"
  on public.individual_details for update
  to authenticated
  using (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

-- ── client_representatives ────────────────────────────────────────────
drop policy if exists "reps_select" on public.client_representatives;
drop policy if exists "reps_write"  on public.client_representatives;

create policy "reps_select"
  on public.client_representatives for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or public.has_role('senior_manager')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

create policy "reps_write"
  on public.client_representatives for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

-- ── client_documents ──────────────────────────────────────────────────
drop policy if exists "documents_select" on public.client_documents;
drop policy if exists "documents_insert" on public.client_documents;

create policy "documents_select"
  on public.client_documents for select
  to authenticated
  using (
    tenant_id = 'default' and (
      public.has_role('system_admin') or public.has_role('aml_officer')
      or public.has_role('senior_manager')
      or exists (
        select 1 from public.clients c where c.id = client_id
        and public.has_role('broker') and c.assigned_broker_id = auth.uid()
      )
    )
  );

create policy "documents_insert"
  on public.client_documents for insert
  to authenticated
  with check (
    tenant_id = 'default' and (
      public.has_role('system_admin') or public.has_role('aml_officer')
      or exists (
        select 1 from public.clients c where c.id = client_id
        and public.has_role('broker') and c.assigned_broker_id = auth.uid()
      )
    )
  );

-- ── client_kyc_tokens ─────────────────────────────────────────────────
drop policy if exists "kyc_tokens_staff_select" on public.client_kyc_tokens;
drop policy if exists "kyc_tokens_staff_insert" on public.client_kyc_tokens;
drop policy if exists "kyc_tokens_staff_update" on public.client_kyc_tokens;

create policy "kyc_tokens_staff_select"
  on public.client_kyc_tokens for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or public.has_role('senior_manager')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

create policy "kyc_tokens_staff_insert"
  on public.client_kyc_tokens for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

create policy "kyc_tokens_staff_update"
  on public.client_kyc_tokens for update
  to authenticated
  using (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

-- Security definer function for unauthenticated client-facing token lookup
create or replace function public.get_kyc_token(p_token text)
returns setof public.client_kyc_tokens
language sql security definer stable
set search_path = public
as $$
  select * from public.client_kyc_tokens
  where token = p_token
    and is_active = true
    and expires_at > now();
$$;

grant execute on function public.get_kyc_token(text) to anon, authenticated;

-- ── client_field_changes ──────────────────────────────────────────────
drop policy if exists "field_changes_staff_select" on public.client_field_changes;
drop policy if exists "field_changes_anon_insert"  on public.client_field_changes;

create policy "field_changes_staff_select"
  on public.client_field_changes for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or public.has_role('senior_manager')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

create policy "field_changes_anon_insert"
  on public.client_field_changes for insert
  to anon, authenticated
  with check (true);

-- ── client_kyc_signatures ─────────────────────────────────────────────
drop policy if exists "signatures_staff_select" on public.client_kyc_signatures;
drop policy if exists "signatures_anon_insert"  on public.client_kyc_signatures;

create policy "signatures_staff_select"
  on public.client_kyc_signatures for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or public.has_role('senior_manager')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

create policy "signatures_anon_insert"
  on public.client_kyc_signatures for insert
  to anon, authenticated
  with check (true);

-- ── client_originals_verified ─────────────────────────────────────────
drop policy if exists "originals_verified_select" on public.client_originals_verified;
drop policy if exists "originals_verified_insert" on public.client_originals_verified;

create policy "originals_verified_select"
  on public.client_originals_verified for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or public.has_role('senior_manager')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

create policy "originals_verified_insert"
  on public.client_originals_verified for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clients c where c.id = client_id
      and (
        public.has_role('system_admin') or public.has_role('aml_officer')
        or (public.has_role('broker') and c.assigned_broker_id = auth.uid())
      )
    )
  );

-- ══════════════════════════════════════════════════════════════════════
-- Storage: client-documents bucket (private, signed URLs only)
-- ══════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-documents',
  'client-documents',
  false,
  10485760,
  array[
    'image/jpeg','image/png','image/webp','image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

drop policy if exists "client_docs_storage_insert" on storage.objects;
drop policy if exists "client_docs_storage_select" on storage.objects;
drop policy if exists "client_docs_storage_delete" on storage.objects;

create policy "client_docs_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-documents'
    and (
      public.has_role('system_admin')
      or public.has_role('aml_officer')
      or public.has_role('broker')
    )
  );

create policy "client_docs_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-documents'
    and (
      public.has_role('system_admin')
      or public.has_role('aml_officer')
      or public.has_role('senior_manager')
      or public.has_role('broker')
    )
  );

create policy "client_docs_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-documents'
    and (
      public.has_role('system_admin')
      or public.has_role('aml_officer')
    )
  );
