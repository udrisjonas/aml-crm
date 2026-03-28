import { createAdminClient } from '@/lib/supabase/admin';
import type { RiskScoreResult } from '@/types/questionnaire';

/**
 * Calls the `calculate_client_risk_score` Postgres RPC function.
 * Resolves tenant_type from the client's company_settings automatically.
 */
export async function calculateClientRisk(clientId: string): Promise<RiskScoreResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('calculate_client_risk_score', {
    p_client_id: clientId,
  });

  if (error) {
    throw new Error(`Risk calculation failed: ${error.message}`);
  }

  return data as RiskScoreResult;
}
