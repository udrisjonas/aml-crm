import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRoleName } from "@/types/database";
import Link from "next/link";
import RelativeTime from "../dashboard/RelativeTime";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type RecentChange = {
  id: string;
  client_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
};

function formatFieldName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { page?: string; field?: string };
}) {
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

  const roleNames = (userRoles ?? []).map((r) => extractRoleName(r));

  const isBroker =
    roleNames.includes("broker") &&
    !roleNames.includes("system_admin") &&
    !roleNames.includes("aml_officer") &&
    !roleNames.includes("senior_manager");

  // Scoped client IDs
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

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const fieldFilter = searchParams.field?.trim() ?? "";

  const offset = (page - 1) * PAGE_SIZE;

  let q = admin
    .from("client_field_changes")
    .select("id, client_id, field_name, old_value, new_value, changed_by, changed_at", {
      count: "exact",
    })
    .in("client_id", safeIds)
    .order("changed_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (fieldFilter) {
    q = q.ilike("field_name", `%${fieldFilter}%`) as typeof q;
  }

  const { data: changes, count } = await q.returns<RecentChange[]>();

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  // Resolve actor names and client names
  const actorIds = Array.from(
    new Set((changes ?? []).map((c) => c.changed_by).filter(Boolean) as string[])
  );
  const clientIds = Array.from(new Set((changes ?? []).map((c) => c.client_id)));

  const [{ data: actorProfiles }, { data: activityClients }] = await Promise.all([
    actorIds.length > 0
      ? admin.from("profiles").select("id, full_name").in("id", actorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    clientIds.length > 0
      ? admin
          .from("clients")
          .select("id, individual_details(first_name, last_name)")
          .in("id", clientIds)
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

  const CLIENT_STATUS_FIELDS = new Set([
    "client_status",
    "kyc_status",
    "edd_status",
    "risk_rating",
    "termination_category",
    "termination_reason",
  ]);

  function buildPageHref(p: number) {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (fieldFilter) params.set("field", fieldFilter);
    return `/activity?${params.toString()}`;
  }

  return (
    <div className="p-6 lg:p-8 max-w-screen-xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity History</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            All client field changes
            {count != null ? ` — ${count.toLocaleString()} total` : ""}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
          ← Dashboard
        </Link>
      </div>

      {/* Filter bar */}
      <form method="GET" action="/activity" className="mb-5 flex gap-3">
        <input
          type="text"
          name="field"
          defaultValue={fieldFilter}
          placeholder="Filter by field name…"
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input type="hidden" name="page" value="1" />
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
        >
          Filter
        </button>
        {fieldFilter && (
          <Link
            href="/activity"
            className="px-4 py-2 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {(changes ?? []).length === 0 ? (
          <div className="px-5 py-16 text-center text-slate-400 text-sm">
            No activity found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Field
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                  Old value
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                  New value
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Changed by
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(changes ?? []).map((item) => {
                const isStatusChange = CLIENT_STATUS_FIELDS.has(item.field_name);
                return (
                  <tr
                    key={item.id}
                    className={isStatusChange ? "bg-amber-50" : "hover:bg-slate-50"}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/clients/${item.client_id}`}
                        className="font-medium text-slate-800 hover:underline"
                      >
                        {clientNameMap[item.client_id] ?? "Unknown"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {formatFieldName(item.field_name)}
                    </td>
                    <td className="px-5 py-3 text-slate-400 hidden sm:table-cell max-w-[140px] truncate">
                      {item.old_value ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-700 hidden sm:table-cell max-w-[140px] truncate">
                      {item.new_value ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">
                      {item.changed_by
                        ? (actorMap[item.changed_by] ?? "Unknown")
                        : <span className="italic text-slate-300">system</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                      <RelativeTime iso={item.changed_at} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildPageHref(page - 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildPageHref(page + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
