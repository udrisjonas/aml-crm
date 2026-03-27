export default function DashboardPage() {
  const stats = [
    { label: "Active Clients", value: "142", delta: "+12 this month", color: "blue" },
    { label: "Pending Reviews", value: "23", delta: "8 due this week", color: "amber" },
    { label: "Documents Collected", value: "891", delta: "+47 this month", color: "emerald" },
    { label: "Flagged Cases", value: "4", delta: "2 require action", color: "red" },
  ];

  const recentActivity = [
    { client: "Sophie Martin", action: "ID document uploaded", time: "2 min ago", status: "review" },
    { client: "James Whitmore", action: "KYC form completed", time: "1 hr ago", status: "complete" },
    { client: "Lena Fischer", action: "Risk assessment flagged", time: "3 hr ago", status: "flagged" },
    { client: "Carlos Ruiz", action: "Onboarding started", time: "Yesterday", status: "pending" },
    { client: "Amara Diallo", action: "Beneficial owner form signed", time: "Yesterday", status: "complete" },
  ];

  const statusBadge: Record<string, string> = {
    review: "bg-amber-100 text-amber-700",
    complete: "bg-emerald-100 text-emerald-700",
    flagged: "bg-red-100 text-red-700",
    pending: "bg-slate-100 text-slate-600",
  };

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your AML compliance activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-5 ${colorMap[stat.color]}`}
          >
            <p className="text-sm font-medium opacity-80">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
            <p className="text-xs mt-2 opacity-70">{stat.delta}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Recent Activity</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-slate-500 text-xs font-semibold">
                    {item.client.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.client}</p>
                  <p className="text-xs text-slate-500">{item.action}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge[item.status]}`}>
                  {item.status}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
