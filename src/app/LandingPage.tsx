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
    headline: { lt: "Pilnas AML ciklo valdymas",                                                                                                                  en: "Full AML Cycle Management"                                                                                                               },
    sub:      { lt: "Skirta nekilnojamojo turto brokeriams, buhalteriams ir kitiems įpareigotiems subjektams pagal ES pinigų plovimo prevencijos direktyvą",       en: "For real estate brokers, accountants and other obliged entities under the EU Anti-Money Laundering Directive"                           },
    cta1:     { lt: "Pradėti nemokamai", en: "Start for free" },
    cta2:     { lt: "Sužinoti daugiau",  en: "Learn more"     },
  },
  features: {
    title: { lt: "Viskas ko reikia AML atitikčiai", en: "Everything you need for AML compliance" },
    items: [
      { icon: "kyc",   title: { lt: "KYC valdymas",                    en: "KYC Management"             }, desc: { lt: "Automatizuotas kliento tapatybės nustatymo procesas",                                                                                                                             en: "Automated client identification process"                                                                                                        } },
      { icon: "risk",  title: { lt: "Rizikos vertinimas",               en: "Risk Assessment"            }, desc: { lt: "Automatinis rizikos lygių skaičiavimas pagal ES direktyvą",                                                                                                                      en: "Automatic risk level calculation per EU directive"                                                                                              } },
      { icon: "edd",   title: { lt: "EDD procesai",                     en: "EDD Processes"              }, desc: { lt: "Išplėstinė deramo patikrinimo procedūra aukštos rizikos klientams",                                                                                                              en: "Enhanced due diligence for high-risk clients"                                                                                                   } },
      { icon: "docs",  title: { lt: "Atitikties dokumentacija",         en: "Compliance Documentation"   }, desc: { lt: "Valdykite organizacijos AML politiką ir vidaus kontrolės procedūras su versijų istorija ir pakeitimų žurnalu.",                                                                  en: "Manage your organization's AML policies and internal control procedures with version history and change log."                                   } },
      { icon: "train", title: { lt: "Vaidmenų valdymas",                en: "Role Management"            }, desc: { lt: "Daugiavaidmenė platforma: brokeris, AML pareigūnas, vyresnysis vadovas ir administratorius. Tinka ir vienasmenėms įmonėms.",                                                     en: "Multi-role platform: broker, AML officer, senior manager and admin. Works for single-person companies too."                                     } },
      { icon: "audit", title: { lt: "Periodinė peržiūra ir stebėjimas", en: "Periodic Review and Monitoring" }, desc: { lt: "Automatinis periodinių peržiūrų planavimas pagal kliento rizikos lygį bei veiklos ir sandorių stebėjimas pagal AML reikalavimus.", en: "Automatic periodic review scheduling based on client risk level, plus activity and transaction monitoring per AML requirements." } },
    ],
  },
  howItWorks: {
    title: { lt: "Kaip tai veikia", en: "How it works" },
    steps: [
      { num: "01", title: { lt: "Sukurkite klientą",          en: "Create client"        }, desc: { lt: "Įveskite kliento duomenis ir pradėkite KYC procesą",                    en: "Enter client data and start the KYC process"                     } },
      { num: "02", title: { lt: "Atlikite KYC",               en: "Complete KYC"         }, desc: { lt: "Klientas užpildo anketą saugia nuoroda arba broker'is įveda duomenis",  en: "Client fills the questionnaire via secure link or broker enters data" } },
      { num: "03", title: { lt: "Įvertinkite riziką",         en: "Assess risk"          }, desc: { lt: "Sistema automatiškai apskaičiuoja rizikos lygį",                        en: "System automatically calculates the risk level"                   } },
      { num: "04", title: { lt: "Patvirtinkite ir saugokite", en: "Approve and store"    }, desc: { lt: "AML pareigūnas patvirtina ir failas saugomas saugiai",                 en: "AML officer approves and the file is stored securely"             } },
    ],
  },
  pricing: {
    title:     { lt: "Planai ir kainos",                                      en: "Plans and pricing"                          },
    trial:     { lt: "14 dienų nemokamas bandymas. Kreditinė kortelė nereikalinga.", en: "14-day free trial. No credit card required." },
    perClient: { lt: "Papildomi klientai: €2/klientas/mėn",                   en: "Additional clients: €2/client/month"        },
    popular:   { lt: "Populiariausias",                                        en: "Most popular"                               },
    cta:       { lt: "Pradėti nemokamai",                                      en: "Start free"                                 },
    plans: [
      { id: "solo",         name: "Solo",         price: "29",  popular: false, clients: { lt: "iki 10 aktyvių klientų",   en: "up to 10 active clients"   },
        features: { lt: ["1 vartotojas", "KYC valdymas", "Dokumentų saugojimas", "Audito žurnalas", "El. pašto palaikymas"],                                   en: ["1 user", "KYC management", "Document storage", "Audit log", "Email support"]                                   } },
      { id: "standard",     name: "Standard",     price: "79",  popular: true,  clients: { lt: "iki 40 aktyvių klientų",   en: "up to 40 active clients"   },
        features: { lt: ["iki 5 vartotojų", "Viskas iš Solo", "Rizikos vertinimas", "EDD procesai", "Personalo mokymai", "Prioritetinis palaikymas"],          en: ["up to 5 users", "Everything in Solo", "Risk assessment", "EDD processes", "Staff training", "Priority support"] } },
      { id: "professional", name: "Professional", price: "179", popular: false, clients: { lt: "iki 100 aktyvių klientų", en: "up to 100 active clients" },
        features: { lt: ["neriboti vartotojai", "Viskas iš Standard", "Ondato integracija", "API prieiga", "Dedikuotas palaikymas", "SLA garantija"],           en: ["unlimited users", "Everything in Standard", "Ondato integration", "API access", "Dedicated support", "SLA guarantee"] } },
    ],
  },
  testimonials: {
    title: { lt: "Ką sako mūsų klientai", en: "What our clients say" },
    items: [
      { initials: "RK", name: "Rūta K.",   company: { lt: "Nekilnojamojo turto agentūra", en: "Real estate agency"   }, quote: { lt: "\"AMLCycle leido mums sutaupyti daugiau nei 10 valandų per savaitę, skirtų KYC dokumentacijos tvarkymui. Dabar visas procesas sklandus ir automatizuotas.\"", en: "\"AMLCycle saved us over 10 hours per week previously spent on KYC documentation. The entire process is now smooth and automated.\""   } },
      { initials: "TM", name: "Tomas M.",  company: { lt: "Buhalterinės paslaugos",       en: "Accounting services"  }, quote: { lt: "\"Kaip buhalterinę įmonę mus labai džiugina, kad platforma atitinka visus reguliatorinius reikalavimus ir yra labai intuityvi naudoti.\"",             en: "\"As an accounting firm we are very pleased that the platform meets all regulatory requirements and is very intuitive to use.\""         } },
      { initials: "LJ", name: "Laura J.",  company: { lt: "Finansų konsultacijos",        en: "Financial advisory"   }, quote: { lt: "\"Audito žurnalo funkcija yra neįkainojama — dabar kiekvienas reguliatorių patikrinimas trunka minutes, o ne dienas.\"",                              en: "\"The audit log feature is invaluable — now every regulatory inspection takes minutes, not days.\""                                       } },
    ],
  },
  faq: {
    title: { lt: "Dažniausiai užduodami klausimai", en: "Frequently asked questions" },
    items: [
      { q: { lt: "Kas yra įpareigoti subjektai?",              en: "Who are obliged entities?"                   }, a: { lt: "Nekilnojamojo turto brokeriai, buhalteriai, advokatai ir kiti asmenys, kuriems taikoma ES pinigų plovimo prevencijos direktyva.",                                                                                           en: "Real estate brokers, accountants, lawyers and others subject to the EU Anti-Money Laundering Directive."                                             } },
      { q: { lt: "Ar platforma atitinka ES AML direktyvą?",    en: "Is the platform EU AML Directive compliant?" }, a: { lt: "Taip, platforma sukurta pagal ES AMLD5/6 reikalavimus ir Lietuvos Respublikos pinigų plovimo ir teroristų finansavimo prevencijos įstatymą.",                                                                              en: "Yes, the platform is built to AMLD5/6 and Lithuanian AML law requirements."                                                                           } },
      { q: { lt: "Kaip veikia nemokamas bandymas?",            en: "How does the free trial work?"               }, a: { lt: "14 dienų nemokamas bandymas su visomis funkcijomis, iki 10 klientų. Kreditinė kortelė nereikalinga. Po bandymo galite pasirinkti planą arba atšaukti.",                                                                  en: "14-day free trial with all features, up to 10 clients. No credit card required. After the trial you can choose a plan or cancel."                    } },
      { q: { lt: "Ar galiu atšaukti prenumeratą?",             en: "Can I cancel my subscription?"               }, a: { lt: "Taip, prenumeratą galite atšaukti bet kada. Mokestis imamas už einamąjį laikotarpį.",                                                                                                                                    en: "Yes, you can cancel at any time. You are charged for the current billing period."                                                                     } },
      { q: { lt: "Kaip saugomi mano duomenys?",                en: "How is my data stored?"                      }, a: { lt: "Visi duomenys saugomi ES duomenų centruose, laikantis BDAR reikalavimų. Naudojame AES-256 šifravimą.",                                                                                                                    en: "All data is stored in EU data centers, GDPR compliant. We use AES-256 encryption."                                                                   } },
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
    privacy:   { lt: "Privatumo politika", en: "Privacy Policy"   },
    terms:     { lt: "Naudojimo sąlygos",  en: "Terms of Service" },
    copyright: { lt: "Visi teisės saugomos.", en: "All rights reserved." },
  },
} as const;

