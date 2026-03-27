-- ============================================================
-- AML CRM — RBAC Migration
-- ============================================================

-- ── Roles ────────────────────────────────────────────────────
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text not null,
  created_at  timestamptz not null default now()
);

insert into public.roles (name, description) values
  ('system_admin',    'Full access, user management, system configuration'),
  ('aml_officer',     'View all clients, modify risk levels, assign EDD, escalate and reassign clients'),
  ('broker',          'Create clients, edit own clients only, send verification links'),
  ('senior_manager',  'Upload policy documents, assign training, approve or decline escalated clients');

-- ── Profiles ─────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text not null,
  tenant_id  uuid,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── User → Role junction ─────────────────────────────────────
create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role_id     uuid not null references public.roles(id)    on delete cascade,
  assigned_by uuid          references public.profiles(id),
  assigned_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- ── Clients (placeholder with broker-scoped RLS) ─────────────
create table public.clients (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  email               text,
  phone               text,
  risk_level          text not null default 'low'
                        check (risk_level in ('low', 'medium', 'high')),
  status              text not null default 'onboarding'
                        check (status in ('onboarding', 'active', 'under_review', 'suspended')),
  assigned_broker_id  uuid references public.profiles(id),
  tenant_id           uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Helper: check if the calling user holds a given role ─────
-- security definer so it can read user_roles without bypassing RLS
-- on the calling query itself.
create or replace function public.has_role(_role text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from   public.user_roles ur
    join   public.roles       r  on r.id = ur.role_id
    where  ur.user_id = auth.uid()
    and    r.name     = _role
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────
alter table public.roles      enable row level security;
alter table public.profiles   enable row level security;
alter table public.user_roles enable row level security;
alter table public.clients    enable row level security;

-- roles: all authenticated users can read; only system_admin can mutate
create policy "roles_select"
  on public.roles for select
  to authenticated
  using (true);

create policy "roles_admin_all"
  on public.roles for all
  using (public.has_role('system_admin'));

-- profiles: own row always readable/updatable; system_admin sees all
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_select_admin"
  on public.profiles for select
  using (public.has_role('system_admin'));

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

create policy "profiles_admin_all"
  on public.profiles for all
  using (public.has_role('system_admin'));

-- user_roles: own rows readable; system_admin manages all
create policy "user_roles_select_own"
  on public.user_roles for select
  using (user_id = auth.uid());

create policy "user_roles_select_admin"
  on public.user_roles for select
  using (public.has_role('system_admin'));

create policy "user_roles_admin_all"
  on public.user_roles for all
  using (public.has_role('system_admin'));

-- clients: brokers see only their own; other privileged roles see all
create policy "clients_select"
  on public.clients for select
  using (
    assigned_broker_id = auth.uid()
    or public.has_role('system_admin')
    or public.has_role('aml_officer')
    or public.has_role('senior_manager')
  );

create policy "clients_insert"
  on public.clients for insert
  with check (
    -- broker inserts must self-assign; admins can assign anyone
    assigned_broker_id = auth.uid()
    or public.has_role('system_admin')
  );

create policy "clients_update"
  on public.clients for update
  using (
    (assigned_broker_id = auth.uid() and public.has_role('broker'))
    or public.has_role('system_admin')
    or public.has_role('aml_officer')
  );

create policy "clients_delete"
  on public.clients for delete
  using (public.has_role('system_admin'));

-- ── Auto-create profile on sign-up ───────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
