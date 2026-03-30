"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  appointResponsiblePersonAction,
  updateResponsiblePersonAction,
  getAppointmentUploadUrlAction,
  getResponsiblePersonDocumentUrlAction,
} from "@/app/actions/documents";
import type { ResponsiblePerson, ProfileOption } from "./AmlDocumentsPage";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white";

// ── AppointModal ───────────────────────────────────────────────────────────────

interface AppointModalProps {
  profiles: ProfileOption[];
  onClose: () => void;
  onDone: () => void;
}

function AppointModal({ profiles, onClose, onDone }: AppointModalProps) {
  const [useExisting, setUseExisting] = useState(true);
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [regulatorName, setRegulatorName] = useState(
    "Finansinių nusikaltimų tyrimo tarnyba (FNTT)"
  );
  const [regulatorEmail, setRegulatorEmail] = useState("");
  const [regulatorPhone, setRegulatorPhone] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // When user is selected from profile list, auto-fill name
  function handleUserSelect(uid: string) {
    setUserId(uid);
    const p = profiles.find((p) => p.id === uid);
    if (p) setFullName(p.full_name ?? p.email);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = useExisting ? (profiles.find((p) => p.id === userId)?.full_name ?? profiles.find((p) => p.id === userId)?.email ?? "") : fullName;
    if (!name.trim()) { setError("Full name is required"); return; }
    if (!position.trim()) { setError("Position is required"); return; }
    if (!appointmentDate) { setError("Appointment date is required"); return; }

    start(async () => {
      let docPath: string | null = null;
      let docName: string | null = null;

      if (docFile) {
        const safe = docFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `default/appointments/${Date.now()}-${safe}`;
        const { signedUrl, error: urlErr } = await getAppointmentUploadUrlAction(path);
        if (urlErr || !signedUrl) { setError(urlErr ?? "Failed to get upload URL"); return; }
        const res = await fetch(signedUrl, {
          method: "PUT",
          body: docFile,
          headers: { "Content-Type": docFile.type || "application/octet-stream" },
        });
        if (!res.ok) { setError("File upload failed"); return; }
        docPath = path;
        docName = docFile.name;
      }

      const { error: saveErr } = await appointResponsiblePersonAction({
        user_id:                   useExisting ? (userId || null) : null,
        full_name:                 name.trim(),
        position:                  position.trim(),
        appointment_date:          appointmentDate,
        appointment_document_path: docPath,
        appointment_document_name: docName,
        regulator_name:            regulatorName.trim() || "Finansinių nusikaltimų tyrimo tarnyba (FNTT)",
        regulator_contact_email:   regulatorEmail.trim() || null,
        regulator_contact_phone:   regulatorPhone.trim() || null,
      });

      if (saveErr) { setError(saveErr); return; }
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Appoint Responsible Person</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-200 text-sm">
            <button
              type="button"
              onClick={() => setUseExisting(true)}
              className={`flex-1 py-2 font-medium transition-colors ${useExisting ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Select existing user
            </button>
            <button
              type="button"
              onClick={() => setUseExisting(false)}
              className={`flex-1 py-2 font-medium transition-colors ${!useExisting ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Enter name manually
            </button>
          </div>

          {useExisting ? (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Select user *</label>
              <select
                className={inputCls}
                value={userId}
                onChange={(e) => handleUserSelect(e.target.value)}
                required
              >
                <option value="">— choose user —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email} {p.full_name ? `(${p.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Full name *</label>
              <input
                className={inputCls}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jonas Jonaitis"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Position / Title *</label>
            <input
              className={inputCls}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. MLRO, Compliance Officer"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Appointment date *</label>
            <input
              type="date"
              className={inputCls}
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Appointment document (optional)</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                {docFile ? docFile.name : "Choose file…"}
              </button>
              {docFile && (
                <button type="button" onClick={() => setDocFile(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <hr className="border-slate-100" />
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Regulator details</p>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Regulator name</label>
            <input
              className={inputCls}
              value={regulatorName}
              onChange={(e) => setRegulatorName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Contact email</label>
              <input
                type="email"
                className={inputCls}
                value={regulatorEmail}
                onChange={(e) => setRegulatorEmail(e.target.value)}
                placeholder="info@fntt.lt"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Contact phone</label>
              <input
                className={inputCls}
                value={regulatorPhone}
                onChange={(e) => setRegulatorPhone(e.target.value)}
                placeholder="+370 5 271 7771"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Appoint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── UpdateModal ────────────────────────────────────────────────────────────────

interface UpdateModalProps {
  person: ResponsiblePerson;
  onClose: () => void;
  onDone: () => void;
}

function UpdateModal({ person, onClose, onDone }: UpdateModalProps) {
  const [position, setPosition] = useState(person.position);
  const [regulatorName, setRegulatorName] = useState(person.regulator_name);
  const [regulatorEmail, setRegulatorEmail] = useState(person.regulator_contact_email ?? "");
  const [regulatorPhone, setRegulatorPhone] = useState(person.regulator_contact_phone ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const { error: err } = await updateResponsiblePersonAction(person.id, {
        position:                  position.trim() || person.position,
        regulator_name:            regulatorName.trim() || person.regulator_name,
        regulator_contact_email:   regulatorEmail.trim() || null,
        regulator_contact_phone:   regulatorPhone.trim() || null,
      });
      if (err) { setError(err); return; }
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Update Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Position / Title</label>
            <input className={inputCls} value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <hr className="border-slate-100" />
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Regulator details</p>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Regulator name</label>
            <input className={inputCls} value={regulatorName} onChange={(e) => setRegulatorName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Contact email</label>
              <input type="email" className={inputCls} value={regulatorEmail} onChange={(e) => setRegulatorEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Contact phone</label>
              <input className={inputCls} value={regulatorPhone} onChange={(e) => setRegulatorPhone(e.target.value)} />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── ActivePersonCard ──────────────────────────────────────────────────────────

interface ActivePersonCardProps {
  person: ResponsiblePerson;
  canManage: boolean;
  onUpdate: () => void;
  onAppoint: () => void;
}

function ActivePersonCard({ person, canManage, onUpdate, onAppoint }: ActivePersonCardProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!person.appointment_document_path) return;
    setDownloading(true);
    const { url, error } = await getResponsiblePersonDocumentUrlAction(person.appointment_document_path);
    setDownloading(false);
    if (error || !url) { alert(error ?? "Failed to get download URL"); return; }
    window.open(url, "_blank");
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              Active
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{person.full_name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{person.position}</p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onUpdate}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Update details
            </button>
            <button
              onClick={onAppoint}
              className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700"
            >
              Appoint new person
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">Appointed since</span>
          <span className="text-slate-800 font-medium">{fmt(person.appointment_date)}</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">Regulator</span>
          <span className="text-slate-800 text-right max-w-[180px]">{person.regulator_name}</span>
        </div>
        {person.regulator_contact_email && (
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Regulator email</span>
            <a href={`mailto:${person.regulator_contact_email}`} className="text-blue-600 hover:underline">
              {person.regulator_contact_email}
            </a>
          </div>
        )}
        {person.regulator_contact_phone && (
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Regulator phone</span>
            <a href={`tel:${person.regulator_contact_phone}`} className="text-slate-800 hover:underline">
              {person.regulator_contact_phone}
            </a>
          </div>
        )}
        {person.appointed_by_name && (
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Appointed by</span>
            <span className="text-slate-800">{person.appointed_by_name}</span>
          </div>
        )}
      </div>

      {person.appointment_document_path && (
        <div className="mt-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            {downloading ? "Loading…" : (person.appointment_document_name ?? "Download appointment document")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── HistoryTable ──────────────────────────────────────────────────────────────

function HistoryTable({ persons }: { persons: ResponsiblePerson[] }) {
  if (persons.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Appointment history</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Position</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Appointed</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Terminated</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {persons.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.full_name}</td>
                <td className="px-4 py-3 text-slate-600">{p.position}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(p.appointment_date)}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(p.termination_date)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    p.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {p.status === "active" ? "Active" : "Terminated"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ResponsiblePersonTabProps {
  responsiblePersons: ResponsiblePerson[];
  profiles: ProfileOption[];
  canManage: boolean;
}

export default function ResponsiblePersonTab({
  responsiblePersons,
  profiles,
  canManage,
}: ResponsiblePersonTabProps) {
  const [showAppoint, setShowAppoint] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  const active = responsiblePersons.find((p) => p.status === "active") ?? null;

  return (
    <div>
      {/* Warning banner when no active person */}
      {!active && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <span className="text-red-500 mt-0.5 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-red-700">
              Warning: No responsible person appointed
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              Įspėjimas: Atsakingas asmuo nėra paskirtas. Paskyrkite atsakingą asmenį kuo greičiau.
            </p>
            {canManage && (
              <button
                onClick={() => setShowAppoint(true)}
                className="mt-3 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Appoint responsible person
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active person card */}
      {active && (
        <ActivePersonCard
          person={active}
          canManage={canManage}
          onUpdate={() => setShowUpdate(true)}
          onAppoint={() => setShowAppoint(true)}
        />
      )}

      {/* No active person but can manage — show appoint button outside banner */}
      {!active && !canManage && (
        <div className="text-sm text-slate-500 text-center py-8">
          No responsible person has been appointed yet.
        </div>
      )}

      {/* Appointment history */}
      <HistoryTable persons={responsiblePersons} />

      {/* Modals */}
      {showAppoint && (
        <AppointModal
          profiles={profiles}
          onClose={() => setShowAppoint(false)}
          onDone={() => setShowAppoint(false)}
        />
      )}
      {showUpdate && active && (
        <UpdateModal
          person={active}
          onClose={() => setShowUpdate(false)}
          onDone={() => setShowUpdate(false)}
        />
      )}
    </div>
  );
}