function t<A, B = A>(obj: { lt: A; en: B }, lang: Lang): A | B {
  return lang === "lt" ? obj.lt : obj.en;
}

// ── Feature icons ─────────────────────────────────────────────────────────────

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

// ── Paper dashboard mockup ────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <svg viewBox="0 0 480 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-lg">
      {/* Card shell */}
      <rect x="0" y="0" width="480" height="340" rx="12" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.5" />
      {/* Topbar */}
      <rect x="0" y="0" width="480" height="44" rx="12" fill="#F9FAFB" />
      <rect x="0" y="32" width="480" height="12" fill="#F9FAFB" />
      <circle cx="22" cy="22" r="5" fill="#D1D5DB" />
      <circle cx="38" cy="22" r="5" fill="#D1D5DB" />
      <circle cx="54" cy="22" r="5" fill="#D1D5DB" />
      <text x="240" y="27" fill="#9CA3AF" fontSize="10" fontFamily="sans-serif" textAnchor="middle">AMLCycle — Dashboard</text>
      {/* Sidebar */}
      <rect x="0" y="44" width="68" height="296" fill="#F9FAFB" />
      <rect x="12" y="64" width="44" height="5" rx="2.5" fill="#111111" />
      {[1, 2, 3, 4].map((i) => (
        <rect key={i} x="12" y={64 + i * 26} width="44" height="5" rx="2.5" fill="#E5E7EB" />
      ))}
      {/* Stat cards */}
      {[
        { x: 84,  label: "Klientai",    val: "47",  color: "#8B5CF6" },
        { x: 202, label: "Laukia",      val: "8",   color: "#D97706" },
        { x: 320, label: "Patvirtinta", val: "31",  color: "#16A34A" },
      ].map((s) => (
        <g key={s.x}>
          <rect x={s.x} y="56" width="108" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
          <text x={s.x + 10} y="76" fill="#6B7280" fontSize="8" fontFamily="sans-serif">{s.label}</text>
          <text x={s.x + 10} y="97" fill={s.color} fontSize="22" fontWeight="700" fontFamily="sans-serif">{s.val}</text>
        </g>
      ))}
      {/* Table header */}
      <rect x="84" y="124" width="380" height="26" rx="4" fill="#F9FAFB" />
      <text x="96"  y="141" fill="#9CA3AF" fontSize="8.5" fontFamily="sans-serif">Kliento vardas</text>
      <text x="228" y="141" fill="#9CA3AF" fontSize="8.5" fontFamily="sans-serif">KYC statusas</text>
      <text x="348" y="141" fill="#9CA3AF" fontSize="8.5" fontFamily="sans-serif">Rizika</text>
      {/* Client rows */}
      {[
        { name: "Jonas Jonaitis",    status: "Patikrinta",  sColor: "#16A34A", risk: "Žema",     rColor: "#16A34A" },
        { name: "Rūta Petrauskienė", status: "Laukia",      sColor: "#D97706", risk: "Vidutinė", rColor: "#D97706" },
        { name: "Tomas Kazlauskas",  status: "Siunčiama",   sColor: "#3B82F6", risk: "Žema",     rColor: "#16A34A" },
        { name: "Laura Stankutė",   status: "Peržiūrima",  sColor: "#8B5CF6", risk: "Aukšta",   rColor: "#DC2626" },
        { name: "Mindaugas V.",      status: "EDD",         sColor: "#EF4444", risk: "Aukšta",   rColor: "#DC2626" },
      ].map((row, i) => (
        <g key={i}>
          <rect x="84" y={154 + i * 29} width="380" height="27" fill={i % 2 === 0 ? "#FFFFFF" : "#F9FAFB"} />
          <circle cx="100" cy={167 + i * 29} r="8" fill="#F3F4F6" />
          <text x="100" y={171 + i * 29} fill="#6B7280" fontSize="7" textAnchor="middle" fontFamily="sans-serif">{row.name.charAt(0)}</text>
          <text x="116" y={171 + i * 29} fill="#111827" fontSize="8.5" fontFamily="sans-serif">{row.name}</text>
          <rect x="222" y={160 + i * 29} width="68"  height="14" rx="7" fill={row.sColor + "1A"} />
          <text x="256" y={171 + i * 29} fill={row.sColor} fontSize="7.5" textAnchor="middle" fontFamily="sans-serif">{row.status}</text>
          <rect x="342" y={160 + i * 29} width="48"  height="14" rx="7" fill={row.rColor + "1A"} />
          <text x="366" y={171 + i * 29} fill={row.rColor} fontSize="7.5" textAnchor="middle" fontFamily="sans-serif">{row.risk}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full border-2 border-[#8B5CF6] flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <span className="font-montserrat text-xl font-bold tracking-tight text-[#111111]">AMLCycle</span>
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
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-200 ${
      scrolled ? "border-b border-[#E5E7EB] shadow-sm" : "border-b border-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Logo />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button key={link.id} onClick={() => scrollTo(link.id)}
              className="font-roboto text-sm text-[#374151] hover:text-[#8B5CF6] transition-colors font-medium relative group">
              {link.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#8B5CF6] group-hover:w-full transition-all duration-200" />
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center rounded-md border border-[#E5E7EB] overflow-hidden text-xs font-semibold">
            {(["lt", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`font-roboto px-3 py-1.5 transition-colors uppercase ${
                  lang === l ? "bg-[#111111] text-white" : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F9FAFB]"
                }`}>
                {l}
              </button>
            ))}
          </div>
          <Link href="/login"
            className="font-roboto px-4 py-2 bg-[#111111] hover:bg-[#374151] text-white text-sm font-semibold rounded-md shadow-sm transition-colors">
            {t(copy.nav.login, lang)}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-[#374151] hover:text-[#111111] p-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[#E5E7EB] px-6 py-4 space-y-1">
          {navLinks.map((link) => (
            <button key={link.id} onClick={() => scrollTo(link.id)}
              className="font-roboto block w-full text-left text-sm text-[#374151] hover:text-[#111111] py-2.5 font-medium border-b border-[#F3F4F6] last:border-0">
              {link.label}
            </button>
          ))}
          <div className="pt-3 flex items-center gap-3">
            <div className="flex rounded-md border border-[#E5E7EB] overflow-hidden text-xs font-semibold">
              {(["lt", "en"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`font-roboto px-3 py-1.5 transition-colors uppercase ${
                    lang === l ? "bg-[#111111] text-white" : "text-[#6B7280] hover:text-[#111111]"
                  }`}>
                  {l}
                </button>
              ))}
            </div>
            <Link href="/login"
              className="font-roboto px-4 py-2 bg-[#111111] text-white text-sm font-semibold rounded-md transition-colors">
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
    <section className="min-h-screen bg-[#F9FAFB] flex items-center" id="hero">
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C4B5FD] bg-[#EDE9FE] text-[#8B5CF6] text-xs font-semibold uppercase tracking-wider font-roboto">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
              {lang === "lt" ? "AML atitiktis be streso" : "AML compliance without stress"}
            </div>
            <h1 className="font-montserrat text-4xl lg:text-5xl xl:text-[56px] font-extrabold text-[#111111] leading-tight tracking-tight">
              {t(copy.hero.headline, lang)}
            </h1>
            <p className="font-roboto text-lg text-[#6B7280] leading-relaxed max-w-lg">
              {t(copy.hero.sub, lang)}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/login"
                className="font-roboto px-6 py-3.5 bg-[#111111] hover:bg-[#374151] text-white font-semibold rounded-md transition-colors shadow-sm text-base">
                {t(copy.hero.cta1, lang)}
              </Link>
              <button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="font-roboto px-6 py-3.5 border border-[#D1D5DB] hover:border-[#111111] text-[#374151] hover:text-[#111111] font-semibold rounded-md transition-colors text-base">
                {t(copy.hero.cta2, lang)} ↓
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
              {[
                { lt: "14 dienų nemokamas", en: "14-day free trial" },
                { lt: "Kreditinė kortelė nebūtina", en: "No credit card needed" },
                { lt: "ES AML atitiktis", en: "EU AML compliant" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-[#6B7280] font-roboto">
                  <svg className="w-4 h-4 text-[#16A34A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{lang === "lt" ? item.lt : item.en}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — paper mockup */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-xl border border-[#E5E7EB] overflow-hidden shadow-md bg-white p-1">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── AML Cycle explanation ─────────────────────────────────────────────────────

function AmlCycleSection({ lang }: { lang: Lang }) {
  const stages = [
    {
      label: "CDD",
      title: { lt: "Kliento tapatybės nustatymas", en: "Customer Due Diligence" },
      desc:  { lt: "Kliento įtraukimas, tapatybės nustatymas, rizikos vertinimas ir derama patikra prieš pradedant dalykinius santykius.", en: "Client onboarding, identity verification, risk assessment and due diligence before starting a business relationship." },
      color: "#8B5CF6", bg: "#EDE9FE",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: "ODD",
      title: { lt: "Nuolatinė priežiūra", en: "Ongoing Due Diligence" },
      desc:  { lt: "Nuolatinis sandorių ir veiklos stebėjimas, siekiant aptikti neįprastus ar įtartinus veiksmus.", en: "Continuous monitoring of transactions and activities to detect unusual or suspicious behaviour." },
      color: "#3B82F6", bg: "#DBEAFE",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      label: lang === "lt" ? "Peržiūra" : "Review",
      title: { lt: "Periodinė peržiūra", en: "Periodic Review" },
      desc:  { lt: "Reguliari kliento duomenų ir rizikos profilio peržiūra pagal nustatytą grafiką, priklausomai nuo rizikos lygio.", en: "Regular review of client data and risk profile on a defined schedule based on risk level." },
      color: "#10B981", bg: "#D1FAE5",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: lang === "lt" ? "Duomenys" : "Data",
      title: { lt: "Duomenų priežiūra", en: "Data Maintenance" },
      desc:  { lt: "Kliento duomenų, dokumentų ir AML politikos atnaujinimas. Pakeitimų registravimas audito žurnale.", en: "Updating client data, documents and AML policies. Recording changes in the audit log." },
      color: "#F59E0B", bg: "#FEF3C7",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
    },
    {
      label: lang === "lt" ? "Archyvas" : "Archive",
      title: { lt: "Archyvavimas ir atskaitomybė", en: "Archiving and Reporting" },
      desc:  { lt: "Pasibaigus dalykiniams santykiams — archyvavimas ir dokumentų saugojimas 8 metus pagal teisės aktų reikalavimus.", en: "Upon end of business relationship — archiving and document retention for 8 years per legal requirements." },
      color: "#EF4444", bg: "#FEE2E2",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="font-montserrat text-3xl lg:text-4xl font-bold text-[#111111]">
            {lang === "lt" ? "Kas yra AML ciklas?" : "What is the AML Cycle?"}
          </h2>
          <p className="mt-4 font-roboto text-base text-[#6B7280] leading-relaxed">
            {lang === "lt"
              ? "AML atitiktis nėra vienkartinis veiksmas. Tai nuolatinis ciklas, užtikrinantis, kad jūsų verslas atitinka pinigų plovimo prevencijos reikalavimus visą dalykinių santykių laikotarpį."
              : "AML compliance is not a one-time action. It is a continuous cycle ensuring your business meets anti-money laundering requirements throughout the entire business relationship."}
          </p>
        </div>

        {/* Cycle diagram */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          {stages.map((stage, i) => (
            <div key={i} className="flex flex-col lg:flex-row items-center flex-1 gap-3">
              {/* Stage card */}
              <div className="w-full bg-white rounded-lg border border-[#E5E7EB] p-5 shadow-sm hover:shadow-md transition-shadow flex-1">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 shrink-0"
                  style={{ backgroundColor: stage.bg, color: stage.color }}>
                  {stage.icon}
                </div>
                <div className="font-roboto text-[10px] font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: stage.color }}>
                  {stage.label}
                </div>
                <h3 className="font-montserrat font-semibold text-sm text-[#111111] mb-2 leading-snug">
                  {t(stage.title, lang)}
                </h3>
                <p className="font-roboto text-xs text-[#6B7280] leading-relaxed">
                  {t(stage.desc, lang)}
                </p>
              </div>

              {/* Arrow connectors */}
              {i < stages.length - 1 && (
                <>
                  <div className="hidden lg:flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="lg:hidden flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <p className="text-center mt-8 font-roboto text-sm text-[#6B7280]">
          {lang === "lt"
            ? "AMLCycle platforma palaiko kiekvieną šio ciklo etapą."
            : "AMLCycle platform supports every stage of this cycle."}
        </p>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

function FeaturesSection({ lang }: { lang: Lang }) {
  return (
    <section id="features" className="py-24 bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-montserrat text-3xl lg:text-4xl font-bold text-[#111111]">
            {t(copy.features.title, lang)}
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {copy.features.items.map((item) => (
            <div key={item.icon}
              className="p-6 bg-white rounded-lg border border-[#E5E7EB] hover:border-[#C4B5FD] hover:shadow-md transition-all group">
              <div className="w-11 h-11 rounded-lg bg-[#EDE9FE] text-[#8B5CF6] flex items-center justify-center mb-4 group-hover:bg-[#8B5CF6] group-hover:text-white transition-colors">
                {FEATURE_ICONS[item.icon]}
              </div>
              <h3 className="font-montserrat text-base font-semibold text-[#111111] mb-2">
                {t(item.title, lang)}
              </h3>
              <p className="font-roboto text-sm text-[#6B7280] leading-relaxed">
                {t(item.desc, lang)}
              </p>
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
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-montserrat text-3xl lg:text-4xl font-bold text-[#111111]">
            {t(copy.howItWorks.title, lang)}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting dashed line on desktop */}
          <div className="absolute top-9 left-[12.5%] right-[12.5%] h-px border-t border-dashed border-[#D1D5DB] hidden lg:block" />
          {copy.howItWorks.steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center">
              <div className="w-[72px] h-[72px] rounded-full bg-[#111111] text-white flex flex-col items-center justify-center mb-5 relative z-10 shadow-md">
                <span className="text-[10px] font-semibold text-[#9CA3AF] font-roboto leading-none">{step.num}</span>
                <span className="font-montserrat text-2xl font-extrabold leading-none mt-0.5">{i + 1}</span>
              </div>
              <h3 className="font-montserrat text-base font-semibold text-[#111111] mb-2">
                {t(step.title, lang)}
              </h3>
              <p className="font-roboto text-sm text-[#6B7280] leading-relaxed">
                {t(step.desc, lang)}
              </p>
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
    <section id="pricing" className="py-24 bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-montserrat text-3xl lg:text-4xl font-bold text-[#111111]">
            {t(copy.pricing.title, lang)}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {copy.pricing.plans.map((plan) => (
            <div key={plan.id}
              className={`relative bg-white rounded-lg flex flex-col p-7 shadow-sm transition-shadow hover:shadow-md ${
                plan.popular ? "border-2 border-[#111111]" : "border border-[#E5E7EB]"
              }`}>
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="font-roboto px-4 py-1 bg-[#111111] text-white text-xs font-bold rounded-full">
                    {t(copy.pricing.popular, lang)}
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-montserrat text-lg font-bold text-[#111111]">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-montserrat text-[40px] font-bold text-[#111111] leading-none">€{plan.price}</span>
                  <span className="font-roboto text-[#6B7280] mb-1 text-sm">/mėn</span>
                </div>
                <p className="font-roboto text-sm text-[#6B7280] mt-2">{t(plan.clients, lang)}</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-8">
                {(plan.features[lang] as readonly string[]).map((f, i) => (
                  <li key={i} className="font-roboto flex items-center gap-2.5 text-sm text-[#374151]">
                    <svg className="w-4 h-4 text-[#16A34A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login"
                className={`font-roboto block w-full py-3 rounded-md text-center font-semibold text-sm transition-colors ${
                  plan.popular
                    ? "bg-[#111111] hover:bg-[#374151] text-white shadow-sm"
                    : "border border-[#D1D5DB] hover:border-[#111111] text-[#374151] hover:text-[#111111]"
                }`}>
                {t(copy.pricing.cta, lang)}
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-8 space-y-1">
          <p className="font-roboto text-sm text-[#6B7280]">{t(copy.pricing.perClient, lang)}</p>
          <p className="font-roboto text-sm font-semibold text-[#16A34A]">{t(copy.pricing.trial, lang)}</p>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

function TestimonialsSection({ lang }: { lang: Lang }) {
  return (
    <section className="py-24 bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-montserrat text-3xl lg:text-4xl font-bold text-[#111111]">
            {t(copy.testimonials.title, lang)}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {copy.testimonials.items.map((item, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-lg p-7 flex flex-col gap-5 shadow-sm">
              <svg className="w-8 h-8 text-[#8B5CF6]/30" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="font-roboto text-[#374151] text-sm leading-relaxed flex-1">{t(item.quote, lang)}</p>
              <div className="flex items-center gap-3 pt-2 border-t border-[#F3F4F6]">
                <div className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {item.initials}
                </div>
                <div>
                  <p className="font-montserrat font-semibold text-sm text-[#111111]">{item.name}</p>
                  <p className="font-roboto text-xs text-[#6B7280]">{t(item.company, lang)}</p>
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
          <h2 className="font-montserrat text-3xl lg:text-4xl font-bold text-[#111111]">
            {t(copy.faq.title, lang)}
          </h2>
        </div>
        <div className="divide-y divide-[#E5E7EB]">
          {copy.faq.items.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left py-5 flex items-center justify-between gap-4">
                <span className="font-montserrat text-sm font-semibold text-[#111111]">
                  {t(item.q, lang)}
                </span>
                <svg className={`w-5 h-5 shrink-0 transition-transform ${open === i ? "rotate-180 text-[#8B5CF6]" : "text-[#9CA3AF]"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div className="pb-5">
                  <p className="font-roboto text-sm text-[#6B7280] leading-relaxed">
                    {t(item.a, lang)}
                  </p>
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
  const [error, setError]   = useState("");
  const [form, setForm]     = useState({ name: "", company: "", email: "", phone: "", message: "" });

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

  const inputCls = "font-roboto w-full px-4 py-3 rounded-md border border-[#D1D5DB] bg-white text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent placeholder:text-[#9CA3AF]";

  return (
    <section id="contact" className="py-24 bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-montserrat text-3xl lg:text-4xl font-bold text-[#111111]">
            {t(copy.contact.title, lang)}
          </h2>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Form card */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-8 shadow-sm">
            {success ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-montserrat text-base font-semibold text-[#111111]">
                  {t(copy.contact.success, lang)}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="font-roboto p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-md text-[#DC2626] text-sm">
                    {error}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-roboto block text-xs font-medium text-[#374151] mb-1.5">{t(copy.contact.name, lang)} *</label>
                    <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="font-roboto block text-xs font-medium text-[#374151] mb-1.5">{t(copy.contact.company, lang)}</label>
                    <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-roboto block text-xs font-medium text-[#374151] mb-1.5">{t(copy.contact.email, lang)} *</label>
                    <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="font-roboto block text-xs font-medium text-[#374151] mb-1.5">{t(copy.contact.phone, lang)}</label>
                    <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="font-roboto block text-xs font-medium text-[#374151] mb-1.5">{t(copy.contact.message, lang)} *</label>
                  <textarea required rows={4} value={form.message} onChange={(e) => set("message", e.target.value)}
                    className={inputCls + " resize-none"} />
                </div>
                <button type="submit" disabled={isPending}
                  className="font-roboto w-full py-3.5 bg-[#111111] hover:bg-[#374151] disabled:bg-[#6B7280] text-white font-semibold rounded-md transition-colors text-sm">
                  {isPending ? t(copy.contact.sending, lang) : t(copy.contact.send, lang)}
                </button>
              </form>
            )}
          </div>

          {/* Contact details */}
          <div className="space-y-8 lg:pt-4">
            {[
              { icon: "building", label: t(copy.contact.address, lang), lines: ["Legalogix MB", "Linkmenų g. 19-123", "Vilnius, LT-08217"] },
              { icon: "mail",     label: "Email",    lines: ["info@amlcycle.com"] },
              { icon: "link",     label: "LinkedIn", lines: ["linkedin.com/company/amlcycle"] },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] text-[#8B5CF6] flex items-center justify-center shrink-0">
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
                  <p className="font-roboto text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{item.label}</p>
                  {item.lines.map((line, j) => (
                    <p key={j} className="font-roboto text-sm text-[#374151]">{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {/* CTA block */}
            <div className="mt-4 p-6 bg-[#111111] rounded-lg">
              <p className="font-montserrat font-semibold text-base text-white mb-1">
                {lang === "lt" ? "Pasiruošę pradėti?" : "Ready to get started?"}
              </p>
              <p className="font-roboto text-sm text-[#9CA3AF] mb-4">
                {lang === "lt"
                  ? "14 dienų nemokamas bandymas. Kreditinė kortelė nereikalinga."
                  : "14-day free trial. No credit card required."}
              </p>
              <Link href="/login"
                className="font-roboto inline-block px-5 py-2.5 bg-white text-[#111111] font-semibold rounded-md text-sm hover:bg-[#F9FAFB] transition-colors">
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
    <footer className="bg-white border-t border-[#E5E7EB] py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-roboto text-sm text-[#6B7280]">
            <Link href="/privacy" className="hover:text-[#111111] transition-colors">{t(copy.footer.privacy, lang)}</Link>
            <Link href="/terms"   className="hover:text-[#111111] transition-colors">{t(copy.footer.terms, lang)}</Link>
            <span className="text-[#D1D5DB] hidden sm:inline">·</span>
            <span>© 2025 Legalogix MB. {t(copy.footer.copyright, lang)}</span>
          </div>
          {/* Language switcher */}
          <div className="flex rounded-md border border-[#E5E7EB] overflow-hidden text-xs font-semibold">
            {(["lt", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`font-roboto px-3 py-1.5 transition-colors uppercase ${
                  lang === l ? "bg-[#111111] text-white" : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F9FAFB]"
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

// ── Root ──────────────────────────────────────────────────────────────────────

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
    <div className="font-roboto antialiased">
      <Navbar lang={lang} setLang={handleSetLang} />
      <HeroSection lang={lang} />
      <AmlCycleSection lang={lang} />
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
