-- Migration 000023: Questionnaire responses table + RPC wrapper

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id     uuid NOT NULL REFERENCES questionnaire_templates(id) ON DELETE RESTRICT,
  field_key       text NOT NULL,
  response_value  text,
  responded_at    timestamptz NOT NULL DEFAULT now(),
  responded_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  responded_by_type text NOT NULL DEFAULT 'staff' CHECK (responded_by_type IN ('staff', 'client', 'system')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_client ON questionnaire_responses(client_id);

ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questionnaire_responses_staff_select" ON questionnaire_responses;
CREATE POLICY "questionnaire_responses_staff_select"
  ON questionnaire_responses FOR SELECT
  USING (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

DROP POLICY IF EXISTS "questionnaire_responses_staff_insert" ON questionnaire_responses;
CREATE POLICY "questionnaire_responses_staff_insert"
  ON questionnaire_responses FOR INSERT
  WITH CHECK (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

DROP POLICY IF EXISTS "questionnaire_responses_staff_update" ON questionnaire_responses;
CREATE POLICY "questionnaire_responses_staff_update"
  ON questionnaire_responses FOR UPDATE
  USING (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

-- RPC: calculate_client_risk_score(p_client_id)
-- Looks up company's tenant_type then delegates to calculate_risk_score()
CREATE OR REPLACE FUNCTION calculate_client_risk_score(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_type text;
  v_tenant_id   text;
BEGIN
  -- Get tenant_id from client
  SELECT tenant_id INTO v_tenant_id
  FROM clients WHERE id = p_client_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;

  -- Get tenant_type from company_settings
  SELECT tenant_type INTO v_tenant_type
  FROM company_settings WHERE tenant_id = v_tenant_id;

  -- Default to generic if not set
  IF v_tenant_type IS NULL THEN
    v_tenant_type := 'generic';
  END IF;

  RETURN calculate_risk_score(p_client_id, v_tenant_type, 'individual');
END;
$$;
