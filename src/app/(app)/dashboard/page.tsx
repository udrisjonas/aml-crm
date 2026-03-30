import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRoleName } from "@/types/database";
import Link from "next/link";
import ClientSearchBar from "./ClientSearchBar";
import DismissButton from "./DismissButton";
import RelativeTime from "./RelativeTime";

export const dynamic = "force-dynamic";

type ComplianceDocOverdue = {
  id: string;
  title: string;
  next_review_date: string | null;
  status: string;
  document_type: string;
};

type RecentChange = {
  id: string;
  client_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
};

const PRIORITY_ORDER = { red: 0, amber: 1, blue: 2 } as const;

const NOTIF_COLOR: Record<"red" | "amber" | "blue", string> = {
  red: "border-l-red-500 bg-red-50",
  amber: "border-l-amber-500 bg-amber-50",
  blue: "border-l-blue-500 bg-blue-50",
};

const NOTIF_DOT: Record<"red" | "amber" | "blue", string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
};

interface NotifItem {
  key: string;
  type: string;
  referenceId: string;
  clientId?: string;
  href?: string;
  title: string;
  subtitle?: string;
  priority: "red" | "amber" | "blue";
  createdAt: string;
  nonDismissible?: boolean;
}

function extractClientName(details: unknown): string {
  const d = Array.isArray(details) ? details[0] : details;
  if (!d || typeof d !== "object") return "Unknown";
  const obj = d as { first_name?: string; last_name?: string };
  return `${obj.first_name ?? ""} ${obj.last_name ?? ""}`.trim() || "Unknown";
}

