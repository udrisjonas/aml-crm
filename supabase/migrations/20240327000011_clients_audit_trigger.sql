-- ============================================================
-- AML CRM — Clients Audit Trigger
-- ============================================================
-- Fires on UPDATE to clients, inserting one row per changed field
-- into client_field_changes.
--
-- Caller sets the session variable before executing the update:
--   SET LOCAL app.changed_by_type = 'broker';   -- within a transaction
--   SELECT set_config('app.changed_by_type', 'aml_officer', true);  -- session-level
-- ============================================================

create or replace function public.clients_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_by   uuid;
begin
  -- Resolve who made the change
  v_type := coalesce(
    nullif(current_setting('app.changed_by_type', true), ''),
    'system'
  );

  begin
    v_by := auth.uid();
  exception when others then
    v_by := null;
  end;

  -- ── Track each meaningful column ────────────────────────────────────

  if old.kyc_status is distinct from new.kyc_status then
    insert into public.client_field_changes
      (client_id, field_name, old_value, new_value, changed_by_type, changed_by)
    values (new.id, 'kyc_status', old.kyc_status, new.kyc_status, v_type, v_by);
  end if;

  if old.edd_status is distinct from new.edd_status then
    insert into public.client_field_changes
      (client_id, field_name, old_value, new_value, changed_by_type, changed_by)
    values (new.id, 'edd_status', old.edd_status, new.edd_status, v_type, v_by);
  end if;

  if old.risk_rating is distinct from new.risk_rating then
    insert into public.client_field_changes
      (client_id, field_name, old_value, new_value, changed_by_type, changed_by)
    values (new.id, 'risk_rating', old.risk_rating, new.risk_rating, v_type, v_by);
  end if;

  if old.client_status is distinct from new.client_status then
    insert into public.client_field_changes
      (client_id, field_name, old_value, new_value, changed_by_type, changed_by)
    values (new.id, 'client_status', old.client_status, new.client_status, v_type, v_by);
  end if;

  if old.assigned_broker_id is distinct from new.assigned_broker_id then
    insert into public.client_field_changes
      (client_id, field_name, old_value, new_value, changed_by_type, changed_by)
    values (
      new.id, 'assigned_broker_id',
      old.assigned_broker_id::text,
      new.assigned_broker_id::text,
      v_type, v_by
    );
  end if;

  if old.is_represented is distinct from new.is_represented then
    insert into public.client_field_changes
      (client_id, field_name, old_value, new_value, changed_by_type, changed_by)
    values (
      new.id, 'is_represented',
      old.is_represented::text,
      new.is_represented::text,
      v_type, v_by
    );
  end if;

  if old.notes is distinct from new.notes then
    insert into public.client_field_changes
      (client_id, field_name, old_value, new_value, changed_by_type, changed_by)
    values (new.id, 'notes', old.notes, new.notes, v_type, v_by);
  end if;

  if old.last_reviewed_by is distinct from new.last_reviewed_by then
    insert into public.client_field_changes
      (client_id, field_name, old_value, new_value, changed_by_type, changed_by)
    values (
      new.id, 'last_reviewed_by',
      old.last_reviewed_by::text,
      new.last_reviewed_by::text,
      v_type, v_by
    );
  end if;

  return new;
end;
$$;

drop trigger if exists clients_audit on public.clients;

create trigger clients_audit
  after update on public.clients
  for each row
  execute function public.clients_audit_fn();
