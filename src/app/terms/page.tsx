import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mb-8">
          ← AMLCycle
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Naudojimo sąlygos / Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-10">Paskutinį kartą atnaujinta / Last updated: 2025-01-01</p>
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <p>Šis puslapis bus papildytas naudojimo sąlygomis. / This page will be updated with full terms of service.</p>
          <p>
            <strong>Legalogix MB</strong><br />
            Linkmenų g. 19-123, Vilnius, LT-08217<br />
            info@amlcycle.com
          </p>
        </div>
      </div>
    </div>
  );
}
