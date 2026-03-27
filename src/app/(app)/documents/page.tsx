export default function DocumentsPage() {
  const documents = [
    { name: "Sophie Martin — Passport.pdf", client: "Sophie Martin", type: "ID Document", uploaded: "Mar 15, 2025", status: "Verified" },
    { name: "Whitmore Properties — Certificate of Incorporation.pdf", client: "Whitmore Properties Ltd", type: "Corporate Doc", uploaded: "Mar 10, 2025", status: "Verified" },
    { name: "Lena Fischer — Source of Funds Declaration.pdf", client: "Lena Fischer", type: "Financial", uploaded: "Mar 21, 2025", status: "Under Review" },
    { name: "Carlos Ruiz — Utility Bill.pdf", client: "Carlos Ruiz", type: "Proof of Address", uploaded: "Mar 22, 2025", status: "Pending" },
    { name: "Amara Diallo — Beneficial Owner Form.pdf", client: "Amara Diallo", type: "KYC Form", uploaded: "Mar 18, 2025", status: "Verified" },
  ];

  const statusBadge: Record<string, string> = {
    Verified: "bg-emerald-100 text-emerald-700",
    "Under Review": "bg-amber-100 text-amber-700",
    Pending: "bg-slate-100 text-slate-600",
    Rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500 text-sm mt-1">Review and manage compliance documents</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          Upload Document
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-6">
        <input
          type="search"
          placeholder="Search documents…"
          className="flex-1 max-w-sm px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-800
            placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
          <option value="">All types</option>
          <option>ID Document</option>
          <option>Corporate Doc</option>
          <option>Financial</option>
          <option>Proof of Address</option>
          <option>KYC Form</option>
        </select>
        <select className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
          <option value="">All statuses</option>
          <option>Verified</option>
          <option>Under Review</option>
          <option>Pending</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Document</th>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Client</th>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Type</th>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Uploaded</th>
              <th className="text-left px-6 py-3.5 font-medium text-slate-600">Status</th>
              <th className="px-6 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-800 truncate max-w-xs">{doc.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{doc.client}</td>
                <td className="px-6 py-4 text-slate-600">{doc.type}</td>
                <td className="px-6 py-4 text-slate-500">{doc.uploaded}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge[doc.status]}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">Review</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
