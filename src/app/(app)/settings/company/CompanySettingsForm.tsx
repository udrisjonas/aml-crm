"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  saveCompanySettingsAction,
  type CompanySettingsData,
} from "@/app/actions/company";
import type { TenantTypeOption } from "./page";

interface CompanySettings {
  id?: string;
  tenant_id?: string;
  company_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  country?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  tenant_type?: string | null;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function CompanySettingsForm({
  initialSettings,
  tenantTypeOptions,
}: {
  initialSettings: CompanySettings | null;
  tenantTypeOptions: TenantTypeOption[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lang, setLang] = useState<"lt" | "en">("lt");

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "en" || stored === "lt") setLang(stored);
  }, []);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialSettings?.logo_url ?? null
  );

  const s = initialSettings;
  const [form, setForm] = useState<CompanySettingsData>({
    company_name:  s?.company_name  ?? "",
    address_line1: s?.address_line1 ?? "",
    address_line2: s?.address_line2 ?? "",
    city:          s?.city          ?? "",
    country:       s?.country       ?? "",
    postal_code:   s?.postal_code   ?? "",
    phone:         s?.phone         ?? "",
    email:         s?.email         ?? "",
    website:       s?.website       ?? "",
    logo_url:      s?.logo_url      ?? "",
    tenant_type:   s?.tenant_type   ?? "real_estate",
  });

  function bind(key: keyof CompanySettingsData) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function uploadLogo(file: File): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `company-logo.${ext}`;

    const { error } = await supabase.storage
      .from("company-assets")
      .upload(path, file, { upsert: true });
    if (error) throw new Error(`Logo upload failed: ${error.message}`);

    const { data } = supabase.storage
      .from("company-assets")
      .getPublicUrl(path);

    // Append a version timestamp so browsers always fetch the new image
    // instead of serving the cached version of the same filename.
    const url = `${data.publicUrl}?v=${Date.now()}`;
    console.log("[CompanySettings] logo uploaded, public URL:", url);
    return url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setErrorMessage("");

    startTransition(async () => {
      try {
        let logo_url = form.logo_url;

        if (logoFile) {
          logo_url = await uploadLogo(logoFile);
          setForm((prev) => ({ ...prev, logo_url }));
          setLogoFile(null);
        }

        await saveCompanySettingsAction({ ...form, logo_url });
        router.refresh();
        setStatus("success");
        setTimeout(() => setStatus("idle"), 5000);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Save failed");
        setStatus("error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status banner */}
      {status === "success" && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          Company settings saved successfully.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {errorMessage}
        </p>
      )}

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            Company Logo
          </h2>
        </div>
        <div className="p-6 flex items-center gap-6">
          {/* Preview */}
          <div
            className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300
              flex items-center justify-center bg-slate-50 overflow-hidden shrink-0"
          >
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Company logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <svg
                className="w-8 h-8 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="sr-only"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300
                rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              {logoPreview ? "Change logo" : "Upload logo"}
            </button>
            <p className="text-xs text-slate-400 mt-2">
              PNG, JPG, SVG or WebP. Max 2 MB.
            </p>
            {logoFile && (
              <p className="text-xs text-blue-600 mt-1">
                {logoFile.name} — will upload on save
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Company details ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            Company Details
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Company name
            </label>
            <input
              type="text"
              {...bind("company_name")}
              placeholder="Acme Brokers Ltd"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Address line 1
            </label>
            <input
              type="text"
              {...bind("address_line1")}
              placeholder="123 Main Street"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Address line 2
            </label>
            <input
              type="text"
              {...bind("address_line2")}
              placeholder="Suite 400 (optional)"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                City
              </label>
              <input
                type="text"
                {...bind("city")}
                placeholder="London"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Country
              </label>
              <input
                type="text"
                {...bind("country")}
                placeholder="United Kingdom"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Postal code
              </label>
              <input
                type="text"
                {...bind("postal_code")}
                placeholder="EC1A 1BB"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact details ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            Contact Details
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                {...bind("phone")}
                placeholder="+44 20 1234 5678"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                {...bind("email")}
                placeholder="info@acmebrokers.com"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Website
            </label>
            <input
              type="url"
              {...bind("website")}
              placeholder="https://www.acmebrokers.com"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* ── AML Configuration ────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">AML Configuration</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Determines questionnaire templates, required fields, and risk scoring rules
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Organisation type
            </label>
            <select
              value={form.tenant_type}
              onChange={(e) => setForm((prev) => ({ ...prev, tenant_type: e.target.value }))}
              className={inputClass}
            >
              {tenantTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {lang === "lt" ? opt.display_name_lt : opt.display_name_en}
                </option>
              ))}
            </select>
          </div>
          {form.tenant_type && (
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">
                Changing organisation type updates the KYC questionnaire fields and risk scoring rules
                applied to new clients. Existing client data is not affected.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
            text-white text-sm font-medium rounded-lg transition"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
