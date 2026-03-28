-- Migration 000026: Update relationship_purpose section options for real_estate tenant
-- Run this in Supabase SQL Editor

-- 1. Update relationship_purpose options
UPDATE questionnaire_templates
SET options_lt = '[
  {"value":"sale","label_lt":"Nekilnojamojo turto pardavimas","label_en":"Sale of real estate"},
  {"value":"purchase","label_lt":"Nekilnojamojo turto pirkimas","label_en":"Purchase of real estate"},
  {"value":"rental","label_lt":"Nekilnojamojo turto nuoma","label_en":"Rental of real estate"}
]'::jsonb,
options_en = NULL
WHERE tenant_type = 'real_estate' AND field_key = 'relationship_purpose';

-- 2. Update relationship_frequency options
UPDATE questionnaire_templates
SET options_lt = '[
  {"value":"one_off","label_lt":"Vienkartinis sandoris","label_en":"Single transaction"},
  {"value":"ongoing","label_lt":"Nuolatiniai santykiai","label_en":"Ongoing relationship"}
]'::jsonb,
options_en = NULL
WHERE tenant_type = 'real_estate' AND field_key = 'relationship_frequency';

-- 3. Delete existing relationship_use field (applies to both individual and company)
DELETE FROM questionnaire_templates
WHERE tenant_type = 'real_estate' AND field_key = 'relationship_use';

-- 4. Insert relationship_use_individual (for individual clients)
INSERT INTO questionnaire_templates (
  tenant_type, applies_to, field_key,
  field_label_lt, field_label_en, field_type,
  options_lt, options_en,
  is_required, section, sort_order, maps_to_column
) VALUES (
  'real_estate', 'individual', 'relationship_use_individual',
  'Naudojimo tikslas (fizinis asmuo)', 'Purpose of use (individual)',
  'select',
  '[{"value":"personal","label_lt":"Asmeniniam naudojimui","label_en":"For personal use"},{"value":"commercial","label_lt":"Komerciniam naudojimui","label_en":"For commercial use"}]'::jsonb,
  NULL,
  true, 'relationship_purpose', 39, 'relationship_use'
)
ON CONFLICT (tenant_type, applies_to, field_key) DO UPDATE
  SET options_lt      = EXCLUDED.options_lt,
      options_en      = EXCLUDED.options_en,
      field_label_lt  = EXCLUDED.field_label_lt,
      field_label_en  = EXCLUDED.field_label_en,
      sort_order      = EXCLUDED.sort_order;

-- 5. Insert relationship_use_company (for legal entity / company clients)
-- Note: applies_to='company' is used (the table constraint uses 'company' not 'legal_entity')
INSERT INTO questionnaire_templates (
  tenant_type, applies_to, field_key,
  field_label_lt, field_label_en, field_type,
  options_lt, options_en,
  is_required, section, sort_order, maps_to_column
) VALUES (
  'real_estate', 'company', 'relationship_use_legal_entity',
  'Naudojimo tikslas (juridinis asmuo)', 'Purpose of use (legal entity)',
  'select',
  '[{"value":"own_use","label_lt":"Nuosavoms reikmėms","label_en":"For own use"},{"value":"resale","label_lt":"Perparduoti","label_en":"For resale"}]'::jsonb,
  NULL,
  true, 'relationship_purpose', 40, 'relationship_use'
)
ON CONFLICT (tenant_type, applies_to, field_key) DO UPDATE
  SET options_lt      = EXCLUDED.options_lt,
      options_en      = EXCLUDED.options_en,
      field_label_lt  = EXCLUDED.field_label_lt,
      field_label_en  = EXCLUDED.field_label_en,
      sort_order      = EXCLUDED.sort_order;
