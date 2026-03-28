-- Migration 000021: Questionnaire templates

CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_type     text NOT NULL,
  applies_to      text NOT NULL CHECK (applies_to IN ('individual', 'company')),
  field_key       text NOT NULL,
  field_label_lt  text NOT NULL,
  field_label_en  text NOT NULL,
  field_type      text NOT NULL CHECK (field_type IN ('text', 'textarea', 'boolean', 'select', 'date', 'number', 'file')),
  options_lt      jsonb,         -- for select fields: array of option labels in LT
  options_en      jsonb,         -- for select fields: array of option labels in EN
  maps_to_column  text,          -- column in individual_details or company_details if direct mapping
  is_required     boolean NOT NULL DEFAULT false,
  section         text NOT NULL, -- logical grouping
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_type, applies_to, field_key)
);

ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "questionnaire_templates_staff_select" ON questionnaire_templates;
CREATE POLICY "questionnaire_templates_staff_select"
  ON questionnaire_templates FOR SELECT
  USING (public.has_role('system_admin') OR public.has_role('aml_officer') OR public.has_role('senior_manager') OR public.has_role('broker'));

-- Allow anon/public access so KYC public form can read template
DROP POLICY IF EXISTS "questionnaire_templates_public_select" ON questionnaire_templates;
CREATE POLICY "questionnaire_templates_public_select"
  ON questionnaire_templates FOR SELECT
  USING (true);

-- Seed: real_estate / individual (19 fields)
INSERT INTO questionnaire_templates
  (tenant_type, applies_to, field_key, field_label_lt, field_label_en, field_type, is_required, section, sort_order, maps_to_column)
VALUES
  ('real_estate','individual','first_name','Vardas','First name','text',true,'personal_info',10,'first_name'),
  ('real_estate','individual','last_name','Pavardė','Last name','text',true,'personal_info',20,'last_name'),
  ('real_estate','individual','date_of_birth','Gimimo data','Date of birth','date',true,'personal_info',30,'date_of_birth'),
  ('real_estate','individual','nationality','Pilietybė','Nationality','text',true,'personal_info',40,'nationality'),
  ('real_estate','individual','personal_code','Asmens kodas','Personal identification code','text',false,'personal_info',50,'personal_code'),
  ('real_estate','individual','id_document_type','Dokumento tipas','ID document type','select',true,'personal_info',60,'id_document_type'),
  ('real_estate','individual','id_document_number','Dokumento numeris','Document number','text',true,'personal_info',70,'id_document_number'),
  ('real_estate','individual','id_expiry_date','Dokumento galiojimo pabaiga','Document expiry date','date',false,'personal_info',80,'id_expiry_date'),
  ('real_estate','individual','address','Gyvenamoji vieta','Residential address','textarea',true,'personal_info',90,'address'),
  ('real_estate','individual','is_pep','Politiškai pažeidžiamas asmuo?','Politically exposed person?','boolean',true,'pep',100,'is_pep'),
  ('real_estate','individual','pep_details','PEP detalės','PEP details','textarea',false,'pep',110,'pep_details'),
  ('real_estate','individual','is_acting_on_own_behalf','Veikia savo vardu?','Acting on own behalf?','boolean',true,'representation',120,'is_acting_on_own_behalf'),
  ('real_estate','individual','representative_name','Atstovo vardas pavardė','Representative full name','text',false,'representation',130,'representative_name'),
  ('real_estate','individual','has_high_risk_country_connections','Ryšiai su didelės rizikos šalimis?','Connections to high-risk countries?','boolean',true,'high_risk_countries',140,'has_high_risk_country_connections'),
  ('real_estate','individual','high_risk_country_details','Didelės rizikos šalių detalės','High-risk country details','textarea',false,'high_risk_countries',150,'high_risk_country_details'),
  ('real_estate','individual','source_of_funds','Lėšų kilmė','Source of funds','textarea',true,'source_of_wealth',160,'source_of_funds'),
  ('real_estate','individual','source_of_wealth','Turto kilmė','Source of wealth','textarea',false,'source_of_wealth',170,'source_of_wealth'),
  ('real_estate','individual','purpose_of_transaction','Sandorio tikslas','Purpose of transaction','textarea',true,'purpose',180,'purpose_of_transaction'),
  ('real_estate','individual','cash_transactions_above_threshold','Grynųjų sandoriai virš 15 000 EUR?','Cash transactions above EUR 15,000?','boolean',false,'cash_transactions',190,'cash_transactions_above_threshold')
