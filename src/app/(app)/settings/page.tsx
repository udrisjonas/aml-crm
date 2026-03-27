export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and compliance preferences</p>
      </div>

      {/* Profile section */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Profile</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">First name</label>
              <input
                type="text"
                defaultValue="Agent"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name</label>
              <input
                type="text"
                defaultValue="Name"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
            <input
              type="email"
              defaultValue="agent@brokerage.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="pt-2">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              Save changes
            </button>
          </div>
        </div>
      </section>

      {/* Compliance preferences */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Compliance Preferences</h2>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: "Email alerts for high-risk clients", desc: "Receive an email when a client is flagged high-risk" },
            { label: "Weekly compliance digest", desc: "Summary of activity sent every Monday morning" },
            { label: "Document expiry reminders", desc: "Notify 30 days before ID documents expire" },
          ].map((pref, i) => (
            <div key={i} className="flex items-start justify-between py-1">
              <div>
                <p className="text-sm font-medium text-slate-800">{pref.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{pref.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-6 shrink-0">
                <input type="checkbox" defaultChecked={i !== 1} className="sr-only peer" />
                <div className="w-10 h-5 bg-slate-200 peer-checked:bg-blue-600 rounded-full transition
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                  after:rounded-full after:h-4 after:w-4 after:transition-all
                  peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100">
          <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">Delete account</p>
            <p className="text-xs text-slate-500 mt-0.5">Permanently remove your account and all associated data</p>
          </div>
          <button className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg border border-red-200 transition">
            Delete account
          </button>
        </div>
      </section>
    </div>
  );
}
