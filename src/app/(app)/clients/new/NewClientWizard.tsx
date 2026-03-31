"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createIndividualClientAction, type CreateIndividualClientData } from "@/app/actions/clients";
import { checkArchiveMatchAction, reviveClientAction, type ArchiveMatch } from "@/app/actions/termination";
import { validateLithuanianPersonalCode } from "@/lib/validation/lithuanianPersonalCode";
import type { RelationshipOption } from "./page";

// ── Shared input style ────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "disabled:bg-slate-50 disabled:text-slate-400";

const selectCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";
const optLabelCls = "block text-sm font-medium text-slate-700";
const hintCls = "text-xs text-slate-400 mt-1";

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

// ── Row helpers ───────────────────────────────────────────────────────────────
function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-4 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

function Toggle({
  checked, onChange, label, description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-300"}`}
        />
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
      <div>
        <span className={optLabelCls}>{label}</span>
        {description && <p className={hintCls}>{description}</p>}
      </div>
    </label>
  );
}

function RadioGroup<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string }[];
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            value === opt.value
              ? "border-blue-500 bg-blue-50"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <input
            type="radio"
            className="mt-0.5 shrink-0 accent-blue-600"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <div>
            <span className="text-sm font-medium text-slate-800">{opt.label}</span>
            {opt.description && (
              <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

// ── Default form state ────────────────────────────────────────────────────────
const defaultForm: CreateIndividualClientData = {
  first_name: "",
  last_name: "",
  is_lithuanian_resident: true,
  personal_id_number: "",
  date_of_birth: "",
  foreign_id_number: "",
  nationality: "LT",
  is_stateless: false,
  id_issuing_country: "",
  country_of_residence: "LT",
  residential_address: "",
  same_correspondence: true,
  correspondence_address: "",
  id_document_type: "",
  id_document_number: "",
  id_issue_date: "",
  id_document_expiry: "",
  id_issuing_country_doc: "",
  phone: "",
  email: "",
  is_represented: false,
  rep_first_name: "",
  rep_last_name: "",
  rep_personal_id: "",
  rep_date_of_birth: "",
  rep_nationality: "",
  rep_relationship_type: "poa_holder",
  rep_notes: "",
  acting_on_own_behalf: true,
  beneficial_owner_info: "",
  pep_status: "unknown",
  pep_self_declared: false,
  pep_details: "",
  occupation: "",
  source_of_funds: "",
  source_of_wealth: "",
  purpose_of_relationship: "",
  relationship_frequency: "",
  relationship_use: "",
  risk_rating: "not_assessed",
  notes: "",
};

// ══════════════════════════════════════════════════════════════════════════════
// Step 1 — Client type selection
// ══════════════════════════════════════════════════════════════════════════════
function StepClientType({
  onSelect,
}: {
  onSelect: (type: "individual") => void;
}) {
  const [selected, setSelected] = useState<"individual" | "legal_entity" | null>(null);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <Link href="/clients" className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to clients
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add new client</h1>
        <p className="text-slate-500 text-sm mt-1">Select the type of client you are onboarding.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Individual */}
        <button
          type="button"
          onClick={() => setSelected("individual")}
          className={`p-6 rounded-xl border-2 text-left transition-all ${
            selected === "individual"
              ? "border-blue-500 bg-blue-50"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
            selected === "individual" ? "bg-blue-600" : "bg-slate-100"
          }`}>
            <svg className={`w-6 h-6 ${selected === "individual" ? "text-white" : "text-slate-500"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">Individual</h3>
          <p className="text-sm text-slate-500">
            Natural person — private individual buying, selling or renting property.
          </p>
        </button>

        {/* Legal Entity */}
        <div
          className="p-6 rounded-xl border-2 border-slate-200 bg-white opacity-60 relative"
        >
          <span className="absolute top-3 right-3 px-2 py-0.5 bg-slate-100 text-slate-500
            text-xs font-medium rounded-full">
            Coming soon
          </span>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">Legal entity</h3>
          <p className="text-sm text-slate-500">
            Company, partnership or other legal entity.
          </p>
        </div>
      </div>

      {selected === "individual" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onSelect("individual")}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Step 2 — Individual client form
// ══════════════════════════════════════════════════════════════════════════════
function StepIndividualForm({
  onBack,
  purposeOptions,
  frequencyOptions,
  useOptions,
}: {
  onBack: () => void;
  purposeOptions: RelationshipOption[];
  frequencyOptions: RelationshipOption[];
  useOptions: RelationshipOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<CreateIndividualClientData>(defaultForm);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [personalCodeValid, setPersonalCodeValid] = useState<boolean | null>(null);
  const [personalCodeError, setPersonalCodeError] = useState("");
  const [issueDateError, setIssueDateError] = useState("");
  const [expiryDateError, setExpiryDateError] = useState("");
  const [archiveMatch, setArchiveMatch] = useState<ArchiveMatch | null>(null);
  const [checkingArchive, setCheckingArchive] = useState(false);
  const [reviving, setReviving] = useState(false);
  const [revivalMessage, setRevivalMessage] = useState("");

  function set<K extends keyof CreateIndividualClientData>(
    key: K,
    value: CreateIndividualClientData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function bindText(key: keyof CreateIndividualClientData) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        set(key, e.target.value as never),
    };
  }

  function handlePersonalCodeBlur() {
    const code = form.personal_id_number.trim();
    if (!code) { setPersonalCodeValid(null); setPersonalCodeError(""); return; }
    const result = validateLithuanianPersonalCode(code);
    setPersonalCodeValid(result.valid);
    setPersonalCodeError(result.errorEn ?? "");
    if (result.valid && result.dateOfBirth) {
      set("date_of_birth", result.dateOfBirth);
    }
  }

  function handleIssueDateBlur() {
    const issue = form.id_issue_date;
    const dob = form.date_of_birth;
    if (!issue) { setIssueDateError(""); return; }
    if (dob && issue < dob) {
      setIssueDateError("Issue date cannot be before date of birth");
      return;
    }
    setIssueDateError("");
  }

  function handleExpiryDateBlur() {
    const expiry = form.id_document_expiry;
    const issue = form.id_issue_date;
    if (!expiry) { setExpiryDateError(""); return; }
    if (issue && expiry < issue) {
      setExpiryDateError("Expiry date cannot be before issue date");
      return;
    }
    setExpiryDateError("");
  }

  async function triggerArchiveCheck(params: { email?: string; personalCode?: string; documentNumber?: string }) {
    const hasValue = Object.values(params).some((v) => v?.trim());
    if (!hasValue) return;
    setCheckingArchive(true);
    try {
      const { match } = await checkArchiveMatchAction(params);
      if (match) setArchiveMatch(match);
    } finally {
      setCheckingArchive(false);
    }
  }

  async function handleRevive(match: ArchiveMatch) {
    if (match.revival_requires_aml_review) {
      setRevivalMessage("This client was terminated for AML reasons. Please contact your AML officer to revive this client.");
      return;
    }
    setReviving(true);
    try {
      const res = await reviveClientAction({ archivedClientId: match.id });
      if (!res.ok) { setError(res.error ?? "Failed to revive client"); return; }
      if (res.requiresAmlOfficer) {
        setRevivalMessage("This client was terminated for AML reasons. Please contact your AML officer to revive this client.");
        return;
      }
      if (res.newClientId) {
        router.push(`/clients/${res.newClientId}`);
      }
    } finally {
      setReviving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await createIndividualClientAction(form);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Change client type
        </button>
        <h1 className="text-2xl font-bold text-slate-900">New individual client</h1>
        <p className="text-slate-500 text-sm mt-1">
          Complete the KYC questionnaire. Required fields are marked with *.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Personal Details ─────────────────────────────── */}
        <Section title="1. Personal details">
          <Row>
            <Field label="First name *">
              <input type="text" className={inputCls} {...bindText("first_name")}
                placeholder="Jonas" autoFocus />
            </Field>
            <Field label="Last name *">
              <input type="text" className={inputCls} {...bindText("last_name")}
                placeholder="Jonaitis" />
            </Field>
          </Row>

          {/* Resident type */}
          <div className="flex rounded-lg border border-slate-300 overflow-hidden w-fit">
            {(["lt", "foreign"] as const).map((type) => {
              const active = form.is_lithuanian_resident === (type === "lt");
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    const isLt = type === "lt";
                    set("is_lithuanian_resident", isLt);
                    set("country_of_residence", isLt ? "LT" : "");
                    setPersonalCodeValid(null);
                    setPersonalCodeError("");
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {type === "lt" ? "Lithuanian resident" : "Foreign national"}
                </button>
              );
            })}
          </div>

          {form.is_lithuanian_resident ? (
            <Field label="Personal identification number"
              hint="11-digit Lithuanian personal ID (asmens kodas)">
              <div className="relative">
                <input
                  type="text"
                  className={
                    personalCodeValid === true
                      ? inputCls.replace("border-slate-300", "border-emerald-500") + " pr-8"
                      : personalCodeValid === false
                      ? inputCls.replace("border-slate-300", "border-red-500") + " pr-8"
                      : inputCls
                  }
                  {...bindText("personal_id_number")}
                  placeholder="38901011234"
                  maxLength={11}
                  onBlur={(e) => {
                    handlePersonalCodeBlur();
                    triggerArchiveCheck({ personalCode: e.target.value });
                  }}
                />
                {personalCodeValid === true && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {personalCodeValid === false && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
              </div>
              {personalCodeError && (
                <p className="text-xs text-red-600 mt-1">{personalCodeError}</p>
              )}
              {personalCodeValid && form.date_of_birth && (
                <p className="text-xs text-emerald-600 mt-1">Date of birth auto-filled: {form.date_of_birth}</p>
              )}
            </Field>
          ) : (
            <>
              <Row>
                <Field label="Date of birth">
                  <input type="date" className={inputCls} {...bindText("date_of_birth")} />
                </Field>
                <Field label="Unique identifier" hint="Foreign national ID / passport number">
                  <input type="text" className={inputCls} {...bindText("foreign_id_number")} />
                </Field>
              </Row>
            </>
          )}

          <Row>
            <Field label="Nationality">
              <input type="text" className={inputCls} {...bindText("nationality")}
                placeholder="Lithuanian" />
            </Field>
            <Field label="Country of residence">
              <input type="text" className={inputCls} {...bindText("country_of_residence")}
                placeholder="Lithuania" />
            </Field>
          </Row>

          <Toggle
            checked={form.is_stateless}
            onChange={(v) => set("is_stateless", v)}
            label="Stateless person"
            description="Client has no nationality — specify the country that issued the ID document."
          />

          {form.is_stateless && (
            <Field label="Country that issued ID document">
              <input type="text" className={inputCls} {...bindText("id_issuing_country")}
                placeholder="Germany" />
            </Field>
          )}

          <Field label="Residential address">
            <input type="text" className={inputCls} {...bindText("residential_address")}
              placeholder="Gedimino pr. 1, LT-01103 Vilnius" />
          </Field>

          <Toggle
            checked={form.same_correspondence}
            onChange={(v) => set("same_correspondence", v)}
            label="Correspondence address same as residential"
          />

          {!form.same_correspondence && (
            <Field label="Correspondence address">
              <input type="text" className={inputCls} {...bindText("correspondence_address")}
                placeholder="PO Box 123, Kaunas" />
            </Field>
          )}
        </Section>

        {/* ── Section 1b: ID Document ──────────────────────────────────── */}
        <Section title="Identity document">
          <Field label="Document type">
            <select className={selectCls} {...bindText("id_document_type")}>
              <option value="">— Select —</option>
              <option value="passport">Passport</option>
              <option value="national_id">National ID card</option>
              <option value="residence_permit">Residence permit</option>
            </select>
          </Field>

          <Row cols={3}>
            <Field label="Document number">
              <input type="text" className={inputCls} {...bindText("id_document_number")}
                placeholder="AB123456"
                onBlur={(e) => triggerArchiveCheck({ documentNumber: e.target.value })} />
            </Field>
            <Field label="Issue date">
              <input type="date"
                className={issueDateError ? inputCls.replace("border-slate-300", "border-red-500") : inputCls}
                {...bindText("id_issue_date")}
                onBlur={handleIssueDateBlur} />
              {issueDateError && <p className="text-xs text-red-600 mt-1">{issueDateError}</p>}
            </Field>
            <Field label="Expiry date">
              <input type="date"
                className={expiryDateError ? inputCls.replace("border-slate-300", "border-red-500") : inputCls}
                {...bindText("id_document_expiry")}
                onBlur={handleExpiryDateBlur} />
              {expiryDateError && <p className="text-xs text-red-600 mt-1">{expiryDateError}</p>}
            </Field>
          </Row>

          <Field label="Issuing country">
            <input type="text" className={inputCls} {...bindText("id_issuing_country_doc")}
              placeholder="Lithuania" />
          </Field>
        </Section>

        {/* ── Section 1c: Contact ──────────────────────────────────────── */}
        <Section title="Contact information">
          <Row>
            <Field label="Phone number">
              <input type="tel" className={inputCls} {...bindText("phone")}
                placeholder="+370 600 00000" />
            </Field>
            <Field label="Email address">
              <input type="email" className={inputCls} {...bindText("email")}
                placeholder="jonas@example.com"
                onBlur={(e) => triggerArchiveCheck({ email: e.target.value })} />
            </Field>
          </Row>
        </Section>

        {/* ── Section 2: Representation ────────────────────────────────── */}
        <Section title="2. Representation">
          <Toggle
            checked={form.is_represented}
            onChange={(v) => set("is_represented", v)}
            label="Client is represented by another person"
            description="A parent, guardian, power of attorney holder, or court-appointed representative is acting on the client's behalf."
          />

          {form.is_represented && (
            <div className="space-y-4 pt-2 border-t border-slate-100 mt-2">
              <Row>
                <Field label="Representative first name">
                  <input type="text" className={inputCls} {...bindText("rep_first_name")} />
                </Field>
                <Field label="Representative last name">
                  <input type="text" className={inputCls} {...bindText("rep_last_name")} />
                </Field>
              </Row>
              <Row>
                <Field label="Personal ID / date of birth" hint="ID number or DOB">
                  <input type="text" className={inputCls} {...bindText("rep_personal_id")}
                    placeholder="38901011234" />
                </Field>
                <Field label="Nationality">
                  <input type="text" className={inputCls} {...bindText("rep_nationality")} />
                </Field>
              </Row>
              <Field label="Relationship to client">
                <select className={selectCls} {...bindText("rep_relationship_type")}>
                  <option value="parent">Parent</option>
                  <option value="guardian">Guardian</option>
                  <option value="poa_holder">Power of attorney holder</option>
                  <option value="court_appointed">Court-appointed representative</option>
                </select>
              </Field>
              <Field label="Notes">
                <textarea
                  className={inputCls + " resize-none"}
                  rows={2}
                  {...bindText("rep_notes")}
                  placeholder="e.g. POA document reference, court order number…"
                />
              </Field>
            </div>
          )}
        </Section>

        {/* ── Section 3: Acting on own behalf ──────────────────────────── */}
        <Section title="3. Acting on own behalf (field 14)">
          <p className="text-sm text-slate-600 -mt-1">
            Is the client entering into this business relationship on their own behalf?
          </p>
          <RadioGroup
            value={form.acting_on_own_behalf ? "yes" : "no"}
            onChange={(v) => set("acting_on_own_behalf", v === "yes")}
            options={[
              {
                value: "yes",
                label: "Yes — acting on their own behalf",
                description: "The client is the beneficial owner and acting for themselves.",
              },
              {
                value: "no",
                label: "No — acting on behalf of another person",
                description: "The client is entering into the relationship on behalf of a third party (beneficial owner).",
              },
            ]}
          />

          {!form.acting_on_own_behalf && (
            <Field
              label="Beneficial owner details"
              hint="Name and, if known, personal ID or date of birth of the person on whose behalf the client is acting."
            >
              <textarea
                className={inputCls + " resize-none"}
                rows={3}
                {...bindText("beneficial_owner_info")}
                placeholder="Full name, personal ID / date of birth…"
              />
            </Field>
          )}
        </Section>

        {/* ── Section 4: PEP & Sanctions ───────────────────────────────── */}
        <Section title="4. PEP declaration">
          <p className="text-sm text-slate-600 -mt-1">
            Politically Exposed Person (PEP) — a person who holds or has held a prominent public function, or is a family member or close associate of such a person.
          </p>

          <Field label="PEP status">
            <select className={selectCls} {...bindText("pep_status")}>
              <option value="unknown">Not yet assessed</option>
              <option value="no">No — not a PEP</option>
              <option value="yes">Yes — PEP</option>
            </select>
          </Field>

          {form.pep_status === "yes" && (
            <>
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">EDD Required</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Client is a Politically Exposed Person (PEP). Enhanced Due Diligence (EDD) will be automatically initiated after KYC submission.
                  </p>
                </div>
              </div>
              <Toggle
                checked={form.pep_self_declared}
                onChange={(v) => set("pep_self_declared", v)}
                label="Client self-declared PEP status"
                description="The client confirmed their PEP status in writing."
              />
              <Field label="PEP details" hint="Position held, country, relationship to PEP if family/associate.">
                <textarea
                  className={inputCls + " resize-none"}
                  rows={3}
                  {...bindText("pep_details")}
                  placeholder="e.g. Former Member of Parliament, Lithuania, 2018–2022…"
                />
              </Field>
            </>
          )}
        </Section>

        {/* ── Section 5: Purpose ───────────────────────────────────────── */}
        <Section title="5. Purpose of business relationship">
          <Field label="Purpose of business relationship">
            <select className={selectCls} {...bindText("purpose_of_relationship")}>
              <option value="">— Select —</option>
              {purposeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label_en}</option>
              ))}
            </select>
          </Field>

          {frequencyOptions.length > 0 && (
            <Field label="Transaction frequency">
              <select className={selectCls} {...bindText("relationship_frequency")}>
                <option value="">— Select —</option>
                {frequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label_en}</option>
                ))}
              </select>
            </Field>
          )}

          {useOptions.length > 0 && (
            <Field label="Purpose of use">
              <select className={selectCls} {...bindText("relationship_use")}>
                <option value="">— Select —</option>
                {useOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label_en}</option>
                ))}
              </select>
            </Field>
          )}
        </Section>

        {/* ── Section 6: Risk assessment (internal) ────────────────────── */}
        <Section title="6. Initial risk assessment">
          <p className="text-sm text-slate-500 -mt-1">
            For internal use only — not shown to the client.
          </p>
          <Field label="Risk rating">
            <select className={selectCls} {...bindText("risk_rating")}>
              <option value="not_assessed">Not yet assessed</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Internal notes">
            <textarea
              className={inputCls + " resize-none"}
              rows={3}
              {...bindText("notes")}
              placeholder="Any relevant observations, referral source, transaction context…"
            />
          </Field>
        </Section>

        {/* ── Archive match banner ─────────────────────────────────────── */}
        {checkingArchive && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm animate-pulse">
            Checking archive…
          </div>
        )}

        {revivalMessage && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-amber-800">{revivalMessage}</p>
            <button
              type="button"
              onClick={() => setRevivalMessage("")}
              className="text-xs text-amber-600 underline underline-offset-2"
            >
              Dismiss — continue creating new client
            </button>
          </div>
        )}

        {archiveMatch && !revivalMessage && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  A match was found in the archive with this data.
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Rastas archyve esantis klientas su šiais duomenimis.
                </p>
                <div className="mt-2 text-sm text-amber-700 space-y-0.5">
                  <p className="font-medium">{archiveMatch.first_name} {archiveMatch.last_name}</p>
                  {archiveMatch.archived_at && (
                    <p className="text-xs">Archived: {new Date(archiveMatch.archived_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  )}
                  {archiveMatch.termination_reason && (
                    <p className="text-xs">Reason: {archiveMatch.termination_reason.replace(/_/g, " ")}</p>
                  )}
                  {archiveMatch.revival_requires_aml_review && (
                    <p className="text-xs font-semibold text-red-700">Revival requires AML officer review</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleRevive(archiveMatch)}
                disabled={reviving}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg transition"
              >
                {reviving ? "Processing…" : "Atgaivinti šį klientą / Revive this client"}
              </button>
              <button
                type="button"
                onClick={() => setArchiveMatch(null)}
                className="px-3 py-1.5 border border-amber-300 text-amber-700 hover:bg-amber-100 text-sm font-medium rounded-lg transition"
              >
                Skirtingas asmuo / Different person (continue creating new)
              </button>
            </div>
          </div>
        )}

        {/* ── Submit bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium
              rounded-lg hover:bg-slate-50 transition-colors"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
              text-white text-sm font-medium rounded-lg transition"
          >
            {isPending ? "Creating client…" : "Create client"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Root wizard
// ══════════════════════════════════════════════════════════════════════════════
export default function NewClientWizard({
  purposeOptions,
  frequencyOptions,
  useOptions,
}: {
  purposeOptions: RelationshipOption[];
  frequencyOptions: RelationshipOption[];
  useOptions: RelationshipOption[];
}) {
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div className="min-h-full bg-slate-50">
      {step === 1 && (
        <StepClientType onSelect={() => setStep(2)} />
      )}
      {step === 2 && (
        <StepIndividualForm
          onBack={() => setStep(1)}
          purposeOptions={purposeOptions}
          frequencyOptions={frequencyOptions}
          useOptions={useOptions}
        />
      )}
    </div>
  );
}
