-- ============================================================
-- KYC token helpers + extra individual_details columns
-- ============================================================

-- New client-facing AML questionnaire fields
alter table public.individual_details
  add column if not exists has_high_risk_country_connections boolean not null default false,
  add column if not exists high_risk_country_details         text,
  add column if not exists cash_transactions_above_threshold boolean not null default false;

-- ── get_client_by_token ─────────────────────────────────────────────────────
-- Returns full client + individual_details payload for an active, non-expired
-- KYC token. Callable by anon (used by public /kyc/[token] page).
create or replace function public.get_client_by_token(p_token text)
returns json language sql security definer stable
set search_path = public
as $$
  select json_build_object(
    'token_id',   t.id,
    'client_id',  t.client_id,
    'language',   t.language,
    'expires_at', t.expires_at,
    'client', json_build_object(
      'id',             c.id,
      'kyc_status',     c.kyc_status,
      'is_represented', c.is_represented
    ),
    'individual_details', row_to_json(d)
  )
  from public.client_kyc_tokens t
  join public.clients c on c.id = t.client_id
  left join public.individual_details d on d.client_id = t.client_id
  where t.token = p_token
    and t.is_active = true
    and t.expires_at > now()
  limit 1;
$$;

grant execute on function public.get_client_by_token(text) to anon, authenticated;

-- ── client_kyc_tokens anon RLS ──────────────────────────────────────────────
-- Anon needs insert rights to allow token invalidation from server action
-- (server actions run with service role key, so RLS bypassed anyway — this
-- policy exists for documentation and belt-and-suspenders safety)
drop policy if exists "kyc_tokens_staff_select"  on public.client_kyc_tokens;
drop policy if exists "kyc_tokens_anon_insert"   on public.client_kyc_tokens;
drop policy if exists "kyc_tokens_staff_insert"  on public.client_kyc_tokens;
drop policy if exists "kyc_tokens_staff_update"  on public.client_kyc_tokens;

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
