import { createAdminClient } from '@/lib/supabase/admin';
import type { QuestionnaireField, TenantType, AppliesTo } from '@/types/questionnaire';

// Simple in-memory cache keyed by "tenantType:appliesTo"
const cache = new Map<string, { fields: QuestionnaireField[]; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getQuestionnaireTemplate(
  tenantType: TenantType,
  appliesTo: AppliesTo
): Promise<QuestionnaireField[]> {
  const cacheKey = `${tenantType}:${appliesTo}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.fields;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('questionnaire_templates')
    .select('*')
    .eq('tenant_type', tenantType)
    .eq('applies_to', appliesTo)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load questionnaire template: ${error.message}`);
  }

  const fields = (data ?? []) as QuestionnaireField[];
  cache.set(cacheKey, { fields, fetchedAt: Date.now() });
  return fields;
}

/** Evict a specific entry from the cache (e.g. after admin edits a template). */
export function invalidateTemplateCache(tenantType: TenantType, appliesTo: AppliesTo): void {
  cache.delete(`${tenantType}:${appliesTo}`);
}
