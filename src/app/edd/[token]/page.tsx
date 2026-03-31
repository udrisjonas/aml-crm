import { createAdminClient } from "@/lib/supabase/admin";
import EddForm from "./EddForm";

export const dynamic = "force-dynamic";

interface EddPageProps {
  params: { token: string };
}

export default async function EddPage({ params }: EddPageProps) {
  const admin = createAdminClient();

  const { data: edd } = await admin
    .from("edd_questionnaires")
    .select(`
      id, status, client_id, token_language,
      clients!inner(
        individual_details(first_name, last_name, purpose_of_relationship)
      )
    `)
    .eq("token", params.token)
    .maybeSingle();

  if (!edd) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link not found</h1>
          <p className="text-slate-500 text-sm">This link is invalid or has expired. Please contact your broker for a new link.</p>
          <hr className="my-6 border-slate-100" />
          <p className="text-xs text-slate-400">Ši nuoroda negalioja arba baigė galioti. Kreipkitės į savo maklerį dėl naujos nuorodos.</p>
        </div>
      </div>
    );
  }

  if (edd.status === "completed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Questionnaire completed</h1>
          <p className="text-slate-500 text-sm">This EDD process has been completed. Thank you — our team will be in touch.</p>
          <hr className="my-6 border-slate-100" />
          <p className="text-xs text-slate-400">Šis EDD procesas baigtas. Ačiū — mūsų komanda susisieks su jumis.</p>
        </div>
      </div>
    );
  }

  if (edd.status !== "sent_to_client" && edd.status !== "triggered" && edd.status !== "client_completed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link unavailable</h1>
          <p className="text-slate-500 text-sm">This link is no longer active. Please contact your broker for assistance.</p>
          <hr className="my-6 border-slate-100" />
          <p className="text-xs text-slate-400">Ši nuoroda nebegalioja. Kreipkitės į savo maklerį pagalbos.</p>
        </div>
      </div>
    );
  }

  // Extract client data
  const clientsData = (edd as { clients: unknown }).clients;
  const clientRow   = Array.isArray(clientsData) ? clientsData[0] : clientsData;
  const detailsRaw  = (clientRow as { individual_details?: unknown })?.individual_details;
  const details     = Array.isArray(detailsRaw) ? detailsRaw[0] : detailsRaw;
  const firstName   = (details as { first_name?: string })?.first_name ?? "";
  const lastName    = (details as { last_name?: string })?.last_name ?? "";
  const purpose     = (details as { purpose_of_relationship?: string })?.purpose_of_relationship ?? null;

  // Fetch existing responses (for pre-fill on resend)
  const { data: existingResponses } = await admin
    .from("edd_responses")
    .select("question_key, answer")
    .eq("edd_questionnaire_id", edd.id);

  const initialAnswers: Record<string, string> = {};
  for (const r of existingResponses ?? []) {
    if (r.answer != null) initialAnswers[r.question_key] = r.answer;
  }

  // Fetch document requests so client knows what to upload
  const { data: documentRequests } = await admin
    .from("edd_document_requests")
    .select("id, document_name, description, is_required, sort_order")
    .eq("edd_questionnaire_id", edd.id)
    .order("sort_order", { ascending: true });

  const alreadySubmitted = edd.status === "client_completed";
  const language = ((edd as { token_language?: unknown }).token_language === "en" ? "en" : "lt") as "lt" | "en";

  return (
    <EddForm
      token={params.token}
      clientName={`${firstName} ${lastName}`.trim() || "Client"}
      purposeOfRelationship={purpose}
      initialAnswers={initialAnswers}
      documentRequests={(documentRequests ?? []) as {
        id: string; document_name: string; description: string | null; is_required: boolean; sort_order: number;
      }[]}
      alreadySubmitted={alreadySubmitted}
      language={language}
    />
  );
}
