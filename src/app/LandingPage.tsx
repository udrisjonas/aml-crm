"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { submitContactFormAction } from "@/app/actions/landing";

// ── Types ─────────────────────────────────────────────────────────────────────

type Lang = "lt" | "en";

// ── Translations ──────────────────────────────────────────────────────────────

const copy = {
  nav: {
    features: { lt: "Funkcijos", en: "Features" },
    pricing:  { lt: "Kainos",    en: "Pricing"  },
    faq:      { lt: "DUK",       en: "FAQ"       },
    contact:  { lt: "Kontaktai", en: "Contact"   },
    login:    { lt: "Prisijungti", en: "Login"   },
  },
  hero: {
    headline:    { lt: "Pilnas AML ciklo valdymas",                              en: "Full AML Cycle Management"                                          },
    sub:         { lt: "Skirta nekilnojamojo turto brokeriams, buhalteriams ir kitiems įpareigotiems subjektams pagal ES pinigų plovimo prevencijos direktyvą", en: "For real estate brokers, accountants and other obliged entities under the EU Anti-Money Laundering Directive" },
    cta1:        { lt: "Pradėti nemokamai",  en: "Start for free"  },
    cta2:        { lt: "Sužinoti daugiau",   en: "Learn more"      },
  },
  features: {
    title: { lt: "Viskas ko reikia AML atitikčiai",      en: "Everything you need for AML compliance" },
    items: [
      { icon: "kyc",   title: { lt: "KYC valdymas",          en: "KYC Management"      }, desc: { lt: "Automatizuotas kliento tapatybės nustatymo procesas",                                     en: "Automated client identification process"                               } },
      { icon: "risk",  title: { lt: "Rizikos vertinimas",     en: "Risk Assessment"     }, desc: { lt: "Automatinis rizikos lygių skaičiavimas pagal ES direktyvą",                              en: "Automatic risk level calculation per EU directive"                     } },
      { icon: "edd",   title: { lt: "EDD procesai",           en: "EDD Processes"       }, desc: { lt: "Išplėstinė deramo patikrinimo procedūra aukštos rizikos klientams",                      en: "Enhanced due diligence for high-risk clients"                          } },
      { icon: "docs",  title: { lt: "Atitikties dokumentacija", en: "Compliance Documentation" }, desc: { lt: "Valdykite organizacijos AML politiką ir vidaus kontrolės procedūras su versijų istorija ir pakeitimų žurnalu.", en: "Manage your organization's AML policies and internal control procedures with version history and change log." } },
      { icon: "train", title: { lt: "Vaidmenų valdymas",       en: "Role Management"         }, desc: { lt: "Daugiavaidmenė platforma: brokeris, AML pareigūnas, vyresnysis vadovas ir administratorius. Tinka ir vienasmenėms įmonėms.", en: "Multi-role platform: broker, AML officer, senior manager and admin. Works for single-person companies too." } },
      { icon: "audit", title: { lt: "Periodinė peržiūra ir stebėjimas", en: "Periodic Review and Monitoring" }, desc: { lt: "Automatinis periodinių peržiūrų planavimas pagal kliento rizikos lygį bei veiklos ir sandorių stebėjimas pagal AML reikalavimus.", en: "Automatic periodic review scheduling based on client risk level, plus activity and transaction monitoring per AML requirements." } },
    ],
  },
  howItWorks: {
    title: { lt: "Kaip tai veikia", en: "How it works" },
    steps: [
      { num: "01", title: { lt: "Sukurkite klientą",          en: "Create client"        }, desc: { lt: "Įveskite kliento duomenis ir pradėkite KYC procesą",                en: "Enter client data and start the KYC process"             } },
      { num: "02", title: { lt: "Atlikite KYC",               en: "Complete KYC"         }, desc: { lt: "Klientas užpildo anketą saugia nuoroda arba broker'is įveda duomenis", en: "Client fills the questionnaire via secure link or broker enters data" } },
      { num: "03", title: { lt: "Įvertinkite riziką",         en: "Assess risk"          }, desc: { lt: "Sistema automatiškai apskaičiuoja rizikos lygį",                    en: "System automatically calculates the risk level"          } },
      { num: "04", title: { lt: "Patvirtinkite ir saugokite", en: "Approve and store"    }, desc: { lt: "AML pareigūnas patvirtina ir failas saugomas saugiai",             en: "AML officer approves and the file is stored securely"    } },
    ],
  },
  pricing: {
    title: { lt: "Planai ir kainos", en: "Plans and pricing" },
    trial: { lt: "14 dienų nemokamas bandymas. Kreditinė kortelė nereikalinga.", en: "14-day free trial. No credit card required." },
    perClient: { lt: "Papildomi klientai: €2/klientas/mėn", en: "Additional clients: €2/client/month" },
    popular: { lt: "Populiariausias", en: "Most popular" },
    cta: { lt: "Pradėti nemokamai", en: "Start free" },
    plans: [
      { id: "solo",         name: "Solo",         price: "29",  popular: false, clients: { lt: "iki 10 aktyvių klientų",   en: "up to 10 active clients"   },
        features: { lt: ["1 vartotojas", "KYC valdymas", "Dokumentų saugojimas", "Audito žurnalas", "El. pašto palaikymas"], en: ["1 user", "KYC management", "Document storage", "Audit log", "Email support"] } },
      { id: "standard",     name: "Standard",     price: "79",  popular: true,  clients: { lt: "iki 40 aktyvių klientų",   en: "up to 40 active clients"   },
        features: { lt: ["iki 5 vartotojų", "Viskas iš Solo", "Rizikos vertinimas", "EDD procesai", "Personalo mokymai", "Prioritetinis palaikymas"], en: ["up to 5 users", "Everything in Solo", "Risk assessment", "EDD processes", "Staff training", "Priority support"] } },
      { id: "professional", name: "Professional", price: "179", popular: false, clients: { lt: "iki 100 aktyvių klientų", en: "up to 100 active clients" },
        features: { lt: ["neriboti vartotojai", "Viskas iš Standard", "Ondato integracija", "API prieiga", "Dedikuotas palaikymas", "SLA garantija"], en: ["unlimited users", "Everything in Standard", "Ondato integration", "API access", "Dedicated support", "SLA guarantee"] } },
    ],
  },
  testimonials: {
    title: { lt: "Ką sako mūsų klientai", en: "What our clients say" },
    items: [
      { initials: "RK", name: "Rūta K.", company: { lt: "Nekilnojamojo turto agentūra", en: "Real estate agency" }, quote: { lt: "\"AMLCycle leido mums sutaupyti daugiau nei 10 valandų per savaitę, skirtų KYC dokumentacijos tvarkymui. Dabar visas procesas sklandus ir automatizuotas.\"", en: "\"AMLCycle saved us over 10 hours per week previously spent on KYC documentation. The entire process is now smooth and automated.\"" } },
      { initials: "TM", name: "Tomas M.", company: { lt: "Buhalterinės paslaugos", en: "Accounting services" }, quote: { lt: "\"Kaip buhalterinę įmonę mus labai džiugina, kad platforma atitinka visus reguliatorinius reikalavimus ir yra labai intuityvi naudoti.\"", en: "\"As an accounting firm we are very pleased that the platform meets all regulatory requirements and is very intuitive to use.\"" } },
      { initials: "LJ", name: "Laura J.", company: { lt: "Finansų konsultacijos", en: "Financial advisory" }, quote: { lt: "\"Audito žurnalo funkcija yra neįkainojama — dabar kiekvienas reguliatorių patikrinimas trunka minutes, o ne dienas.\"", en: "\"The audit log feature is invaluable — now every regulatory inspection takes minutes, not days.\"" } },
    ],
  },
  faq: {
    title: { lt: "Dažniausiai užduodami klausimai", en: "Frequently asked questions" },
    items: [
      { q: { lt: "Kas yra įpareigoti subjektai?", en: "Who are obliged entities?" }, a: { lt: "Nekilnojamojo turto brokeriai, buhalteriai, advokatai ir kiti asmenys, kuriems taikoma ES pinigų plovimo prevencijos direktyva.", en: "Real estate brokers, accountants, lawyers and others subject to the EU Anti-Money Laundering Directive." } },
      { q: { lt: "Ar platforma atitinka ES AML direktyvą?", en: "Is the platform EU AML Directive compliant?" }, a: { lt: "Taip, platforma sukurta pagal ES AMLD5/6 reikalavimus ir Lietuvos Respublikos pinigų plovimo ir teroristų finansavimo prevencijos įstatymą.", en: "Yes, the platform is built to AMLD5/6 and Lithuanian AML law requirements." } },
      { q: { lt: "Kaip veikia nemokamas bandymas?", en: "How does the free trial work?" }, a: { lt: "14 dienų nemokamas bandymas su visomis funkcijomis, iki 10 klientų. Kreditinė kortelė nereikalinga. Po bandymo galite pasirinkti planą arba atšaukti.", en: "14-day free trial with all features, up to 10 clients. No credit card required. After the trial you can choose a plan or cancel." } },
      { q: { lt: "Ar galiu atšaukti prenumeratą?", en: "Can I cancel my subscription?" }, a: { lt: "Taip, prenumeratą galite atšaukti bet kada. Mokestis imamas už einamąjį laikotarpį.", en: "Yes, you can cancel at any time. You are charged for the current billing period." } },
      { q: { lt: "Kaip saugomi mano duomenys?", en: "How is my data stored?" }, a: { lt: "Visi duomenys saugomi ES duomenų centruose, laikantis BDAR reikalavimų. Naudojame AES-256 šifravimą.", en: "All data is stored in EU data centers, GDPR compliant. We use AES-256 encryption." } },
      // Ondato FAQ item removed
    ],
  },
  contact: {
    title:   { lt: "Susisiekite",  en: "Contact us"   },
    name:    { lt: "Vardas",       en: "Name"         },
    company: { lt: "Įmonė",        en: "Company"      },
    email:   { lt: "El. paštas",   en: "Email"        },
    phone:   { lt: "Telefonas",    en: "Phone"        },
    message: { lt: "Žinutė",       en: "Message"      },
    send:    { lt: "Siųsti",       en: "Send"         },
    sending: { lt: "Siunčiama…",   en: "Sending…"     },
    success: { lt: "Ačiū! Susisieksime netrukus.", en: "Thank you! We will be in touch shortly." },
    address: { lt: "Adresas", en: "Address" },
  },
  footer: {
    privacy:    { lt: "Privatumo politika",  en: "Privacy Policy"  },
    terms:      { lt: "Naudojimo sąlygos",   en: "Terms of Service" },
    copyright:  { lt: "Visi teisės saugomos.", en: "All rights reserved." },
  },
} as const;

