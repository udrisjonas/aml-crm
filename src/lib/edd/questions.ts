export interface EddQuestion {
  key: string;
  labelLt: string;
  labelEn: string;
  type: "text" | "textarea" | "select" | "radio";
  options?: { value: string; labelLt: string; labelEn: string }[];
  required: boolean;
  /** Render only when this fn returns true given current answers */
  condition?: (answers: Record<string, string>) => boolean;
}

// ── Questions shown for every EDD regardless of purpose ──────────────────────

export const EDD_QUESTIONS_COMMON: EddQuestion[] = [
  {
    key: "pep_role",
    labelLt: "Jūsų dabartinės arba buvusios politinės / viešosios pareigos (pareigybė ir institucija)",
    labelEn: "Your current or former political / public position (role and organisation)",
    type: "textarea",
    required: true,
  },
  {
    key: "pep_country",
    labelLt: "Su kurios šalies politine veikla esate susietas(-a)?",
    labelEn: "Which country are you politically exposed in?",
    type: "text",
    required: true,
  },
  {
    key: "pep_period",
    labelLt: "Politinės / viešosios veiklos laikotarpis (pvz., 2010–2018)",
    labelEn: "Period of political / public activity (e.g. 2010–2018)",
    type: "text",
    required: true,
  },
  {
    key: "source_of_wealth",
    labelLt: "Turto kilmės šaltinis (kaip sukaupote bendrą turtą / santaupas?)",
    labelEn: "Source of wealth (how did you accumulate your overall assets / savings?)",
    type: "textarea",
    required: true,
  },
  {
    key: "net_worth_range",
    labelLt: "Apytikslė bendrojo turto vertė",
    labelEn: "Approximate net worth",
    type: "select",
    options: [
      { value: "under_100k",    labelLt: "Iki 100 000 €",           labelEn: "Under €100,000" },
      { value: "100k_500k",     labelLt: "100 000 – 500 000 €",     labelEn: "€100,000 – €500,000" },
      { value: "500k_1m",       labelLt: "500 000 – 1 000 000 €",   labelEn: "€500,000 – €1,000,000" },
      { value: "1m_5m",         labelLt: "1 000 000 – 5 000 000 €", labelEn: "€1,000,000 – €5,000,000" },
      { value: "over_5m",       labelLt: "Virš 5 000 000 €",        labelEn: "Over €5,000,000" },
      { value: "prefer_not",    labelLt: "Nepageidauju atsakyti",   labelEn: "Prefer not to say" },
    ],
    required: true,
  },
  {
    key: "source_of_funds_transaction",
    labelLt: "Sandoriui naudojamų lėšų šaltinis (konkrečiai šiam sandoriui)",
    labelEn: "Source of funds for this transaction (specifically for this deal)",
    type: "textarea",
    required: true,
  },
  {
    key: "third_party_funds",
    labelLt: "Ar sandoryje dalyvauja trečiųjų šalių lėšos?",
    labelEn: "Are any third-party funds involved in this transaction?",
    type: "radio",
    options: [
      { value: "yes", labelLt: "Taip", labelEn: "Yes" },
      { value: "no",  labelLt: "Ne",   labelEn: "No" },
    ],
    required: true,
  },
  {
    key: "third_party_details",
    labelLt: "Nurodykite trečiąją šalį (vardas, pavardė / pavadinimas, ryšys su jumis, šaltinis)",
    labelEn: "Identify the third party (name, relationship to you, source of their funds)",
    type: "textarea",
    required: true,
    condition: (a) => a["third_party_funds"] === "yes",
  },
  {
    key: "countries_involved",
    labelLt: "Kokios šalys dalyvauja šiame sandoryje (lėšų kilmės ar gavimo šalys)?",
    labelEn: "Which countries are involved in this transaction (origin or destination of funds)?",
    type: "text",
    required: false,
  },
  {
    key: "politically_exposed_relatives",
    labelLt: "Ar jūsų artimi šeimos nariai ar verslo partneriai taip pat yra politiškai paveikti asmenys (PEP)?",
    labelEn: "Are any of your close family members or business associates also politically exposed persons (PEP)?",
    type: "radio",
    options: [
      { value: "yes", labelLt: "Taip", labelEn: "Yes" },
      { value: "no",  labelLt: "Ne",   labelEn: "No" },
    ],
    required: true,
  },
  {
    key: "pep_relatives_details",
    labelLt: "Nurodykite susijusius PEP asmenis (vardas, ryšys, pareigos)",
    labelEn: "Provide details of related PEP persons (name, relationship, position)",
    type: "textarea",
    required: true,
    condition: (a) => a["politically_exposed_relatives"] === "yes",
  },
  {
    key: "additional_information",
    labelLt: "Papildoma informacija arba paaiškinimai",
    labelEn: "Additional information or explanations",
    type: "textarea",
    required: false,
  },
];

