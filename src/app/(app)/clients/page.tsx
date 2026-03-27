export default function ClientsPage() {
  const clients = [
    { name: "Sophie Martin", type: "Individual", risk: "Low", status: "Active", joined: "Jan 12, 2025", kyc: "Verified" },
    { name: "Whitmore Properties Ltd", type: "Corporate", risk: "Medium", status: "Active", joined: "Feb 3, 2025", kyc: "Verified" },
    { name: "Lena Fischer", type: "Individual", risk: "High", status: "Under Review", joined: "Mar 1, 2025", kyc: "Pending" },
    { name: "Carlos Ruiz", type: "Individual", risk: "Low", status: "Onboarding", joined: "Mar 20, 2025", kyc: "Pending" },
    { name: "Amara Diallo", type: "Individual", risk: "Low", status: "Active", joined: "Dec 5, 2024", kyc: "Verified" },
    { name: "Solaris Invest GmbH", type: "Corporate", risk: "Medium", status: "Active", joined: "Nov 18, 2024", kyc: "Verified" },
  ];

  const riskBadge: Record<string, string> = {
    Low: "bg-emerald-100 text-emerald-700",
    Medium: "bg-amber-100 text-amber-700",
    High: "bg-red-100 text-red-700",
  };

  const statusBadge: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700",
    "Under Review": "bg-red-100 text-red-700",
    Onboarding: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-1">Manage client profiles and KYC records</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          + Add Client
        </button>
      </div>

      {/* Search / filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="search"
          placeholder="Search clients…"
          className="flex-1 max-w-sm px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-800
            placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
          <option value="">All risk levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Name</th>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Type</th>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Risk</th>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Status</th>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">KYC</th>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Joined</th>
              <th className="px-6 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-slate-500 text-xs font-semibold">
                        {client.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                    <span className="font-medium text-slate-800">{client.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{client.type}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${riskBadge[client.risk]}`}>
                    {client.risk}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge[client.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{client.kyc}</td>
                <td className="px-6 py-4 text-slate-500">{client.joined}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
