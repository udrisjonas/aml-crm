-- ============================================================
-- Contact requests from landing page
-- ============================================================

create table if not exists public.contact_requests (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  company      text,
  email        text        not null,
  phone        text,
  message      text        not null,
  responded_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Only staff can read; anyone can insert (no auth on landing page)
alter table public.contact_requests enable row level security;

drop policy if exists "contact_requests_staff_select" on public.contact_requests;
drop policy if exists "contact_requests_anon_insert"  on public.contact_requests;

create policy "contact_requests_staff_select"
  on public.contact_requests for select
  to authenticated
  using (
    public.has_role('system_admin')
    or public.has_role('senior_manager')
  );

create policy "contact_requests_anon_insert"
  on public.contact_requests for insert
  to anon, authenticated
  with check (true);