// ── Purpose-specific questions ────────────────────────────────────────────────

const EDD_QUESTIONS_SALE: EddQuestion[] = [
  {
    key: "property_acquisition_source",
    labelLt: "Kaip įsigijote parduodamą nekilnojamąjį turtą (pirkimas, paveldėjimas, dovana, kt.)?",
    labelEn: "How did you originally acquire the property being sold (purchase, inheritance, gift, other)?",
    type: "textarea",
    required: true,
  },
  {
    key: "property_acquisition_year",
    labelLt: "Metai, kuriais įsigijote turtą",
    labelEn: "Year of property acquisition",
    type: "text",
    required: true,
  },
  {
    key: "proceeds_usage",
    labelLt: "Ką ketinate daryti su pardavimo pajamomis?",
    labelEn: "What do you intend to do with the sale proceeds?",
    type: "textarea",
    required: true,
  },
  {
    key: "mortgage_outstanding",
    labelLt: "Ar turtui yra paskolos (hipotekos) likutis?",
    labelEn: "Is there an outstanding mortgage on the property?",
    type: "radio",
    options: [
      { value: "yes", labelLt: "Taip", labelEn: "Yes" },
      { value: "no",  labelLt: "Ne",   labelEn: "No" },
    ],
    required: true,
  },
];

const EDD_QUESTIONS_PURCHASE: EddQuestion[] = [
  {
    key: "funds_origin_country",
    labelLt: "Iš kurios šalies gaunamos pirkimo lėšos?",
    labelEn: "From which country are the purchase funds originating?",
    type: "text",
    required: true,
  },
  {
    key: "bank_account_country",
    labelLt: "Iš kurios šalies banko sąskaitos bus atliekamas mokėjimas?",
    labelEn: "From which country's bank account will payment be made?",
    type: "text",
    required: true,
  },
  {
    key: "purchase_purpose",
    labelLt: "Kokiam tikslui perkamas turtas?",
    labelEn: "What is the intended purpose of the property?",
    type: "select",
    options: [
      { value: "personal_use",  labelLt: "Asmeniniam naudojimui",  labelEn: "Personal use" },
      { value: "rental",        labelLt: "Nuomai",                  labelEn: "Rental" },
      { value: "investment",    labelLt: "Investicija",             labelEn: "Investment" },
      { value: "business",      labelLt: "Verslo tikslams",         labelEn: "Business purposes" },
      { value: "other",         labelLt: "Kita",                    labelEn: "Other" },
    ],
    required: true,
  },
  {
    key: "additional_properties",
    labelLt: "Ar jums nuosavybės teise priklauso kitas nekilnojamasis turtas?",
    labelEn: "Do you own any other properties?",
    type: "radio",
    options: [
      { value: "yes", labelLt: "Taip", labelEn: "Yes" },
      { value: "no",  labelLt: "Ne",   labelEn: "No" },
    ],
    required: true,
  },
];

