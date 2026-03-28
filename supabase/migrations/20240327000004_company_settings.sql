-- ============================================================
-- AML CRM — Company Settings
-- ============================================================

create table public.company_settings (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      text        not null unique,
  company_name   text,
  address_line1  text,
  address_line2  text,
  city           text,
  country        text,
  postal_code    text,
  phone          text,
  email          text,
  website        text,
  logo_url       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.company_settings enable row level security;

-- Only system_admin can read or write company settings
create policy "company_settings_admin_all"
  on public.company_settings for all
  using (public.has_role('system_admin'))
  with check (public.has_role('system_admin'));

-- ── Storage bucket for company assets (logo etc.) ─────────────
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do nothing;

-- system_admin can upload / overwrite objects
create policy "company_assets_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'company-assets'
    and public.has_role('system_admin')
  );

create policy "company_assets_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'company-assets'
    and public.has_role('system_admin')
  );

create policy "company_assets_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'company-assets'
    and public.has_role('system_admin')
  );

-- Public read — logo URLs must be accessible without auth
create policy "company_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'company-assets');
