-- Migration 000024: Periodic review schedule

CREATE TABLE IF NOT EXISTS periodic_review_schedule (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id         text NOT NULL,
  due_date          date NOT NULL,
  review_type       text NOT NULL DEFAULT 'periodic' CHECK (review_type IN ('periodic', 'triggered', 'initial')),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  assigned_to       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at      timestamptz,
  completed_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_periodic_review_client   ON periodic_review_schedule(client_id);
CREATE INDEX IF NOT EXISTS idx_periodic_review_tenant   ON periodic_review_schedule(tenant_id);
CREATE INDEX IF NOT EXISTS idx_periodic_review_due_date ON periodic_review_schedule(due_date);
CREATE INDEX IF NOT EXISTS idx_periodic_review_status   ON periodic_review_schedule(status);

ALTER TABLE periodic_review_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "periodic_review_staff_select" ON periodic_review_schedule;
CREATE POLICY "periodic_review_staff_select"
  ON periodic_review_schedule FOR SELECT
  USING (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

DROP POLICY IF EXISTS "periodic_review_staff_insert" ON periodic_review_schedule;
CREATE POLICY "periodic_review_staff_insert"
  ON periodic_review_schedule FOR INSERT
  WITH CHECK (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

DROP POLICY IF EXISTS "periodic_review_staff_update" ON periodic_review_schedule;
CREATE POLICY "periodic_review_staff_update"
  ON periodic_review_schedule FOR UPDATE
  USING (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

-- Function: schedule_next_review(p_client_id)
-- Reads tenant_type defaults for review_cycle_months and inserts next due review
CREATE OR REPLACE FUNCTION schedule_next_review(
  p_client_id    uuid,
  p_review_type  text DEFAULT 'periodic',
  p_assigned_to  uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id       text;
  v_tenant_type     text;
  v_cycle_months    integer := 12;
  v_due_date        date;
  v_new_id          uuid;
  v_cycle_setting   jsonb;
BEGIN
  -- Get tenant_id and tenant_type from client + company_settings
  SELECT c.tenant_id, cs.tenant_type
  INTO v_tenant_id, v_tenant_type
  FROM clients c
  LEFT JOIN company_settings cs ON cs.tenant_id = c.tenant_id
  WHERE c.id = p_client_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;

  IF v_tenant_type IS NULL THEN
    v_tenant_type := 'generic';
  END IF;

  -- Look up review cycle months from tenant_type_defaults
  SELECT setting_value INTO v_cycle_setting
  FROM tenant_type_defaults
  WHERE tenant_type = v_tenant_type
    AND setting_key  = 'review_cycle_months';

  IF v_cycle_setting IS NOT NULL THEN
    v_cycle_months := (v_cycle_setting #>> '{}')::integer;
  END IF;

  v_due_date := CURRENT_DATE + (v_cycle_months || ' months')::interval;

  -- Cancel any existing pending reviews for this client
  UPDATE periodic_review_schedule
  SET status = 'cancelled', updated_at = now()
  WHERE client_id = p_client_id
    AND status IN ('pending');

  -- Insert new review
  INSERT INTO periodic_review_schedule
    (client_id, tenant_id, due_date, review_type, status, assigned_to)
  VALUES
    (p_client_id, v_tenant_id, v_due_date, p_review_type, 'pending', p_assigned_to)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Trigger: auto-schedule review when client kyc_status changes to 'verified'
CREATE OR REPLACE FUNCTION trigger_schedule_review_on_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.kyc_status = 'verified' AND (OLD.kyc_status IS DISTINCT FROM 'verified') THEN
    PERFORM schedule_next_review(NEW.id, 'periodic', NEW.assigned_broker_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schedule_review_on_verified ON clients;
CREATE TRIGGER schedule_review_on_verified
  AFTER UPDATE OF kyc_status ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_schedule_review_on_verified();