ON CONFLICT (tenant_type, applies_to, field_key) DO NOTHING;

-- Seed: real_estate / individual select options
UPDATE questionnaire_templates SET
  options_lt = '["Pasas","Asmens tapatybės kortelė","Leidimas gyventi"]'::jsonb,
  options_en = '["Passport","National ID card","Residence permit"]'::jsonb
WHERE tenant_type = 'real_estate' AND applies_to = 'individual' AND field_key = 'id_document_type';

-- Seed: generic / individual (19 fields — mirrors real_estate with relaxed required flags)
INSERT INTO questionnaire_templates
  (tenant_type, applies_to, field_key, field_label_lt, field_label_en, field_type, is_required, section, sort_order, maps_to_column)
VALUES
  ('generic','individual','first_name','Vardas','First name','text',true,'personal_info',10,'first_name'),
  ('generic','individual','last_name','Pavardė','Last name','text',true,'personal_info',20,'last_name'),
  ('generic','individual','date_of_birth','Gimimo data','Date of birth','date',false,'personal_info',30,'date_of_birth'),
  ('generic','individual','nationality','Pilietybė','Nationality','text',false,'personal_info',40,'nationality'),
  ('generic','individual','personal_code','Asmens kodas','Personal identification code','text',false,'personal_info',50,'personal_code'),
  ('generic','individual','id_document_type','Dokumento tipas','ID document type','select',false,'personal_info',60,'id_document_type'),
  ('generic','individual','id_document_number','Dokumento numeris','Document number','text',false,'personal_info',70,'id_document_number'),
  ('generic','individual','address','Gyvenamoji vieta','Residential address','textarea',false,'personal_info',90,'address'),
  ('generic','individual','is_pep','Politiškai pažeidžiamas asmuo?','Politically exposed person?','boolean',true,'pep',100,'is_pep'),
  ('generic','individual','pep_details','PEP detalės','PEP details','textarea',false,'pep',110,'pep_details'),
  ('generic','individual','is_acting_on_own_behalf','Veikia savo vardu?','Acting on own behalf?','boolean',false,'representation',120,'is_acting_on_own_behalf'),
  ('generic','individual','has_high_risk_country_connections','Ryšiai su didelės rizikos šalimis?','Connections to high-risk countries?','boolean',false,'high_risk_countries',140,'has_high_risk_country_connections'),
  ('generic','individual','source_of_funds','Lėšų kilmė','Source of funds','textarea',true,'source_of_wealth',160,'source_of_funds'),
  ('generic','individual','source_of_wealth','Turto kilmė','Source of wealth','textarea',false,'source_of_wealth',170,'source_of_wealth'),
  ('generic','individual','purpose_of_transaction','Sandorio tikslas','Purpose of transaction','textarea',false,'purpose',180,'purpose_of_transaction'),
  ('generic','individual','cash_transactions_above_threshold','Grynųjų sandoriai virš 15 000 EUR?','Cash transactions above EUR 15,000?','boolean',false,'cash_transactions',190,'cash_transactions_above_threshold')
ON CONFLICT (tenant_type, applies_to, field_key) DO NOTHING;

UPDATE questionnaire_templates SET
  options_lt = '["Pasas","Asmens tapatybės kortelė","Leidimas gyventi"]'::jsonb,
  options_en = '["Passport","National ID card","Residence permit"]'::jsonb
WHERE tenant_type = 'generic' AND applies_to = 'individual' AND field_key = 'id_document_type';