const EDD_QUESTIONS_RENTAL_TENANT: EddQuestion[] = [
  {
    key: "employment_status",
    labelLt: "Užimtumo statusas",
    labelEn: "Employment status",
    type: "select",
    options: [
      { value: "employed",    labelLt: "Darbuotojas",             labelEn: "Employed" },
      { value: "self_employed", labelLt: "Savarankiškas",         labelEn: "Self-employed" },
      { value: "business_owner", labelLt: "Verslo savininkas",    labelEn: "Business owner" },
      { value: "retired",     labelLt: "Pensininkas",             labelEn: "Retired" },
      { value: "other",       labelLt: "Kita",                    labelEn: "Other" },
    ],
    required: true,
  },
  {
    key: "employer_or_business",
    labelLt: "Darbdavio / įmonės pavadinimas ir šalis",
    labelEn: "Employer / business name and country",
    type: "text",
    required: false,
  },
  {
    key: "monthly_income_range",
    labelLt: "Apytikslės mėnesinės pajamos",
    labelEn: "Approximate monthly income",
    type: "select",
    options: [
      { value: "under_2k",    labelLt: "Iki 2 000 €",       labelEn: "Under €2,000" },
      { value: "2k_5k",       labelLt: "2 000 – 5 000 €",   labelEn: "€2,000 – €5,000" },
      { value: "5k_10k",      labelLt: "5 000 – 10 000 €",  labelEn: "€5,000 – €10,000" },
      { value: "over_10k",    labelLt: "Virš 10 000 €",     labelEn: "Over €10,000" },
      { value: "prefer_not",  labelLt: "Nepageidauju atsakyti", labelEn: "Prefer not to say" },
    ],
    required: true,
  },
  {
    key: "rent_source_of_funds",
    labelLt: "Iš kokių lėšų ketinate mokėti nuomą?",
    labelEn: "From what funds will you pay rent?",
    type: "textarea",
    required: true,
  },
];

const EDD_QUESTIONS_RENTAL_LANDLORD: EddQuestion[] = [
  {
    key: "total_properties_owned",
    labelLt: "Kiek nekilnojamojo turto objektų jums nuosavybės teise priklauso?",
    labelEn: "How many properties do you own in total?",
    type: "select",
    options: [
      { value: "1",       labelLt: "1",       labelEn: "1" },
      { value: "2_5",     labelLt: "2–5",     labelEn: "2–5" },
      { value: "6_10",    labelLt: "6–10",    labelEn: "6–10" },
      { value: "over_10", labelLt: "Daugiau nei 10", labelEn: "More than 10" },
    ],
    required: true,
  },
  {
    key: "rental_income_declared",
    labelLt: "Ar nuomos pajamos deklaruojamos mokesčių tikslais?",
    labelEn: "Is rental income properly declared for tax purposes?",
    type: "radio",
    options: [
      { value: "yes", labelLt: "Taip", labelEn: "Yes" },
      { value: "no",  labelLt: "Ne",   labelEn: "No" },
    ],
    required: true,
  },
  {
    key: "rental_property_acquisition",
    labelLt: "Kaip įsigijote nuomojamą turtą?",
    labelEn: "How did you acquire the rental property?",
    type: "textarea",
    required: true,
  },
];

export const EDD_QUESTIONS_BY_PURPOSE: Record<string, EddQuestion[]> = {
  sale:             EDD_QUESTIONS_SALE,
  purchase:         EDD_QUESTIONS_PURCHASE,
  rental_tenant:    EDD_QUESTIONS_RENTAL_TENANT,
  rental_landlord:  EDD_QUESTIONS_RENTAL_LANDLORD,
};

export function getEddQuestions(purpose: string | null | undefined): EddQuestion[] {
  const purposeSpecific = EDD_QUESTIONS_BY_PURPOSE[purpose ?? ""] ?? [];
  return [...EDD_QUESTIONS_COMMON, ...purposeSpecific];
}
