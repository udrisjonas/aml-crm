"use client";

import { useState, useTransition } from "react";
import {
  submitKycFormAction,
  getClientSignedUploadUrlAction,
  recordClientDocumentAction,
} from "@/app/actions/clients";
import type { RelationshipOption } from "./page";

// ── i18n ──────────────────────────────────────────────────────────────────────

const T = {
  lt: {
    title: "KYC anketa",
    subtitle: "Pildykite visus laukus. Jūsų informacija yra saugoma ir naudojama tik pinigų plovimo prevencijos tikslais.",
    expires: "Anketa galioja iki",
    sections: {
      personal: "Asmeninė informacija",
      representation: "Atstovavimas",
      ownBehalf: "Veikimas savo vardu",
      pep: "PEP statusas",
      highRisk: "Ryšys su didelės rizikos šalimis",
      cash: "Grynųjų pinigų operacijos",
      source: "Pajamų šaltinis ir turto kilmė",
      purpose: "Santykių tikslas",
      documents: "Dokumentai",
      declaration: "Deklaracija",
    },
    fields: {
      first_name: "Vardas",
      last_name: "Pavardė",
      nationality: "Pilietybė",
      country_of_residence: "Gyvenamoji šalis",
      residential_address: "Gyvenamoji vieta (adresas)",
      correspondence_address: "Korespondencijos adresas",
      phone: "Telefono numeris",
      email: "El. pašto adresas",
      is_represented: "Klientą atstovauja kitas asmuo",
      acting_on_own_behalf_yes: "Taip, veikiu savo vardu ir dėl savęs",
      acting_on_own_behalf_no: "Ne, veikiu kito asmens vardu arba kito asmens naudai",
      beneficial_owner_info: "Nurodyti tikrąjį naudos gavėją",
      pep_yes: "Taip, esu politiškai paveiktas asmuo",
      pep_no: "Ne, nesu politiškai paveiktas asmuo",
      pep_self_declared: "Patvirtinu šią informaciją",
      pep_details: "PEP detalės (pareigos, institucija, šalis)",
      high_risk_yes: "Taip, turiu ryšį su didelės rizikos šalimis",
      high_risk_no: "Ne, neturiu ryšio su didelės rizikos šalimis",
      high_risk_details: "Aprašykite ryšį",
      cash_yes: "Taip, reguliariai atlieku/gaunu grynųjų pinigų operacijas, viršijančias 10 000 EUR",
      cash_no: "Ne",
      occupation: "Užsiėmimas / profesija",
      source_of_funds: "Lėšų šaltinis",
      source_of_wealth: "Turto kilmės šaltinis",
      purpose_of_relationship: "Santykių tikslas ir pobūdis",
    },
    docSection: {
      title: "Dokumentų įkėlimas",
      subtitle: "Įkelkite savo asmens tapatybę patvirtinančius dokumentus.",
      photo: "Nuotrauka",
      passport: "Pasas / Asmens tapatybės kortelė",
      proofOfAddress: "Gyvenamosios vietos įrodymas",
      upload: "Įkelti",
      uploading: "Įkeliama…",
      uploaded: "Įkelta",
      optional: "(neprivaloma)",
    },
    declaration: `Patvirtinu, kad anketoje nurodyta informacija yra teisinga ir išsami. \
Esu informuotas(-a), kad pagal Lietuvos Respublikos Pinigų plovimo ir teroristų \
finansavimo prevencijos įstatymą finansų įstaiga privalo nustatyti ir tikrinti \
kliento tapatybę bei rinkti šioje anketoje nurodytus duomenis. \
Įsipareigoju nedelsdamas(-a) informuoti apie bet kokius pasikeitimus.`,
    declarationCheck: "Patvirtinu, kad aukščiau pateikta informacija yra teisinga",
    submit: "Pateikti anketą",
    submitting: "Pateikiama…",
    successTitle: "Ačiū! Anketa pateikta.",
    successBody: "Jūsų informacija sėkmingai išsaugota. Jūsų makleris netrukus su jumis susisieks.",
  },
  en: {
    title: "KYC Questionnaire",
    subtitle: "Please complete all fields. Your information is stored securely and used solely for anti-money laundering compliance purposes.",
    expires: "Form valid until",
    sections: {
      personal: "Personal information",
      representation: "Representation",
      ownBehalf: "Acting on own behalf",
      pep: "PEP status",
      highRisk: "High-risk country connections",
      cash: "Cash transactions",
      source: "Source of income and wealth",
      purpose: "Purpose of relationship",
      documents: "Documents",
      declaration: "Declaration",
    },
    fields: {
      first_name: "First name",
      last_name: "Last name",
      nationality: "Nationality",
      country_of_residence: "Country of residence",
      residential_address: "Residential address",
      correspondence_address: "Correspondence address",
      phone: "Phone number",
      email: "Email address",
      is_represented: "Client is represented by another person",
      acting_on_own_behalf_yes: "Yes, I am acting on my own behalf and for my own benefit",
      acting_on_own_behalf_no: "No, I am acting on behalf of or for the benefit of another person",
      beneficial_owner_info: "Identify the beneficial owner",
      pep_yes: "Yes, I am a politically exposed person",
      pep_no: "No, I am not a politically exposed person",
      pep_self_declared: "I confirm this information",
      pep_details: "PEP details (position, institution, country)",
      high_risk_yes: "Yes, I have connections to high-risk countries",
      high_risk_no: "No, I have no connections to high-risk countries",
      high_risk_details: "Describe the connection",
      cash_yes: "Yes, I regularly conduct/receive cash transactions exceeding EUR 10,000",
      cash_no: "No",
      occupation: "Occupation / profession",
      source_of_funds: "Source of funds",
      source_of_wealth: "Source of wealth",
      purpose_of_relationship: "Purpose and nature of the relationship",
    },
    docSection: {
      title: "Document upload",
      subtitle: "Please upload your identity and supporting documents.",
      photo: "Photo",
      passport: "Passport / National ID card",
      proofOfAddress: "Proof of address",
      upload: "Upload",
      uploading: "Uploading…",
      uploaded: "Uploaded",
      optional: "(optional)",
    },
    declaration: `I confirm that the information provided in this questionnaire is accurate and complete. \
I am aware that under applicable anti-money laundering legislation, the financial institution \
is required to identify and verify the client's identity and collect the data specified in this form. \
I undertake to promptly notify of any changes.`,
    declarationCheck: "I confirm that the information provided above is accurate",
    submit: "Submit questionnaire",
    submitting: "Submitting…",
    successTitle: "Thank you. Your questionnaire has been submitted.",
    successBody: "Your information has been submitted successfully. Your broker will be in touch shortly.",
  },
} as const;

