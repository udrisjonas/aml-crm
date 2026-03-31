"use client";

import { useState, useTransition, useRef } from "react";
import { getEddQuestions } from "@/lib/edd/questions";
import { submitEddFormAction, getEddSignedUploadUrlAction, recordEddDocumentAction } from "@/app/actions/edd";

interface DocumentRequest {
  id: string;
  document_name: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
}

interface UploadedFile {
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}

interface EddFormProps {
  token: string;
  clientName: string;
  purposeOfRelationship: string | null;
  initialAnswers: Record<string, string>;
  documentRequests: DocumentRequest[];
  alreadySubmitted: boolean;
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none";

const selectCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent";

export default function EddForm({
  token,
  clientName,
  purposeOfRelationship,
  initialAnswers,
  documentRequests,
  alreadySubmitted,
}: EddFormProps) {
  const questions = getEddQuestions(purposeOfRelationship);

  const [answers, setAnswers]           = useState<Record<string, string>>(initialAnswers);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [submitted, setSubmitted]       = useState(false);
  const [serverError, setServerError]   = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  // Upload state: key = request.id or "additional_N"
  const [uploads, setUploads]           = useState<Record<string, UploadedFile>>({});
  const [uploadPending, setUploadPending] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [additionalCount, setAdditionalCount] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function set(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  async function handleFileSelect(slotKey: string, requestId: string | null, file: File) {
    setUploadPending((prev) => ({ ...prev, [slotKey]: true }));
    setUploadErrors((prev) => ({ ...prev, [slotKey]: "" }));

    try {
      const urlRes = await getEddSignedUploadUrlAction(token, file.name);
      if (!urlRes.ok) throw new Error(urlRes.error);

      const uploadRes = await fetch(urlRes.signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadRes.ok) throw new Error("File upload failed");

      const recordRes = await recordEddDocumentAction(token, {
        file_name:  file.name,
        file_path:  urlRes.path,
        file_size:  file.size,
        mime_type:  file.type || "application/octet-stream",
        request_id: requestId ?? undefined,
      });
      if (!recordRes.ok) throw new Error(recordRes.error);

      setUploads((prev) => ({
        ...prev,
        [slotKey]: { file_name: file.name, file_path: urlRes.path, file_size: file.size, mime_type: file.type },
      }));
    } catch (e) {
      setUploadErrors((prev) => ({ ...prev, [slotKey]: e instanceof Error ? e.message : "Upload failed" }));
    } finally {
      setUploadPending((prev) => ({ ...prev, [slotKey]: false }));
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    for (const q of questions) {
      if (q.condition && !q.condition(answers)) continue;
      if (q.required && !answers[q.key]?.trim()) {
        newErrors[q.key] = "This field is required / Šis laukas privalomas";
      }
    }

    // Required document requests
    for (const req of documentRequests) {
      if (req.is_required && !uploads[req.id]) {
        newErrors[`doc_${req.id}`] = "This document is required / Šis dokumentas privalomas";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      setTimeout(() => {
        document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    startTransition(async () => {
      setServerError(null);
      const visibleAnswers: Record<string, string> = {};
      for (const q of questions) {
        if (q.condition && !q.condition(answers)) continue;
        if (answers[q.key] !== undefined) visibleAnswers[q.key] = answers[q.key];
      }

      const res = await submitEddFormAction(token, visibleAnswers);
      if (res.ok) {
        setSubmitted(true);
      } else {
        setServerError(res.error);
      }
    });
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank you!</h1>
          <p className="text-slate-500 text-sm mb-4">
            Your EDD questionnaire has been submitted successfully. Our compliance team will review your
            answers and contact you if any further information is needed.
          </p>
          <hr className="my-5 border-slate-100" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Ačiū!</h2>
          <p className="text-slate-500 text-sm">
            Jūsų EDD anketa sėkmingai pateikta. Mūsų atitikties komanda peržiūrės jūsų atsakymus
            ir susisieks, jei reikės papildomos informacijos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-red-800 text-white py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-red-200 text-sm font-medium uppercase tracking-wide mb-1">
            Enhanced Due Diligence · Sustiprintas deramas patikrinimas
          </p>
          <h1 className="text-2xl font-bold">EDD Questionnaire / EDD anketa</h1>
          <p className="text-red-200 text-sm mt-1">Dear {clientName} · Gerbiamas(-a) {clientName}</p>
        </div>
      </div>

      {/* Intro */}
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-2">
          <p className="text-sm text-amber-800 font-medium">
            <strong>EN:</strong> As a Politically Exposed Person, you are required to complete this
            Enhanced Due Diligence questionnaire. All fields marked with * are mandatory.
          </p>
          <p className="text-sm text-amber-800 mt-2">
            <strong>LT:</strong> Kaip politiškai paveiktas asmuo (PEP), privalote užpildyti šią
            EDD anketą. Visi laukai, pažymėti *, yra privalomi.
          </p>
        </div>

        {alreadySubmitted && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-2 mt-2">
            <p className="text-sm text-blue-800">
              <strong>EN:</strong> Your previous answers have been pre-filled. Please review and update as needed, then resubmit.
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>LT:</strong> Jūsų ankstesni atsakymai užpildyti iš anksto. Peržiūrėkite ir atnaujinkite prireikus, tada pateikite iš naujo.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="max-w-2xl mx-auto px-6 pt-4 pb-10 space-y-5">

          {/* Questions */}
          {questions.map((q) => {
            const isVisible = !q.condition || q.condition(answers);
            if (!isVisible) return null;
            const hasError = !!errors[q.key];

            return (
              <div
                key={q.key}
                data-error={hasError ? "true" : undefined}
                className="bg-white rounded-xl border border-slate-200 p-5"
              >
                <label className="block text-sm font-semibold text-slate-800 mb-0.5">
                  {q.labelEn}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <p className="text-xs text-slate-400 italic mb-3">{q.labelLt}</p>

                {q.type === "textarea" && (
                  <textarea
                    rows={4}
                    className={hasError ? inputCls.replace("border-slate-300", "border-red-400") : inputCls}
                    value={answers[q.key] ?? ""}
                    onChange={(e) => set(q.key, e.target.value)}
                    placeholder="Your answer / Jūsų atsakymas"
                  />
                )}
                {q.type === "text" && (
                  <input
                    type="text"
                    className={hasError ? inputCls.replace("border-slate-300", "border-red-400") : inputCls}
                    value={answers[q.key] ?? ""}
                    onChange={(e) => set(q.key, e.target.value)}
                    placeholder="Your answer / Jūsų atsakymas"
                  />
                )}
                {q.type === "select" && q.options && (
                  <select
                    className={hasError ? selectCls.replace("border-slate-300", "border-red-400") : selectCls}
                    value={answers[q.key] ?? ""}
                    onChange={(e) => set(q.key, e.target.value)}
                  >
                    <option value="">Select / Pasirinkite</option>
                    {q.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.labelEn} / {opt.labelLt}
                      </option>
                    ))}
                  </select>
                )}
                {q.type === "radio" && q.options && (
                  <div className="flex gap-4 flex-wrap">
                    {q.options.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={q.key}
                          value={opt.value}
                          checked={answers[q.key] === opt.value}
                          onChange={() => set(q.key, opt.value)}
                          className="accent-red-700"
                        />
                        <span className="text-sm text-slate-700">{opt.labelEn} / {opt.labelLt}</span>
                      </label>
                    ))}
                  </div>
                )}
                {hasError && <p className="mt-1.5 text-xs text-red-600">{errors[q.key]}</p>}
              </div>
            );
          })}

          {/* Documents section */}
          {(documentRequests.length > 0) && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">
                  Documents required / Reikalingi dokumentai
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Please upload each requested document. / Prašome įkelti kiekvieną reikalaujamą dokumentą.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {documentRequests.map((req) => {
                  const uploaded    = uploads[req.id];
                  const pending     = uploadPending[req.id];
                  const uploadErr   = uploadErrors[req.id];
                  const docError    = errors[`doc_${req.id}`];

                  return (
                    <div
                      key={req.id}
                      data-error={docError ? "true" : undefined}
                      className="px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {req.document_name}
                            {req.is_required
                              ? <span className="text-red-500 ml-1">*</span>
                              : <span className="ml-2 text-xs text-slate-400 font-normal">Optional / Neprivaloma</span>
                            }
                          </p>
                          {req.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{req.description}</p>
                          )}
                        </div>
                        {req.is_required && (
                          <span className="shrink-0 px-2 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full">
                            Required
                          </span>
                        )}
                      </div>

                      {uploaded ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-emerald-800 truncate">{uploaded.file_name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setUploads((prev) => { const n = { ...prev }; delete n[req.id]; return n; });
                              if (fileInputRefs.current[req.id]) fileInputRefs.current[req.id]!.value = "";
                            }}
                            className="ml-auto text-xs text-slate-400 hover:text-red-500 shrink-0"
                          >
                            Replace
                          </button>
                        </div>
                      ) : (
                        <div>
                          <label className={`flex items-center gap-2 px-3 py-2.5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                            pending ? "border-slate-200 bg-slate-50" : "border-slate-300 hover:border-red-400 hover:bg-red-50"
                          }`}>
                            {pending ? (
                              <svg className="w-4 h-4 text-slate-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                            )}
                            <span className="text-sm text-slate-500">
                              {pending ? "Uploading… / Įkeliama…" : "Click to upload / Spustelėkite norėdami įkelti"}
                            </span>
                            <input
                              ref={(el) => { fileInputRefs.current[req.id] = el; }}
                              type="file"
                              className="hidden"
                              disabled={pending}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(req.id, req.id, file);
                              }}
                            />
                          </label>
                          {uploadErr && <p className="mt-1 text-xs text-red-600">{uploadErr}</p>}
                          {docError && <p className="mt-1 text-xs text-red-600">{docError}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional documents */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">
                Additional documents / Papildomi dokumentai
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload any additional supporting documents (optional). / Įkelkite papildomus palaikomuosius dokumentus (neprivaloma).
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* Show already uploaded additional docs */}
              {Array.from({ length: additionalCount }).map((_, i) => {
                const key      = `additional_${i}`;
                const uploaded = uploads[key];
                const pending  = uploadPending[key];
                const uploadErr = uploadErrors[key];

                return (
                  <div key={key}>
                    {uploaded ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-emerald-800 truncate">{uploaded.file_name}</span>
                      </div>
                    ) : (
                      <div>
                        <label className={`flex items-center gap-2 px-3 py-2.5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          pending ? "border-slate-200 bg-slate-50" : "border-slate-300 hover:border-slate-400"
                        }`}>
                          {pending ? (
                            <svg className="w-4 h-4 text-slate-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          )}
                          <span className="text-sm text-slate-500">
                            {pending ? "Uploading… / Įkeliama…" : "Choose file / Pasirinkite failą"}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            disabled={pending}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileSelect(key, null, file);
                            }}
                          />
                        </label>
                        {uploadErr && <p className="mt-1 text-xs text-red-600">{uploadErr}</p>}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setAdditionalCount((c) => c + 1)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900
                  border border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors w-full"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload additional document / Įkelti papildomą dokumentą
              </button>
            </div>
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500 mb-4">
              By submitting this form I confirm that all information provided is accurate and complete to
              the best of my knowledge. / Pateikdamas(-a) šią anketą patvirtinu, kad visa pateikta
              informacija yra tiksli ir išsami pagal mano žinias.
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-6 bg-red-800 text-white font-semibold rounded-xl
                hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending
                ? "Submitting… / Pateikiama…"
                : alreadySubmitted
                  ? "Resubmit EDD Questionnaire / Pateikti EDD anketą iš naujo"
                  : "Submit EDD Questionnaire / Pateikti EDD anketą"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
