-- Migration 000022: Risk rules, scoring thresholds, and calculate_risk_score function

CREATE TABLE IF NOT EXISTS risk_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_type     text NOT NULL,
  applies_to      text NOT NULL CHECK (applies_to IN ('individual', 'company')),
  field_key       text NOT NULL,
  condition_type  text NOT NULL CHECK (condition_type IN ('equals', 'not_equals', 'is_true', 'is_false', 'contains', 'gte', 'lte', 'not_null')),
  condition_value text,          -- for equals/not_equals/contains; NULL for is_true/is_false/not_null
  points          integer NOT NULL DEFAULT 0,
  is_override     boolean NOT NULL DEFAULT false,  -- if true, sets risk_rating directly
  override_rating text CHECK (override_rating IN ('low', 'medium', 'high', 'critical')),
  description_lt  text,
  description_en  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE risk_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "risk_rules_staff_select" ON risk_rules;
CREATE POLICY "risk_rules_staff_select"
  ON risk_rules FOR SELECT
  USING (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

CREATE TABLE IF NOT EXISTS risk_scoring_thresholds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_type  text NOT NULL,
  applies_to   text NOT NULL CHECK (applies_to IN ('individual', 'company')),
  rating       text NOT NULL CHECK (rating IN ('low', 'medium', 'high', 'critical')),
  min_score    integer NOT NULL,
  max_score    integer,          -- NULL means no upper bound
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_type, applies_to, rating)
);

