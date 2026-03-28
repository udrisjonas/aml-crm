export type TenantType =
  | 'real_estate'
  | 'financial_institution'
  | 'payment_institution'
  | 'crypto'
  | 'notary'
  | 'generic';

export type AppliesTo = 'individual' | 'company';

export type FieldType = 'text' | 'textarea' | 'boolean' | 'select' | 'date' | 'number' | 'file';

export type ConditionType =
  | 'equals'
  | 'not_equals'
  | 'is_true'
  | 'is_false'
  | 'contains'
  | 'gte'
  | 'lte'
  | 'not_null';

export type RiskRating = 'low' | 'medium' | 'high' | 'critical';

export interface QuestionnaireField {
  id: string;
  tenant_type: TenantType;
  applies_to: AppliesTo;
  field_key: string;
  field_label_lt: string;
  field_label_en: string;
  field_type: FieldType;
  options_lt: string[] | null;
  options_en: string[] | null;
  maps_to_column: string | null;
  is_required: boolean;
  section: string;
  sort_order: number;
}

export interface QuestionnaireResponse {
  id: string;
  client_id: string;
  template_id: string;
  field_key: string;
  response_value: string | null;
  responded_at: string;
  responded_by: string | null;
  responded_by_type: 'staff' | 'client' | 'system';
}

export interface RiskRule {
  id: string;
  tenant_type: TenantType;
  applies_to: AppliesTo;
  field_key: string;
  condition_type: ConditionType;
  condition_value: string | null;
  points: number;
  is_override: boolean;
  override_rating: RiskRating | null;
  description_lt: string | null;
  description_en: string | null;
}

export interface RiskScoringThreshold {
  id: string;
  tenant_type: TenantType;
  applies_to: AppliesTo;
  rating: RiskRating;
  min_score: number;
  max_score: number | null;
}

export interface TenantTypeDefault {
  id: string;
  tenant_type: TenantType;
  setting_key: string;
  setting_value: unknown;
  description: string | null;
}

export interface RiskScoreResult {
  score: number;
  rating: RiskRating;
  triggered_rules: Array<{
    field_key: string;
    condition_type: ConditionType;
    points: number;
    is_override: boolean;
    description_en: string | null;
  }>;
}