function formatFieldName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  color: "blue" | "amber" | "red" | "emerald";
  sub: string;
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-xs mt-1 opacity-70">{sub}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames = (userRoles ?? []).map(
    (r) => extractRoleName(r)
  );

  const isBroker =
    roleNames.includes("broker") &&
    !roleNames.includes("system_admin") &&
    !roleNames.includes("aml_officer") &&
    !roleNames.includes("senior_manager");

  // Build scoped client ID list
  let scopeQ = admin
    .from("clients")
    .select("id")
    .eq("tenant_id", "default");
  if (isBroker) {
    scopeQ = scopeQ.eq("assigned_broker_id", user.id) as typeof scopeQ;
  }
  const { data: scopedClientsData } = await scopeQ;
  const scopedClientIds = (scopedClientsData ?? []).map(
    (c: { id: string }) => c.id
  );
  const safeIds =
    scopedClientIds.length > 0
      ? scopedClientIds
      : ["00000000-0000-0000-0000-000000000000"];

  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    { count: activeCount },
    { count: pendingCount },
    { count: highRiskCount },
    { count: newThisMonthCount },
    { data: kycSubmitted },
    { data: highRiskPending },
    { data: eddTriggered },
    { data: expiredTokens },
    { data: recentDocs },
    { data: overdueReviews },
    { data: dismissed },
    { data: overdueComplianceDocs },
    { data: activeResponsiblePersons },
    { data: recentChanges },
  ] = await Promise.all([
    // Stats
    admin
      .from("clients")
      .select("*", { count: "exact", head: true })
      .in("id", safeIds)
      .eq("client_status", "active"),
    admin
      .from("clients")
      .select("*", { count: "exact", head: true })
      .in("id", safeIds)
      .in("kyc_status", ["client_completed", "submitted", "under_review"]),
    admin
      .from("clients")
      .select("*", { count: "exact", head: true })
      .in("id", safeIds)
      .eq("risk_rating", "high"),
    admin
      .from("clients")
      .select("*", { count: "exact", head: true })
      .in("id", safeIds)
      .gte("created_at", startOfMonth),

    // Notification sources
    admin
      .from("clients")
      .select(
        "id, kyc_status, updated_at, created_at, individual_details(first_name, last_name)"
      )
      .in("id", safeIds)
      .in("kyc_status", ["client_completed", "submitted"])
      .order("updated_at", { ascending: false })
      .limit(20),
    admin
      .from("clients")
      .select(
        "id, risk_rating, kyc_status, updated_at, individual_details(first_name, last_name)"
      )
      .in("id", safeIds)
      .eq("risk_rating", "high")
      .neq("kyc_status", "verified")
      .neq("kyc_status", "rejected")
      .order("updated_at", { ascending: false })
      .limit(20),
    admin
      .from("clients")
      .select(
        "id, edd_status, updated_at, individual_details(first_name, last_name)"
      )
      .in("id", safeIds)
      .not("edd_status", "is", null)
      .neq("edd_status", "completed")
      .order("updated_at", { ascending: false })
      .limit(20),
    admin
      .from("client_kyc_tokens")
      .select("id, client_id, expires_at")
      .in("client_id", safeIds)
      .eq("is_active", true)
      .eq("token_type", "kyc")
      .lt("expires_at", now.toISOString())
      .order("expires_at", { ascending: false })
      .limit(20),
    admin
      .from("client_documents")
      .select("id, client_id, document_type, created_at")
      .in("client_id", safeIds)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("periodic_review_schedule")
      .select("id, client_id, next_review_due")
      .in("client_id", safeIds)
      .eq("status", "pending")
      .lt("next_review_due", now.toISOString())
      .order("next_review_due", { ascending: true })
      .limit(20),

    // Dismissed set for this user
    admin
      .from("notification_dismissals")
      .select("notification_type, reference_id")
      .eq("user_id", user.id),

    // Overdue compliance documents
    admin
      .from("compliance_documents")
      .select("id, document_type, title, next_review_date, status")
      .eq("tenant_id", "default")
      .eq("status", "active")
      .not("next_review_date", "is", null)
      .lt("next_review_date", now.toISOString().slice(0, 10))
      .order("next_review_date", { ascending: true })
      .limit(20)
      .returns<ComplianceDocOverdue[]>(),

    // Active responsible persons
    admin
      .from("responsible_persons")
      .select("id")
      .eq("tenant_id", "default")
      .eq("status", "active")
      .limit(1),

    // Activity feed
    admin
      .from("client_field_changes")
      .select(
        "id, client_id, field_name, old_value, new_value, changed_by, changed_at"
      )
      .in("client_id", safeIds)
      .order("changed_at", { ascending: false })
      .limit(30)
      .returns<RecentChange[]>(),
  ]);

  // Build dismissed lookup set
  const dismissedSet = new Set(
    (dismissed ?? []).map(
      (d) => `${d.notification_type}::${d.reference_id}`
    )
  );

  // Assemble notifications
  const rawNotifs: NotifItem[] = [];

  for (const c of kycSubmitted ?? []) {
    const key = `KYC_SUBMITTED::${c.id}`;
    if (!dismissedSet.has(key)) {
      rawNotifs.push({
        key,
        type: "KYC_SUBMITTED",
        referenceId: c.id,
        clientId: c.id,
        title: "KYC form submitted — awaiting review",
        subtitle: extractClientName(c.individual_details),
        priority: "blue",
        createdAt: c.updated_at ?? c.created_at,
      });
    }
  }

  for (const c of highRiskPending ?? []) {
    const key = `HIGH_RISK_PENDING::${c.id}`;
    if (!dismissedSet.has(key)) {
      rawNotifs.push({
        key,
        type: "HIGH_RISK_PENDING",
        referenceId: c.id,
        clientId: c.id,
        title: "High risk client — review required",
        subtitle: extractClientName(c.individual_details),
        priority: "red",
        createdAt: c.updated_at,
      });
    }
  }

  for (const c of eddTriggered ?? []) {
    const key = `EDD_TRIGGERED::${c.id}`;
    if (!dismissedSet.has(key)) {
      rawNotifs.push({
        key,
        type: "EDD_TRIGGERED",
        referenceId: c.id,
        clientId: c.id,
        title: "Enhanced due diligence triggered",
        subtitle: extractClientName(c.individual_details),
        priority: "red",
        createdAt: c.updated_at,
      });
    }
  }

  for (const t of expiredTokens ?? []) {
    const key = `TOKEN_EXPIRED::${t.id}`;
    if (!dismissedSet.has(key)) {
      rawNotifs.push({
        key,
        type: "TOKEN_EXPIRED",
        referenceId: t.id,
        clientId: t.client_id,
        title: "KYC link expired",
        subtitle: `Expired ${new Date(t.expires_at).toLocaleDateString("en-GB")}`,
        priority: "amber",
        createdAt: t.expires_at,
      });
    }
  }

  for (const doc of recentDocs ?? []) {
    const key = `DOCUMENT_UPLOADED::${doc.id}`;
    if (!dismissedSet.has(key)) {
      rawNotifs.push({
        key,
        type: "DOCUMENT_UPLOADED",
        referenceId: doc.id,
        clientId: doc.client_id,
        title: "Document uploaded",
        subtitle: doc.document_type?.replace(/_/g, " ") ?? "Document",
        priority: "blue",
        createdAt: doc.created_at,
      });
    }
  }

  for (const r of overdueReviews ?? []) {
    const key = `PERIODIC_REVIEW_OVERDUE::${r.id}`;
    if (!dismissedSet.has(key)) {
      rawNotifs.push({
        key,
        type: "PERIODIC_REVIEW_OVERDUE",
        referenceId: r.id,
        clientId: r.client_id,
        title: "Periodic review overdue",
        subtitle: `Due ${new Date(r.next_review_due).toLocaleDateString("en-GB")}`,
        priority: "red",
        createdAt: r.next_review_due,
      });
    }
  }

  // No responsible person (non-dismissible)
  if ((activeResponsiblePersons ?? []).length === 0) {
    rawNotifs.push({
      key: "NO_RESPONSIBLE_PERSON::default",
      type: "NO_RESPONSIBLE_PERSON",
      referenceId: "default",
      href: "/documents/aml?tab=responsible",
      title: "No responsible person appointed",
      subtitle: "An AML responsible person must be appointed immediately",
      priority: "red",
      createdAt: now.toISOString(),
      nonDismissible: true,
    });
  }

  // Overdue compliance documents
  for (const doc of (overdueComplianceDocs ?? []) as Array<{ id: string; title: string; next_review_date: string | null; status: string }>) {
    const key = `COMPLIANCE_DOC_OVERDUE::${doc.id}`;
    if (!dismissedSet.has(key)) {
      rawNotifs.push({
        key,
        type: "COMPLIANCE_DOC_OVERDUE",
        referenceId: doc.id,
        href: "/documents/aml",
        title: "Compliance document review overdue",
        subtitle: doc.title,
        priority: "amber",
        createdAt: doc.next_review_date ?? now.toISOString(),
      });
    }
  }

  rawNotifs.sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const notifications = rawNotifs.slice(0, 20);

  // Activity feed — resolve actor and client names
  const actorIds = Array.from(new Set(
    (recentChanges ?? [])
      .map((c) => c.changed_by)
      .filter(Boolean) as string[]
  ));

  const activityClientIds = Array.from(new Set(
    (recentChanges ?? []).map((c) => c.client_id)
  ));

  const [{ data: actorProfiles }, { data: activityClients }] =
    await Promise.all([
      actorIds.length > 0
        ? admin.from("profiles").select("id, full_name").in("id", actorIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      activityClientIds.length > 0
        ? admin
            .from("clients")
            .select("id, individual_details(first_name, last_name)")
            .in("id", activityClientIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

  const actorMap: Record<string, string | null> = Object.fromEntries(
    (actorProfiles ?? []).map((p) => [p.id, p.full_name])
  );

  const clientNameMap: Record<string, string> = {};
  for (const c of activityClients ?? []) {
    const row = c as { id: string; individual_details: unknown };
    const details = Array.isArray(row.individual_details)
      ? row.individual_details[0]
      : row.individual_details;
    if (details && typeof details === "object") {
      const d = details as { first_name?: string; last_name?: string };
      clientNameMap[row.id] =
        `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Unknown";
    }
  }

  const activityItems = (recentChanges ?? []).slice(0, 15).map((c) => ({
    id: c.id,
    clientId: c.client_id,
    clientName: clientNameMap[c.client_id] ?? "Unknown",
    fieldName: c.field_name,
    changedAt: c.changed_at,
    actorName: c.changed_by ? (actorMap[c.changed_by] ?? null) : null,
  }));

  // Static news
  const newsItems = [
    {
      id: "1",
      titleEn: "New AML regulations effective Q2 2026",
      titleLt: "Nauji PNPĮ reglamentai įsigalioja 2026 m. II ketv.",
      date: "2026-03-15",
    },
    {
      id: "2",
      titleEn: "Updated KYC requirements for legal entities",
      titleLt: "Atnaujinti KYC reikalavimai juridiniams asmenims",
      date: "2026-02-28",
    },
    {
      id: "3",
      titleEn: "FATF grey list updates — March 2026",
      titleLt: "FATF pilkojo sąrašo atnaujinimai — 2026 kovas",
      date: "2026-03-01",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto">
      {/* Header + search */}
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            AML compliance overview
          </p>
        </div>
        <ClientSearchBar />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Clients"
          value={activeCount ?? 0}
          color="blue"
          sub="total active"
        />
        <StatCard
          label="Pending Reviews"
          value={pendingCount ?? 0}
          color="amber"
          sub="awaiting action"
        />
        <StatCard
          label="High Risk"
          value={highRiskCount ?? 0}
          color="red"
          sub="clients flagged"
        />
        <StatCard
          label="New This Month"
          value={newThisMonthCount ?? 0}
          color="emerald"
          sub="onboarded"
        />
      </div>

      {/* Main grid: 60 / 40 */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Notifications — 60% */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                Notifications
              </h2>
              {notifications.length > 0 && (
                <span className="text-xs font-medium bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5">
                  {notifications.length}
                </span>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-400 text-sm">
                No pending notifications
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li
                    key={n.key}
                    className={`flex items-start gap-3 px-5 py-3.5 border-l-4 ${NOTIF_COLOR[n.priority]}`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${NOTIF_DOT[n.priority]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-snug">
                        {n.title}
                      </p>
                      {n.subtitle && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {n.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(n.href || n.clientId) && (
                        <Link
                          href={n.href ?? `/clients/${n.clientId}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                      )}
                      {!n.nonDismissible && (
                        <DismissButton
                          notificationType={n.type}
                          referenceId={n.referenceId}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column — 40% */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Activity feed */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                Recent Activity
              </h2>
            </div>
            {activityItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                No recent activity
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {activityItems.map((item) => (
                  <li
                    key={item.id}
                    className="px-5 py-3.5 flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-slate-500 text-xs font-semibold">
                        {item.clientName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/clients/${item.clientId}`}
                        className="text-sm font-medium text-slate-800 hover:underline truncate block"
                      >
                        {item.clientName}
                      </Link>
                      <p className="text-xs text-slate-500 truncate">
                        {formatFieldName(item.fieldName)} changed
                        {item.actorName ? ` by ${item.actorName}` : ""}
                      </p>
                    </div>
                    <RelativeTime iso={item.changedAt} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* AML News */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                AML News
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {newsItems.map((item) => (
                <li key={item.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-slate-800 leading-snug">
                    {item.titleEn}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 italic">
                    {item.titleLt}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(item.date).toLocaleDateString("en-GB")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