ALTER TABLE risk_scoring_thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "risk_scoring_thresholds_staff_select" ON risk_scoring_thresholds;
CREATE POLICY "risk_scoring_thresholds_staff_select"
  ON risk_scoring_thresholds FOR SELECT
  USING (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

-- Seed risk_scoring_thresholds for real_estate / individual
INSERT INTO risk_scoring_thresholds (tenant_type, applies_to, rating, min_score, max_score) VALUES
  ('real_estate', 'individual', 'low',      0,   29),
  ('real_estate', 'individual', 'medium',   30,  69),
  ('real_estate', 'individual', 'high',     70,  99),
  ('real_estate', 'individual', 'critical', 100, NULL),
  ('generic',     'individual', 'low',      0,   29),
  ('generic',     'individual', 'medium',   30,  69),
  ('generic',     'individual', 'high',     70,  99),
  ('generic',     'individual', 'critical', 100, NULL)
ON CONFLICT (tenant_type, applies_to, rating) DO NOTHING;

-- Seed risk_rules for real_estate / individual
INSERT INTO risk_rules (tenant_type, applies_to, field_key, condition_type, condition_value, points, is_override, description_lt, description_en) VALUES
  -- PEP is a hard override to HIGH
  ('real_estate','individual','is_pep','is_true',NULL,0,true,'PEP statusas – aukšta rizika','PEP status – high risk'),
  -- High-risk country connections
  ('real_estate','individual','has_high_risk_country_connections','is_true',NULL,40,false,'Ryšiai su didelės rizikos šalimis','Connections to high-risk countries'),
  -- Cash transactions
  ('real_estate','individual','cash_transactions_above_threshold','is_true',NULL,30,false,'Grynųjų sandoriai virš 15 000 EUR','Cash transactions above EUR 15,000'),
  -- Missing source of funds
  ('real_estate','individual','source_of_funds','is_false',NULL,20,false,'Nenurodytas lėšų šaltinis','Source of funds not provided'),
  -- Foreign nationality (non-LT)
  ('real_estate','individual','nationality','not_equals','LT',15,false,'Užsienio pilietybė','Non-Lithuanian nationality'),
  -- Acting through representative
  ('real_estate','individual','is_acting_on_own_behalf','is_false',NULL,10,false,'Veikia per atstovą','Acting through a representative')
ON CONFLICT DO NOTHING;

-- Seed risk_rules for generic / individual
INSERT INTO risk_rules (tenant_type, applies_to, field_key, condition_type, condition_value, points, is_override, description_lt, description_en) VALUES
  ('generic','individual','is_pep','is_true',NULL,0,true,'PEP statusas – aukšta rizika','PEP status – high risk'),
  ('generic','individual','has_high_risk_country_connections','is_true',NULL,40,false,'Ryšiai su didelės rizikos šalimis','Connections to high-risk countries'),
  ('generic','individual','cash_transactions_above_threshold','is_true',NULL,20,false,'Grynųjų sandoriai virš 15 000 EUR','Cash transactions above EUR 15,000'),
  ('generic','individual','source_of_funds','is_false',NULL,15,false,'Nenurodytas lėšų šaltinis','Source of funds not provided')
ON CONFLICT DO NOTHING;

-- Function: calculate_risk_score(p_client_id, p_tenant_type, p_applies_to)
-- Returns: jsonb { score, rating, triggered_rules[] }
CREATE OR REPLACE FUNCTION calculate_risk_score(
  p_client_id  uuid,
  p_tenant_type text,
  p_applies_to  text DEFAULT 'individual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score       integer := 0;
  v_rating      text := 'low';
  v_override    text := NULL;
  v_rules       jsonb := '[]'::jsonb;
  v_rule        record;
  v_field_value text;
  v_triggered   boolean;
  v_threshold   record;
  v_details     record;
BEGIN
  -- Load individual_details for this client
  SELECT * INTO v_details
  FROM individual_details
  WHERE client_id = p_client_id;

  -- Iterate over rules for this tenant_type + applies_to
  FOR v_rule IN
    SELECT * FROM risk_rules
    WHERE tenant_type = p_tenant_type
      AND applies_to  = p_applies_to
    ORDER BY is_override DESC, points DESC
  LOOP
    -- Extract field value as text using dynamic field lookup
    CASE v_rule.field_key
      WHEN 'is_pep'                          THEN v_field_value := v_details.is_pep::text;
      WHEN 'has_high_risk_country_connections' THEN v_field_value := v_details.has_high_risk_country_connections::text;
      WHEN 'cash_transactions_above_threshold' THEN v_field_value := v_details.cash_transactions_above_threshold::text;
      WHEN 'source_of_funds'                 THEN v_field_value := v_details.source_of_funds;
      WHEN 'nationality'                     THEN v_field_value := v_details.nationality;
      WHEN 'is_acting_on_own_behalf'         THEN v_field_value := v_details.is_acting_on_own_behalf::text;
      ELSE v_field_value := NULL;
    END CASE;

    -- Evaluate condition
    v_triggered := false;
    CASE v_rule.condition_type
      WHEN 'is_true'    THEN v_triggered := (v_field_value = 'true');
      WHEN 'is_false'   THEN v_triggered := (v_field_value IS NULL OR v_field_value = 'false' OR v_field_value = '');
      WHEN 'not_null'   THEN v_triggered := (v_field_value IS NOT NULL AND v_field_value <> '');
      WHEN 'equals'     THEN v_triggered := (v_field_value = v_rule.condition_value);
      WHEN 'not_equals' THEN v_triggered := (v_field_value IS NULL OR v_field_value <> v_rule.condition_value);
      WHEN 'contains'   THEN v_triggered := (v_field_value ILIKE '%' || v_rule.condition_value || '%');
      ELSE v_triggered := false;
    END CASE;

    IF v_triggered THEN
      -- Override rules set rating directly
      IF v_rule.is_override AND v_rule.override_rating IS NOT NULL THEN
        v_override := v_rule.override_rating;
      ELSE
        v_score := v_score + v_rule.points;
      END IF;

      -- Append to triggered rules list
      v_rules := v_rules || jsonb_build_object(
        'field_key', v_rule.field_key,
        'condition_type', v_rule.condition_type,
        'points', v_rule.points,
        'is_override', v_rule.is_override,
        'description_en', v_rule.description_en
      );
    END IF;
  END LOOP;

  -- Determine rating from thresholds if no override
  IF v_override IS NOT NULL THEN
    v_rating := v_override;
  ELSE
    SELECT rating INTO v_rating
    FROM risk_scoring_thresholds
    WHERE tenant_type = p_tenant_type
      AND applies_to  = p_applies_to
      AND min_score  <= v_score
      AND (max_score IS NULL OR max_score >= v_score)
    LIMIT 1;

    IF v_rating IS NULL THEN
      -- Fallback: highest threshold
      SELECT rating INTO v_rating
      FROM risk_scoring_thresholds
      WHERE tenant_type = p_tenant_type
        AND applies_to  = p_applies_to
      ORDER BY min_score DESC
      LIMIT 1;
    END IF;

    IF v_rating IS NULL THEN
      v_rating := 'low';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'rating', v_rating,
    'triggered_rules', v_rules
  );
END;
$$;
