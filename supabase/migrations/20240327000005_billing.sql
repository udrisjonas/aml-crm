-- ============================================================
-- AML CRM — Billing & Subscription
-- ============================================================

-- ── Plans ─────────────────────────────────────────────────────
create table public.plans (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null unique,
  monthly_fee      numeric(10,2) not null,
  included_clients integer     not null,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now()
);

insert into public.plans (name, monthly_fee, included_clients) values
  ('solo',         29.00,  10),
  ('standard',     79.00,  40),
  ('professional', 179.00, 100);

-- ── Tenant Subscriptions ──────────────────────────────────────
create table public.tenant_subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  tenant_id              text        not null unique,
  plan_id                uuid        references public.plans(id),
  status                 text        not null default 'trial'
                           check (status in ('trial', 'active', 'cancelled', 'locked')),
  trial_start            timestamptz,
  trial_end              timestamptz,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now()
);

-- ── Billing Events ────────────────────────────────────────────
create table public.billing_events (
  id           uuid          primary key default gen_random_uuid(),
  tenant_id    text          not null,
  client_id    uuid,
  event_type   text          not null
                 check (event_type in (
                   'new_individual_low', 'new_individual_medium', 'new_individual_high',
                   'new_entity_low_medium', 'new_entity_high',
                   'edd_triggered',
                   'review_low', 'review_medium', 'review_high',
                   'archive_storage'
                 )),
  amount       numeric(10,2) not null,
  vat_rate     numeric(5,4)  not null,
  vat_amount   numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  description  text,
  created_at   timestamptz   not null default now()
);

-- ── Archive Snapshots ─────────────────────────────────────────
create table public.archive_snapshots (
  id                    uuid    primary key default gen_random_uuid(),
  tenant_id             text    not null,
  archived_client_count integer not null,
  snapshot_date         date    not null,
  fee_applicable        boolean not null default false,
  created_at            timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.plans              enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.billing_events     enable row level security;
alter table public.archive_snapshots  enable row level security;

-- All authenticated users can read plans (needed for plan selector)
create policy "plans_select"
  on public.plans for select
  to authenticated
  using (true);

-- Subscriptions: system_admin + senior_manager read; system_admin writes
create policy "subscriptions_read"
  on public.tenant_subscriptions for select
  using (public.has_role('system_admin') or public.has_role('senior_manager'));

create policy "subscriptions_admin_write"
  on public.tenant_subscriptions for all
  using (public.has_role('system_admin'));

-- Billing events: read by billing roles; written by system_admin only
create policy "billing_events_read"
  on public.billing_events for select
  using (public.has_role('system_admin') or public.has_role('senior_manager'));

create policy "billing_events_admin_write"
  on public.billing_events for all
  using (public.has_role('system_admin'));

-- Archive snapshots: same access pattern
create policy "archive_snapshots_read"
  on public.archive_snapshots for select
  using (public.has_role('system_admin') or public.has_role('senior_manager'));

create policy "archive_snapshots_admin_write"
  on public.archive_snapshots for all
  using (public.has_role('system_admin'));
