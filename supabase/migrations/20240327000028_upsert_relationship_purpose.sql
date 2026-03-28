-- Migration 000028: Upsert relationship_purpose row for real_estate/individual
-- The UPDATE in 000026 matched 0 rows because the original seed used
-- field_key='purpose_of_transaction'. This INSERT ensures the row exists.

INSERT INTO questionnaire_templates (
  tenant_type, applies_to, field_key,
  field_label_lt, field_label_en, field_type,
  options_lt, options_en,
  is_required, section, sort_order, maps_to_column
) VALUES (
  'real_estate', 'individual', 'relationship_purpose',
  'Dalykinių santykių tikslas', 'Purpose of business relationship',
  'select',
  '[
    {"value":"sale","label_lt":"Nekilnojamojo turto pardavimas","label_en":"Sale of real estate"},
    {"value":"purchase","label_lt":"Nekilnojamojo turto pirkimas","label_en":"Purchase of real estate"},
    {"value":"rental","label_lt":"Nekilnojamojo turto nuoma","label_en":"Rental of real estate"}
  ]'::jsonb,
  NULL,
  true, 'relationship_purpose', 35, 'purpose_of_relationship'
)
ON CONFLICT (tenant_type, applies_to, field_key) DO UPDATE
  SET options_lt     = EXCLUDED.options_lt,
      options_en     = EXCLUDED.options_en,
      field_label_lt = EXCLUDED.field_label_lt,
      field_label_en = EXCLUDED.field_label_en,
      section        = EXCLUDED.section,
      sort_order     = EXCLUDED.sort_order,
      maps_to_column = EXCLUDED.maps_to_column;

-- Also upsert relationship_frequency while we're here (same issue — it may not exist)
INSERT INTO questionnaire_templates (
  tenant_type, applies_to, field_key,
  field_label_lt, field_label_en, field_type,
  options_lt, options_en,
  is_required, section, sort_order, maps_to_column
) VALUES (
  'real_estate', 'individual', 'relationship_frequency',
  'Sandorių dažnumas', 'Transaction frequency',
  'select',
  '[
    {"value":"one_off","label_lt":"Vienkartinis sandoris","label_en":"Single transaction"},
    {"value":"ongoing","label_lt":"Nuolatiniai santykiai","label_en":"Ongoing relationship"}
  ]'::jsonb,
  NULL,
  true, 'relationship_purpose', 37, 'relationship_frequency'
)
ON CONFLICT (tenant_type, applies_to, field_key) DO UPDATE
  SET options_lt     = EXCLUDED.options_lt,
      options_en     = EXCLUDED.options_en,
      field_label_lt = EXCLUDED.field_label_lt,
      field_label_en = EXCLUDED.field_label_en,
      section        = EXCLUDED.section,
      sort_order     = EXCLUDED.sort_order,
      maps_to_column = EXCLUDED.maps_to_column;