function t<A, B = A>(obj: { lt: A; en: B }, lang: Lang): A | B {
  return lang === "lt" ? obj.lt : obj.en;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconKYC() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c-2.5 0-4 1.5-4 3" />
    </svg>
  );
}
function IconRisk() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconEDD() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function IconDocs() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
  );
}
function IconTrain() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconAudit() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  kyc: <IconKYC />, risk: <IconRisk />, edd: <IconEDD />,
  docs: <IconDocs />, train: <IconTrain />, audit: <IconAudit />,
};

// ── Dashboard mockup SVG ──────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <svg viewBox="0 0 480 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-lg">
      {/* Window frame */}
      <rect x="0" y="0" width="480" height="340" rx="12" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
      {/* Title bar */}
      <rect x="0" y="0" width="480" height="36" rx="12" fill="#0F172A" />
      <rect x="0" y="24" width="480" height="12" fill="#0F172A" />
      <circle cx="20" cy="18" r="5" fill="#EF4444" />
      <circle cx="36" cy="18" r="5" fill="#F59E0B" />
      <circle cx="52" cy="18" r="5" fill="#10B981" />
      <text x="200" y="22" fill="#64748B" fontSize="10" fontFamily="monospace">AMLCycle — Dashboard</text>

      {/* Sidebar */}
      <rect x="0" y="36" width="72" height="304" fill="#0F172A" />
      {[0,1,2,3,4].map((i) => (
        <rect key={i} x="16" y={60 + i * 36} width="40" height="6" rx="3" fill={i === 0 ? "#10B981" : "#1E3A5F"} />
      ))}

      {/* Stat cards */}
      {[
        { x: 88,  label: "Klientai", val: "47",  color: "#10B981" },
        { x: 208, label: "KYC laukia", val: "8", color: "#F59E0B" },
        { x: 328, label: "Patvirtinta", val: "31", color: "#3B82F6" },
      ].map((card) => (
        <g key={card.x}>
          <rect x={card.x} y="52" width="104" height="56" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <text x={card.x + 12} y="72" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">{card.label}</text>
          <text x={card.x + 12} y="92" fill={card.color} fontSize="22" fontWeight="700" fontFamily="sans-serif">{card.val}</text>
        </g>
      ))}

      {/* Client list header */}
      <rect x="88" y="124" width="344" height="28" rx="6" fill="#0F172A" />
      <text x="100" y="142" fill="#64748B" fontSize="9" fontFamily="sans-serif">Kliento vardas</text>
      <text x="230" y="142" fill="#64748B" fontSize="9" fontFamily="sans-serif">KYC statusas</text>
      <text x="340" y="142" fill="#64748B" fontSize="9" fontFamily="sans-serif">Rizika</text>

      {/* Client rows */}
      {[
        { name: "Jonas Jonaitis",    status: "Patikrinta",    statusColor: "#10B981", risk: "Žema",    riskColor: "#10B981" },
        { name: "Rūta Petrauskienė", status: "Laukia",       statusColor: "#F59E0B", risk: "Vidutinė", riskColor: "#F59E0B" },
        { name: "Tomas Kazlauskas",  status: "Siunčiama",    statusColor: "#3B82F6", risk: "Žema",    riskColor: "#10B981" },
        { name: "Laura Stankutė",   status: "Peržiūrima",   statusColor: "#8B5CF6", risk: "Aukšta",  riskColor: "#EF4444" },
        { name: "Mindaugas V.",      status: "EDD",          statusColor: "#F97316", risk: "Aukšta",  riskColor: "#EF4444" },
      ].map((row, i) => (
        <g key={i}>
          <rect x="88" y={156 + i * 30} width="344" height="28" rx="4"
            fill={i % 2 === 0 ? "#1E293B" : "#1A2535"} />
          <circle cx="104" cy={170 + i * 30} r="8" fill="#334155" />
          <text x="104" y={174 + i * 30} fill="#94A3B8" fontSize="7" textAnchor="middle" fontFamily="sans-serif">
            {row.name.charAt(0)}
          </text>
          <text x="118" y={174 + i * 30} fill="#E2E8F0" fontSize="9" fontFamily="sans-serif">{row.name}</text>
          <rect x="225" y={162 + i * 30} width="62" height="14" rx="7"
            fill={row.statusColor + "22"} />
          <text x="256" y={173 + i * 30} fill={row.statusColor} fontSize="7.5" textAnchor="middle" fontFamily="sans-serif">{row.status}</text>
          <rect x="333" y={162 + i * 30} width="44" height="14" rx="7"
            fill={row.riskColor + "22"} />
          <text x="355" y={173 + i * 30} fill={row.riskColor} fontSize="7.5" textAnchor="middle" fontFamily="sans-serif">{row.risk}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full border-2 border-emerald-500 flex items-center justify-center">
        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <span className={`text-xl font-bold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
        AMLCycle
      </span>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const navLinks = [
    { id: "features", label: t(copy.nav.features, lang) },
    { id: "pricing",  label: t(copy.nav.pricing,  lang) },
    { id: "faq",      label: t(copy.nav.faq,       lang) },
    { id: "contact",  label: t(copy.nav.contact,   lang) },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
      scrolled ? "bg-slate-900/95 backdrop-blur-md shadow-lg shadow-black/20" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Logo light />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button key={link.id} onClick={() => scrollTo(link.id)}
              className="text-sm text-slate-300 hover:text-white transition-colors font-medium">
              {link.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden text-xs font-semibold">
            {(["lt", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1.5 transition-colors uppercase ${
                  lang === l ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                }`}>
                {l}
              </button>
            ))}
          </div>
          <Link href="/login"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors">
            {t(copy.nav.login, lang)}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-slate-300 hover:text-white p-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <button key={link.id} onClick={() => scrollTo(link.id)}
              className="block w-full text-left text-sm text-slate-300 hover:text-white py-2 font-medium">
              {link.label}
            </button>
          ))}
          <div className="pt-2 flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs font-semibold">
              {(["lt", "en"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 transition-colors uppercase ${
                    lang === l ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}>
                  {l}
                </button>
              ))}
            </div>
            <Link href="/login"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors">
              {t(copy.nav.login, lang)}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection({ lang }: { lang: Lang }) {
  return (
    <section className="min-h-screen bg-[#0F172A] relative overflow-hidden flex items-center" id="hero">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "linear-gradient(#10B981 1px, transparent 1px), linear-gradient(to right, #10B981 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {lang === "lt" ? "AML atitiktis be streso" : "AML compliance without stress"}
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-tight tracking-tight">
              {t(copy.hero.headline, lang)}
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
              {t(copy.hero.sub, lang)}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/login"
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-900/30 text-base">
                {t(copy.hero.cta1, lang)}
              </Link>
              <button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="px-6 py-3.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl transition-colors text-base">
                {t(copy.hero.cta2, lang)} ↓
              </button>
            </div>
            <div className="flex items-center gap-6 pt-2">
              {[
                { lt: "14 dienų nemokamas", en: "14-day free trial" },
                { lt: "Kreditinė kortelė nebūtina", en: "No credit card needed" },
                { lt: "ES AML atitiktis", en: "EU AML compliant" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{lang === "lt" ? item.lt : item.en}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 rounded-2xl" />
            <div className="relative rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl shadow-black/50 p-1 bg-slate-800/30 backdrop-blur">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

function FeaturesSection({ lang }: { lang: Lang }) {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">{t(copy.features.title, lang)}</h2>
          <div className="mt-4 w-16 h-1 bg-emerald-500 mx-auto rounded-full" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {copy.features.items.map((item) => (
            <div key={item.icon}
              className="p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                {FEATURE_ICONS[item.icon]}
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">{t(item.title, lang)}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{t(item.desc, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorksSection({ lang }: { lang: Lang }) {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">{t(copy.howItWorks.title, lang)}</h2>
          <div className="mt-4 w-16 h-1 bg-emerald-500 mx-auto rounded-full" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="absolute top-10 left-[12.5%] right-[12.5%] h-px bg-emerald-200 hidden lg:block" />
          {copy.howItWorks.steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex flex-col items-center justify-center mb-5 shadow-lg shadow-emerald-200 relative z-10">
                <span className="text-xs font-bold text-emerald-200">{step.num}</span>
                <span className="text-lg font-extrabold leading-none">{i + 1}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">{t(step.title, lang)}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{t(step.desc, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function PricingSection({ lang }: { lang: Lang }) {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">{t(copy.pricing.title, lang)}</h2>
          <div className="mt-4 w-16 h-1 bg-emerald-500 mx-auto rounded-full" />
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {copy.pricing.plans.map((plan) => (
            <div key={plan.id}
              className={`relative rounded-2xl border-2 p-7 flex flex-col ${
                plan.popular
                  ? "border-emerald-500 shadow-xl shadow-emerald-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}>
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                    {t(copy.pricing.popular, lang)}
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">€{plan.price}</span>
                  <span className="text-slate-400 mb-1 text-sm">/mėn</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{t(plan.clients, lang)}</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-8">
                {(plan.features[lang] as readonly string[]).map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login"
                className={`block w-full py-3 rounded-xl text-center font-semibold text-sm transition-colors ${
                  plan.popular
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-200"
                    : "border-2 border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-700"
                }`}>
                {t(copy.pricing.cta, lang)}
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-8 space-y-1">
          <p className="text-sm text-slate-500">{t(copy.pricing.perClient, lang)}</p>
          <p className="text-sm font-medium text-emerald-700">{t(copy.pricing.trial, lang)}</p>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

function TestimonialsSection({ lang }: { lang: Lang }) {
  return (
    <section className="py-24 bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-white">{t(copy.testimonials.title, lang)}</h2>
          <div className="mt-4 w-16 h-1 bg-emerald-500 mx-auto rounded-full" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {copy.testimonials.items.map((item, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-7 flex flex-col gap-5">
              <svg className="w-8 h-8 text-emerald-500/40" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-slate-300 text-sm leading-relaxed flex-1">{t(item.quote, lang)}</p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-700">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {item.initials}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{item.name}</p>
                  <p className="text-slate-400 text-xs">{t(item.company, lang)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FaqSection({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">{t(copy.faq.title, lang)}</h2>
          <div className="mt-4 w-16 h-1 bg-emerald-500 mx-auto rounded-full" />
        </div>
        <div className="space-y-3">
          {copy.faq.items.map((item, i) => (
            <div key={i}
              className={`border rounded-xl overflow-hidden transition-colors ${
                open === i ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-800">{t(item.q, lang)}</span>
                <svg className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open === i ? "rotate-180 text-emerald-600" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-slate-600 leading-relaxed">{t(item.a, lang)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Contact ───────────────────────────────────────────────────────────────────

function ContactSection({ lang }: { lang: Lang }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "" });

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await submitContactFormAction(form);
      if (res?.error) { setError(res.error); return; }
      setSuccess(true);
    });
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400";

  return (
    <section id="contact" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">{t(copy.contact.title, lang)}</h2>
          <div className="mt-4 w-16 h-1 bg-emerald-500 mx-auto rounded-full" />
        </div>
        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            {success ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-slate-900">{t(copy.contact.success, lang)}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t(copy.contact.name, lang)} *</label>
                    <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t(copy.contact.company, lang)}</label>
                    <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t(copy.contact.email, lang)} *</label>
                    <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t(copy.contact.phone, lang)}</label>
                    <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t(copy.contact.message, lang)} *</label>
                  <textarea required rows={4} value={form.message} onChange={(e) => set("message", e.target.value)}
                    className={inputCls + " resize-none"} />
                </div>
                <button type="submit" disabled={isPending}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-colors text-sm">
                  {isPending ? t(copy.contact.sending, lang) : t(copy.contact.send, lang)}
                </button>
              </form>
            )}
          </div>

          {/* Contact details */}
          <div className="space-y-8 lg:pt-4">
            {[
              { icon: "building", label: t(copy.contact.address, lang), lines: ["Legalogix MB", "Linkmenų g. 19-123", "Vilnius, LT-08217"] },
              { icon: "mail",    label: "Email",   lines: ["info@amlcycle.com"] },
              { icon: "link",    label: "LinkedIn", lines: ["linkedin.com/company/amlcycle"] },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  {item.icon === "building" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                  {item.icon === "mail" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  {item.icon === "link" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{item.label}</p>
                  {item.lines.map((line, j) => <p key={j} className="text-sm text-slate-700">{line}</p>)}
                </div>
              </div>
            ))}

            {/* CTA block */}
            <div className="mt-8 p-6 bg-emerald-600 rounded-2xl text-white">
              <p className="font-semibold text-base mb-1">
                {lang === "lt" ? "Pasiruošę pradėti?" : "Ready to get started?"}
              </p>
              <p className="text-emerald-100 text-sm mb-4">
                {lang === "lt" ? "14 dienų nemokamas bandymas. Kreditinė kortelė nereikalinga." : "14-day free trial. No credit card required."}
              </p>
              <Link href="/login"
                className="inline-block px-5 py-2.5 bg-white text-emerald-700 font-semibold rounded-lg text-sm hover:bg-emerald-50 transition-colors">
                {lang === "lt" ? "Pradėti nemokamai →" : "Start for free →"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <footer className="bg-[#0F172A] border-t border-slate-800 py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Logo light />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <Link href="/privacy" className="hover:text-white transition-colors">{t(copy.footer.privacy, lang)}</Link>
            <Link href="/terms"   className="hover:text-white transition-colors">{t(copy.footer.terms, lang)}</Link>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span>© 2025 Legalogix MB. {t(copy.footer.copyright, lang)}</span>
          </div>
          {/* Language switcher */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs font-semibold">
            {(["lt", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1.5 transition-colors uppercase ${
                  lang === l ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("lt");

  useEffect(() => {
    const stored = localStorage.getItem("amlcycle_lang") as Lang | null;
    if (stored === "lt" || stored === "en") setLang(stored);
  }, []);

  function handleSetLang(l: Lang) {
    setLang(l);
    localStorage.setItem("amlcycle_lang", l);
  }

  return (
    <div className="font-sans antialiased">
      <Navbar lang={lang} setLang={handleSetLang} />
      <HeroSection lang={lang} />
      <FeaturesSection lang={lang} />
      <HowItWorksSection lang={lang} />
      <PricingSection lang={lang} />
      {/* <TestimonialsSection lang={lang} /> */}
      <FaqSection lang={lang} />
      <ContactSection lang={lang} />
      <Footer lang={lang} setLang={handleSetLang} />
    </div>
  );
}
