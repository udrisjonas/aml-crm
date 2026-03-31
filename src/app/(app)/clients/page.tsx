import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import ClientsTable, { type ClientRow } from "./ClientsTable";
import { extractRoleName } from "@/types/database";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;
const SORTABLE_COLS = new Set(["client_type", "risk_rating", "kyc_status", "created_at"]);

const SELECT = `
  id, client_type, kyc_status, risk_rating, client_status, created_at,
  assigned_broker_id, archived_at, termination_reason, termination_category,
  revival_requires_aml_review,
  individual_details(first_name, last_name),
  broker:profiles!assigned_broker_id(full_name)
`;

function normalizeRows(data: unknown[]): ClientRow[] {
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const details = Array.isArray(r.individual_details)
      ? (r.individual_details[0] ?? null)
      : (r.individual_details ?? null);
    const broker = Array.isArray(r.broker)
      ? (r.broker[0] ?? null)
      : (r.broker ?? null);
    return {
      id:                          r.id as string,
      client_type:                 r.client_type as string,
      kyc_status:                  r.kyc_status as string,
      risk_rating:                 r.risk_rating as string,
      client_status:               r.client_status as string,
      created_at:                  r.created_at as string,
      archived_at:                 (r.archived_at as string | null) ?? null,
      termination_reason:          (r.termination_reason as string | null) ?? null,
      termination_category:        (r.termination_category as string | null) ?? null,
      revival_requires_aml_review: (r.revival_requires_aml_review as boolean) ?? false,
      individual_details:          details as { first_name: string; last_name: string } | null,
      broker:                      broker as { full_name: string | null } | null,
    };
  });
}

function clientNameKey(row: ClientRow): string {
  if (!row.individual_details) return "";
  return `${row.individual_details.first_name} ${row.individual_details.last_name}`.toLowerCase();
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: {
    sort?: string;
    dir?: string;
    page?: string;
    search?: string;
    risk?: string;
    kyc?: string;
    archived?: string;
  };
}) {
  const supabase = createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
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

  const sort        = searchParams.sort ?? "created_at";
  const sortIsName  = sort === "name";
  const serverSort  = SORTABLE_COLS.has(sort) ? sort : "created_at";
  const dir         = (searchParams.dir === "asc" ? "asc" : "desc") as "asc" | "desc";
  const page        = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const search      = searchParams.search?.trim() ?? "";
  const riskFilter  = searchParams.risk?.trim() ?? "";
  const kycFilter   = searchParams.kyc?.trim() ?? "";
  const showArchived = searchParams.archived === "1";
  const offset      = (page - 1) * PAGE_SIZE;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(q: any) {
    q = q.eq("tenant_id", "default");
    if (isBroker && user) q = q.eq("assigned_broker_id", user.id);
    if (showArchived) {
      q = q.eq("client_status", "archived");
    } else {
      q = q.neq("client_status", "archived");
    }
    if (riskFilter) q = q.eq("risk_rating", riskFilter);
    if (kycFilter)  q = q.eq("kyc_status",  kycFilter);
    if (search) {
      q = q.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
        { referencedTable: "individual_details" }
      );
    }
    return q;
  }

  let clients: ClientRow[];
  let totalCount: number;
  let totalPages: number;

  if (sortIsName) {
    // Fetch all filtered rows, sort by name in memory, then slice for page
    let q = admin.from("clients").select(SELECT, { count: "exact" });
    q = applyFilters(q);
    const { data, count } = await q;
    const all = normalizeRows(data ?? []);
    all.sort((a, b) => {
      const an = clientNameKey(a), bn = clientNameKey(b);
      return dir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
    });
    totalCount = count ?? 0;
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    clients    = all.slice(offset, offset + PAGE_SIZE);
  } else {
    let q = admin.from("clients").select(SELECT, { count: "exact" });
    q = applyFilters(q);
    q = q.order(serverSort, { ascending: dir === "asc" });
    q = q.range(offset, offset + PAGE_SIZE - 1);
    const { data, count, error } = await q;
    if (error) console.error("[ClientsPage] fetch error:", error);
    clients    = normalizeRows(data ?? []);
    totalCount = count ?? 0;
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }

  return (
    <ClientsTable
      clients={clients}
      totalCount={totalCount}
      currentPage={page}
      totalPages={totalPages}
      sort={sort}
      dir={dir}
      search={search}
      riskFilter={riskFilter}
      kycFilter={kycFilter}
      showArchived={showArchived}
    />
  );
}
