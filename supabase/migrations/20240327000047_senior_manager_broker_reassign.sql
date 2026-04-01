-- ============================================================
-- AML CRM — senior_manager clients update + broker reassign helper
-- ============================================================

-- Extend clients_update policy to include senior_manager.
-- This allows senior managers to update client records (including
-- broker reassignment) in addition to system_admin and aml_officer.
drop policy if exists "clients_update" on public.clients;

create policy "clients_update"
  on public.clients for update
  to authenticated
  using (
    tenant_id = 'default' and (
      public.has_role('system_admin')
      or public.has_role('aml_officer')
      or public.has_role('senior_manager')
      or (public.has_role('broker') and assigned_broker_id = auth.uid())
    )
  );

-- Helper function: set audit context and update assigned_broker_id in one
-- transaction so the clients_audit trigger captures the correct actor type.
-- Called from the server action; do not call directly from client code.
create or replace function public.reassign_client_broker(
  p_client_id  uuid,
  p_broker_id  uuid,
  p_actor_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.changed_by_type', p_actor_type, true);
  update public.clients
     set assigned_broker_id = p_broker_id,
         updated_at         = now()
   where id = p_client_id;
end;
$$;
