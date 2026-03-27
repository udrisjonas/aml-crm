-- ============================================================
-- AML CRM — Pending Invites Migration
-- ============================================================

create table public.pending_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  full_name   text not null,
  roles       text[] not null default '{}',
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.pending_invites enable row level security;

-- system_admin full access
create policy "pending_invites_admin_all"
  on public.pending_invites for all
  using (public.has_role('system_admin'));

-- Invited users can read their own row (needed to show name/roles on /set-password)
create policy "pending_invites_select_own"
  on public.pending_invites for select
  using (email = auth.email());