type Lang = "lt" | "en";

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const selectCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="px-4 sm:px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Document upload ───────────────────────────────────────────────────────────

interface DocSectionStrings {
  title: string;
  subtitle: string;
  photo: string;
  passport: string;
  proofOfAddress: string;
  upload: string;
  uploading: string;
  uploaded: string;
  optional: string;
}

function DocUpload({
  label,
  docType,
  clientId,
  kycToken,
  t,
}: {
  label: string;
  docType: string;
  clientId: string;
  kycToken: string;
  t: DocSectionStrings;
}) {
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState("uploading");
    setError("");

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${clientId}/${Date.now()}_${safeName}`;

      // Get signed upload URL from server action
      const { signedUrl, error: urlError } = await getClientSignedUploadUrlAction(
        kycToken,
        path
      );
      if (urlError || !signedUrl) throw new Error(urlError ?? "Upload URL error");

      // Upload directly to Supabase storage
      const res = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");

      // Record in DB
      const recRes = await recordClientDocumentAction(kycToken, {
        client_id: clientId,
        document_type: docType,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
      });
      if (recRes?.error) throw new Error(recRes.error);

      setFileName(file.name);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("idle");
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {state === "done" ? (
        <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium py-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t.uploaded}: <span className="font-normal text-slate-600 truncate">{fileName}</span>
        </span>
      ) : (
        <label className={`flex items-center justify-center gap-2 w-full px-4 py-3 border border-slate-300
          rounded-lg text-sm font-medium cursor-pointer transition-colors min-h-[44px]
          ${state === "uploading" ? "text-slate-400 cursor-not-allowed bg-slate-50" : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {state === "uploading" ? t.uploading : t.upload}
          <input
            type="file"
            className="sr-only"
            disabled={state === "uploading"}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
            onChange={handleFile}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

interface KycFormProps {
  token: string;
  tokenId: string;
  language: Lang;
  expiresAt: string;
  clientData: { id: string; kyc_status: string; is_represented: boolean };
  details: Record<string, unknown>;
  companyName: string;
  relationshipPurposeOptions: RelationshipOption[];
  relationshipFrequencyOptions: RelationshipOption[];
  relationshipUseOptions: RelationshipOption[];
}

export default function KycForm({
  token,
  language,
  expiresAt,
  clientData,
  details,
  companyName,
  relationshipPurposeOptions,
  relationshipFrequencyOptions,
  relationshipUseOptions,
}: KycFormProps) {
  const t = T[language];
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [declared, setDeclared] = useState(false);

  const str = (k: string) => (details[k] as string | null) ?? "";
  const bool = (k: string) => (details[k] as boolean | null) ?? false;

  const [form, setForm] = useState({
    first_name:                        str("first_name"),
    last_name:                         str("last_name"),
    nationality:                       str("nationality"),
    country_of_residence:              str("country_of_residence"),
    residential_address:               str("residential_address"),
    correspondence_address:            str("correspondence_address"),
    phone:                             str("phone"),
    email:                             str("email"),
    acting_on_own_behalf:              bool("acting_on_own_behalf"),
    beneficial_owner_info:             str("beneficial_owner_info"),
    pep_status:                        str("pep_status") || "no",
    pep_self_declared:                 bool("pep_self_declared"),
    pep_details:                       str("pep_details"),
    has_high_risk_country_connections: bool("has_high_risk_country_connections"),
    high_risk_country_details:         str("high_risk_country_details"),
    cash_transactions_above_threshold: bool("cash_transactions_above_threshold"),
    occupation:                        str("occupation"),
    source_of_funds:                   str("source_of_funds"),
    source_of_wealth:                  str("source_of_wealth"),
    purpose_of_relationship:           str("purpose_of_relationship"),
    relationship_frequency:            str("relationship_frequency"),
    relationship_use:                  str("relationship_use"),
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleSubmit() {
    if (!declared) return;
    setError("");
    startTransition(async () => {
      const res = await submitKycFormAction({
        token,
        ...form,
        nationality:              form.nationality || null,
        country_of_residence:     form.country_of_residence || null,
        residential_address:      form.residential_address || null,
        correspondence_address:   form.correspondence_address || null,
        phone:                    form.phone || null,
        email:                    form.email || null,
        beneficial_owner_info:    form.beneficial_owner_info || null,
        pep_details:              form.pep_details || null,
        high_risk_country_details: form.high_risk_country_details || null,
        occupation:               form.occupation || null,
        source_of_funds:          form.source_of_funds || null,
        source_of_wealth:         form.source_of_wealth || null,
        purpose_of_relationship:  form.purpose_of_relationship || null,
        relationship_frequency:   form.relationship_frequency || null,
        relationship_use:         form.relationship_use || null,
        ip_address:               null,
        declaration_text:         t.declaration,
      });
      if (res?.error) { setError(res.error); return; }
      setSubmitted(true);
    });
  }

  const expiryStr = new Date(expiresAt).toLocaleString(
    language === "lt" ? "lt-LT" : "en-GB",
    { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 max-w-lg w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.successTitle}</h1>
          <p className="text-slate-600 leading-relaxed">{t.successBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          {companyName && (
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">{companyName}</p>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
          <p className="text-xs text-amber-700 mt-2 font-medium">
            {t.expires}: {expiryStr}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* ── Personal information ── */}
        <Section title={t.sections.personal}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t.fields.first_name} required>
              <input type="text" className={inputCls} value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                onFocus={(e) => e.target.scrollIntoView({ behavior: "smooth", block: "center" })} />
            </Field>
            <Field label={t.fields.last_name} required>
              <input type="text" className={inputCls} value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                onFocus={(e) => e.target.scrollIntoView({ behavior: "smooth", block: "center" })} />
            </Field>
          </div>
          <Field label={t.fields.nationality}>
            <input type="text" className={inputCls} value={form.nationality}
              onChange={(e) => set("nationality", e.target.value)} />
          </Field>
          <Field label={t.fields.country_of_residence}>
            <input type="text" className={inputCls} value={form.country_of_residence}
              onChange={(e) => set("country_of_residence", e.target.value)} />
          </Field>
          <Field label={t.fields.residential_address}>
            <input type="text" className={inputCls} value={form.residential_address}
              onChange={(e) => set("residential_address", e.target.value)} />
          </Field>
          <Field label={t.fields.correspondence_address}>
            <input type="text" className={inputCls} value={form.correspondence_address}
              onChange={(e) => set("correspondence_address", e.target.value)}
              placeholder={language === "lt" ? "Jei skiriasi nuo gyvenamosios vietos" : "If different from residential address"} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t.fields.phone}>
              <input type="tel" className={inputCls} value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                onFocus={(e) => e.target.scrollIntoView({ behavior: "smooth", block: "center" })} />
            </Field>
            <Field label={t.fields.email}>
              <input type="email" className={inputCls} value={form.email}
                onChange={(e) => set("email", e.target.value)}
                onFocus={(e) => e.target.scrollIntoView({ behavior: "smooth", block: "center" })} />
            </Field>
          </div>
        </Section>

        {/* ── Representation ── */}
        {clientData.is_represented && (
          <Section title={t.sections.representation}>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800">{t.fields.is_represented}</p>
            </div>
          </Section>
        )}

        {/* ── Acting on own behalf ── */}
        <Section title={t.sections.ownBehalf}>
          <div className="space-y-3">
            {([true, false] as const).map((val) => (
              <label key={String(val)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  form.acting_on_own_behalf === val
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}>
                <input type="radio" className="mt-0.5 accent-blue-600"
                  checked={form.acting_on_own_behalf === val}
                  onChange={() => set("acting_on_own_behalf", val)} />
                <span className="text-sm text-slate-800 leading-relaxed">
                  {val ? t.fields.acting_on_own_behalf_yes : t.fields.acting_on_own_behalf_no}
                </span>
              </label>
            ))}
          </div>
          {!form.acting_on_own_behalf && (
            <Field label={t.fields.beneficial_owner_info} required>
              <textarea rows={3} className={inputCls + " resize-none"}
                value={form.beneficial_owner_info}
                onChange={(e) => set("beneficial_owner_info", e.target.value)} />
            </Field>
          )}
        </Section>

        {/* ── PEP ── */}
        <Section title={t.sections.pep}>
          <div className="space-y-3">
            {(["no", "yes"] as const).map((val) => (
              <label key={val}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  form.pep_status === val
                    ? val === "yes"
                      ? "border-red-400 bg-red-50"
                      : "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}>
                <input type="radio" className="mt-0.5 accent-blue-600"
                  checked={form.pep_status === val}
                  onChange={() => set("pep_status", val)} />
                <span className="text-sm text-slate-800 leading-relaxed">
                  {val === "yes" ? t.fields.pep_yes : t.fields.pep_no}
                </span>
              </label>
            ))}
          </div>
          {form.pep_status === "yes" && (
            <Field label={t.fields.pep_details} required>
              <textarea rows={3} className={inputCls + " resize-none"}
                value={form.pep_details}
                onChange={(e) => set("pep_details", e.target.value)} />
            </Field>
          )}
          <label className="flex items-start gap-3 cursor-pointer py-2 min-h-[44px]">
            <input type="checkbox" className="mt-0.5 w-5 h-5 accent-blue-600 shrink-0"
              checked={form.pep_self_declared}
              onChange={(e) => set("pep_self_declared", e.target.checked)} />
            <span className="text-sm text-slate-700">{t.fields.pep_self_declared}</span>
          </label>
        </Section>

        {/* ── High-risk countries ── */}
        <Section title={t.sections.highRisk}>
          <div className="space-y-3">
            {([false, true] as const).map((val) => (
              <label key={String(val)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  form.has_high_risk_country_connections === val
                    ? val
                      ? "border-red-400 bg-red-50"
                      : "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}>
                <input type="radio" className="mt-0.5 accent-blue-600"
                  checked={form.has_high_risk_country_connections === val}
                  onChange={() => set("has_high_risk_country_connections", val)} />
                <span className="text-sm text-slate-800 leading-relaxed">
                  {val ? t.fields.high_risk_yes : t.fields.high_risk_no}
                </span>
              </label>
            ))}
          </div>
          {form.has_high_risk_country_connections && (
            <Field label={t.fields.high_risk_details} required>
              <textarea rows={3} className={inputCls + " resize-none"}
                value={form.high_risk_country_details}
                onChange={(e) => set("high_risk_country_details", e.target.value)} />
            </Field>
          )}
        </Section>

        {/* ── Cash transactions ── */}
        <Section title={t.sections.cash}>
          <div className="space-y-3">
            {([false, true] as const).map((val) => (
              <label key={String(val)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  form.cash_transactions_above_threshold === val
                    ? val
                      ? "border-amber-400 bg-amber-50"
                      : "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}>
                <input type="radio" className="mt-0.5 accent-blue-600"
                  checked={form.cash_transactions_above_threshold === val}
                  onChange={() => set("cash_transactions_above_threshold", val)} />
                <span className="text-sm text-slate-800 leading-relaxed">
                  {val ? t.fields.cash_yes : t.fields.cash_no}
                </span>
              </label>
            ))}
          </div>
        </Section>

        {/* ── Source of funds ── */}
        <Section title={t.sections.source}>
          <Field label={t.fields.occupation} required>
            <input type="text" className={inputCls} value={form.occupation}
              onChange={(e) => set("occupation", e.target.value)} />
          </Field>
          <Field label={t.fields.source_of_funds} required>
            <select className={selectCls} value={form.source_of_funds}
              onChange={(e) => set("source_of_funds", e.target.value)}>
              <option value="">{language === "lt" ? "Pasirinkti…" : "Select…"}</option>
              <option value="employment">{language === "lt" ? "Darbo pajamos" : "Employment income"}</option>
              <option value="business">{language === "lt" ? "Verslo pajamos" : "Business income"}</option>
              <option value="investments">{language === "lt" ? "Investicinės pajamos" : "Investment income"}</option>
              <option value="pension">{language === "lt" ? "Pensija" : "Pension"}</option>
              <option value="inheritance">{language === "lt" ? "Paveldėjimas / dovana" : "Inheritance / gift"}</option>
              <option value="real_estate">{language === "lt" ? "Nekilnojamojo turto pajamos" : "Real estate income"}</option>
              <option value="savings">{language === "lt" ? "Santaupos" : "Savings"}</option>
              <option value="other">{language === "lt" ? "Kita" : "Other"}</option>
            </select>
          </Field>
          <Field label={t.fields.source_of_wealth}>
            <textarea rows={3} className={inputCls + " resize-none"}
              value={form.source_of_wealth}
              onChange={(e) => set("source_of_wealth", e.target.value)}
              placeholder={language === "lt" ? "Kaip sukaupėte turtą?" : "How did you accumulate your wealth?"} />
          </Field>
        </Section>

        {/* ── Purpose ── */}
        <Section title={t.sections.purpose}>
          {relationshipPurposeOptions.length > 0 ? (
            <Field label={t.fields.purpose_of_relationship} required>
              <select className={selectCls} value={form.purpose_of_relationship}
                onChange={(e) => set("purpose_of_relationship", e.target.value)}>
                <option value="">{language === "lt" ? "Pasirinkti…" : "Select…"}</option>
                {relationshipPurposeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === "lt" ? opt.label_lt : opt.label_en}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label={t.fields.purpose_of_relationship} required>
              <select className={selectCls} value={form.purpose_of_relationship}
                onChange={(e) => set("purpose_of_relationship", e.target.value)}>
                <option value="">{language === "lt" ? "Pasirinkti…" : "Select…"}</option>
              </select>
            </Field>
          )}
          {relationshipFrequencyOptions.length > 0 && (
            <Field label={language === "lt" ? "Sandorių dažnumas" : "Transaction frequency"} required>
              <select className={selectCls} value={form.relationship_frequency ?? ""}
                onChange={(e) => set("relationship_frequency", e.target.value)}>
                <option value="">{language === "lt" ? "Pasirinkti…" : "Select…"}</option>
                {relationshipFrequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === "lt" ? opt.label_lt : opt.label_en}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {relationshipUseOptions.length > 0 && (
            <Field label={language === "lt" ? "Naudojimo tikslas" : "Purpose of use"} required>
              <select className={selectCls} value={form.relationship_use ?? ""}
                onChange={(e) => set("relationship_use", e.target.value)}>
                <option value="">{language === "lt" ? "Pasirinkti…" : "Select…"}</option>
                {relationshipUseOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === "lt" ? opt.label_lt : opt.label_en}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </Section>

        {/* ── Documents ── */}
        <Section title={t.docSection.title}>
          <p className="text-sm text-slate-500">{t.docSection.subtitle}</p>
          <div className="space-y-4 pt-1">
            <DocUpload label={t.docSection.photo} docType="photo"
              clientId={clientData.id} kycToken={token} t={t.docSection} />
            <DocUpload label={t.docSection.passport} docType="passport"
              clientId={clientData.id} kycToken={token} t={t.docSection} />
            <DocUpload
              label={`${t.docSection.proofOfAddress} ${t.docSection.optional}`}
              docType="proof_of_address"
              clientId={clientData.id} kycToken={token} t={t.docSection} />
          </div>
        </Section>

        {/* ── Declaration ── */}
        <Section title={t.sections.declaration}>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-sm text-slate-700 leading-relaxed">{t.declaration}</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 w-5 h-5 accent-blue-600 cursor-pointer"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-800">{t.declarationCheck}</span>
          </label>
        </Section>

        {/* Submit */}
        <div className="pb-8">
          <button
            onClick={handleSubmit}
            disabled={!declared || isPending}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400
              text-white disabled:cursor-not-allowed text-base font-semibold rounded-xl transition-colors"
          >
            {isPending ? t.submitting : t.submit}
          </button>
          {!declared && (
            <p className="text-center text-xs text-slate-400 mt-2">
              {language === "lt"
                ? "Pažymėkite deklaracijos laukelį, kad galėtumėte pateikti"
                : "Check the declaration box to enable submission"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
