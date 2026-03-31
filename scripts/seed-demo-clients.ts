import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Spread 10 created_at timestamps over the last 3 months
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const CLIENTS = [
  {
    first_name: "Tomas",
    last_name: "Jonaitis",
    date_of_birth: "1982-06-15",
    personal_id_number: "38206150123",
    nationality: "LT",
    country_of_residence: "LT",
    is_lithuanian_resident: true,
    occupation: "Programuotojas",
    source_of_funds: "Darbo užmokestis",
    source_of_wealth: "Taupymai iš darbo užmokesčio",
    purpose_of_relationship: "purchase",
    relationship_frequency: "one_off",
    relationship_use: "personal",
    pep_status: "no",
    pep_self_declared: false,
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "passport",
    id_document_number: "LT1234567",
    id_document_expiry: "2030-06-15",
    id_issuing_country: "LT",
    residential_address: "Gedimino pr. 15-3, LT-01103 Vilnius",
    phone: "+37060012345",
    email: "tomas.jonaitis@gmail.com",
    acting_on_own_behalf: true,
    kyc_status: "verified",
    edd_status: "not_required",
    risk_rating: "low",
    client_status: "active",
    created_at: daysAgo(85),
  },
  {
    first_name: "Rūta",
    last_name: "Petrauskienė",
    date_of_birth: "1978-11-23",
    personal_id_number: "47811230456",
    nationality: "LT",
    country_of_residence: "LT",
    is_lithuanian_resident: true,
    occupation: "Buhalterė",
    source_of_funds: "Darbo užmokestis",
    source_of_wealth: "Darbo užmokestis ir taupymai",
    purpose_of_relationship: "sale",
    relationship_frequency: "one_off",
    relationship_use: "personal",
    pep_status: "no",
    pep_self_declared: false,
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "national_id",
    id_document_number: "LT2345678",
    id_document_expiry: "2028-11-23",
    id_issuing_country: "LT",
    residential_address: "Laisvės al. 42-7, LT-44240 Kaunas",
    phone: "+37061023456",
    email: "ruta.petrauskiene@inbox.lt",
    acting_on_own_behalf: true,
    kyc_status: "client_completed",
    edd_status: "not_required",
    risk_rating: "medium",
    client_status: "active",
    created_at: daysAgo(72),
  },
  {
    first_name: "Andrius",
    last_name: "Mironovskis",
    date_of_birth: "1975-03-08",
    personal_id_number: null,
    foreign_id_number: "RU4567890",
    nationality: "RU",
    country_of_residence: "LT",
    is_lithuanian_resident: true,
    occupation: "Verslininkas",
    source_of_funds: "Verslo pajamos",
    source_of_wealth: "Verslas Rytų Europoje",
    purpose_of_relationship: "purchase",
    relationship_frequency: "ongoing",
    relationship_use: "business",
    pep_status: "no",
    pep_self_declared: false,
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "passport",
    id_document_number: "RU4567890",
    id_document_expiry: "2026-03-08",
    id_issuing_country: "RU",
    residential_address: "Pylimo g. 28-12, LT-01141 Vilnius",
    phone: "+37062034567",
    email: "andrius.mironovskis@mail.ru",
    acting_on_own_behalf: true,
    kyc_status: "under_review",
    edd_status: "triggered",
    risk_rating: "high",
    client_status: "edd",
    created_at: daysAgo(60),
  },
  {
    first_name: "Laura",
    last_name: "Stankutė",
    date_of_birth: "1990-07-19",
    personal_id_number: "49007190789",
    nationality: "LT",
    country_of_residence: "LT",
    is_lithuanian_resident: true,
    occupation: "Teisininkė",
    source_of_funds: "Darbo užmokestis",
    source_of_wealth: "Taupymai",
    purpose_of_relationship: "rental",
    relationship_frequency: "ongoing",
    relationship_use: "personal",
    pep_status: "no",
    pep_self_declared: false,
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "national_id",
    id_document_number: "LT3456789",
    id_document_expiry: "2031-07-19",
    id_issuing_country: "LT",
    residential_address: "Klaipėdos g. 5-2, LT-91246 Klaipėda",
    phone: "+37063045678",
    email: "laura.stankute@advokatai.lt",
    acting_on_own_behalf: true,
    kyc_status: "submitted",
    edd_status: "not_required",
    risk_rating: "low",
    client_status: "active",
    created_at: daysAgo(50),
  },
  {
    first_name: "Mindaugas",
    last_name: "Vaičiūnas",
    date_of_birth: "1968-04-30",
    personal_id_number: "36804300012",
    nationality: "LT",
    country_of_residence: "LT",
    is_lithuanian_resident: true,
    occupation: "Savivaldybės tarybos narys",
    source_of_funds: "Atlyginimas ir politinė veikla",
    source_of_wealth: "Nekilnojamasis turtas",
    purpose_of_relationship: "purchase",
    relationship_frequency: "one_off",
    relationship_use: "personal",
    pep_status: "yes",
    pep_self_declared: true,
    pep_details: "Savivaldybės tarybos narys, Vilniaus miesto savivaldybė",
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "passport",
    id_document_number: "LT4567890",
    id_document_expiry: "2027-04-30",
    id_issuing_country: "LT",
    residential_address: "Antakalnio g. 10-1, LT-10312 Vilnius",
    phone: "+37064056789",
    email: "mindaugas.vaiciunas@vilnius.lt",
    acting_on_own_behalf: true,
    kyc_status: "escalated",
    edd_status: "under_review", // schema constraint: 'escalated' not valid for clients.edd_status
    risk_rating: "high",
    client_status: "edd",
    created_at: daysAgo(42),
  },
  {
    first_name: "Jolanta",
    last_name: "Kazlauskienė",
    date_of_birth: "1984-09-12",
    personal_id_number: "48409120345",
    nationality: "LT",
    country_of_residence: "LT",
    is_lithuanian_resident: true,
    occupation: "Mokytoja",
    source_of_funds: "Darbo užmokestis",
    source_of_wealth: "Paveldėjimas",
    purpose_of_relationship: "sale",
    relationship_frequency: "one_off",
    relationship_use: "personal",
    pep_status: "unknown",
    pep_self_declared: false,
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "national_id",
    id_document_number: "LT5678901",
    id_document_expiry: "2029-09-12",
    id_issuing_country: "LT",
    residential_address: "Šiaulių g. 18-4, LT-77156 Šiauliai",
    phone: "+37065067890",
    email: "jolanta.kazlauskiene@mokykla.lt",
    acting_on_own_behalf: true,
    kyc_status: "draft",
    edd_status: "not_required",
    risk_rating: "not_assessed",
    client_status: "active",
    created_at: daysAgo(35),
  },
  {
    first_name: "Viktor",
    last_name: "Romanenko",
    date_of_birth: "1980-02-14",
    personal_id_number: null,
    foreign_id_number: "UA9876543",
    nationality: "UA",
    country_of_residence: "LT",
    is_lithuanian_resident: true,
    occupation: "IT specialistas",
    source_of_funds: "Darbo užmokestis",
    source_of_wealth: "Taupymai",
    purpose_of_relationship: "rental",
    relationship_frequency: "ongoing",
    relationship_use: "personal",
    pep_status: "no",
    pep_self_declared: false,
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "passport",
    id_document_number: "UA9876543",
    id_document_expiry: "2028-02-14",
    id_issuing_country: "UA",
    residential_address: "Naugarduko g. 33-8, LT-03225 Vilnius",
    phone: "+37066078901",
    email: "viktor.romanenko@gmail.com",
    acting_on_own_behalf: true,
    kyc_status: "verified",
    edd_status: "not_required",
    risk_rating: "medium",
    client_status: "active",
    created_at: daysAgo(28),
  },
  {
    first_name: "Eglė",
    last_name: "Norvaišaitė",
    date_of_birth: "1995-05-27",
    personal_id_number: "49505270678",
    nationality: "LT",
    country_of_residence: "LT",
    is_lithuanian_resident: true,
    occupation: "Dizainerė",
    source_of_funds: "Darbo užmokestis",
    source_of_wealth: "Taupymai",
    purpose_of_relationship: "purchase",
    relationship_frequency: "one_off",
    relationship_use: "personal",
    pep_status: "no",
    pep_self_declared: false,
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "national_id",
    id_document_number: "LT6789012",
    id_document_expiry: "2032-05-27",
    id_issuing_country: "LT",
    residential_address: "Savanorių pr. 19-6, LT-03116 Vilnius",
    phone: "+37067089012",
    email: "egle.norvaisaite@gmail.com",
    acting_on_own_behalf: true,
    kyc_status: "sent_to_client",
    edd_status: "not_required",
    risk_rating: "not_assessed",
    client_status: "active",
    created_at: daysAgo(21),
  },
  {
    first_name: "Saulius",
    last_name: "Bernotas",
    date_of_birth: "1971-08-03",
    personal_id_number: "37108030901",
    nationality: "LT",
    country_of_residence: "DE",
    is_lithuanian_resident: false,
    occupation: "Statybų rangovas",
    source_of_funds: "Verslo pajamos",
    source_of_wealth: "Verslo pelnas",
    purpose_of_relationship: "purchase",
    relationship_frequency: "one_off",
    relationship_use: "business",
    pep_status: "no",
    pep_self_declared: false,
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "passport",
    id_document_number: "LT7890123",
    id_document_expiry: "2025-08-03",
    id_issuing_country: "LT",
    residential_address: "Musterstraße 12, 80333 München, Vokietija",
    correspondence_address: "Kauno g. 7, LT-03212 Vilnius",
    phone: "+4915112345678",
    email: "saulius.bernotas@bau.de",
    acting_on_own_behalf: false,
    beneficial_owner_info: "Veikia per įgaliotą asmenį. Tikrasis savininkas: Saulius Bernotas.",
    kyc_status: "rejected",
    edd_status: "not_required",
    risk_rating: "high",
    client_status: "rejected",
    created_at: daysAgo(14),
  },
  {
    first_name: "Kristina",
    last_name: "Černiauskaitė",
    date_of_birth: "1988-12-09",
    personal_id_number: "48812090234",
    nationality: "LT",
    country_of_residence: "LT",
    is_lithuanian_resident: true,
    occupation: "Nekilnojamojo turto agentė",
    source_of_funds: "Komisiniai ir darbo užmokestis",
    source_of_wealth: "Taupymai ir NT investicijos",
    purpose_of_relationship: "sale, purchase",
    relationship_frequency: "ongoing",
    relationship_use: "personal",
    pep_status: "no",
    pep_self_declared: false,
    sanctions_status: "clear",
    adverse_media_status: "clear",
    id_document_type: "national_id",
    id_document_number: "LT8901234",
    id_document_expiry: "2030-12-09",
    id_issuing_country: "LT",
    residential_address: "Žirmūnų g. 68-14, LT-09124 Vilnius",
    phone: "+37068090123",
    email: "kristina.cerniauskaitė@remax.lt",
    acting_on_own_behalf: true,
    kyc_status: "verified",
    edd_status: "not_required",
    risk_rating: "low",
    client_status: "active",
    created_at: daysAgo(7),
  },
];

async function main() {
  // 1. Find a broker user (fall back to any profile)
  const { data: brokerRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "broker")
    .maybeSingle();

  let brokerId: string | null = null;

  if (brokerRole) {
    const { data: userRole } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role_id", brokerRole.id)
      .limit(1)
      .maybeSingle();
    brokerId = userRole?.user_id ?? null;
  }

  if (!brokerId) {
    const { data: anyProfile, error: profileErr } = await admin
      .from("profiles")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (profileErr || !anyProfile) {
      console.error("Could not find any profile to use as broker:", profileErr);
      process.exit(1);
    }
    brokerId = anyProfile.id;
    console.log("No broker role found — using first profile as fallback:", brokerId!);
  } else {
    console.log("Using broker:", brokerId);
  }

  await insertClients(brokerId!, "default");
}

async function insertClients(brokerId: string, tenantId: string) {
  let inserted = 0;
  let skipped = 0;

  for (const c of CLIENTS) {
    // Check if client already exists with same name
    const { data: existing } = await admin
      .from("individual_details")
      .select("id")
      .eq("first_name", c.first_name)
      .eq("last_name", c.last_name)
      .maybeSingle();

    if (existing) {
      console.log(`  SKIP  ${c.first_name} ${c.last_name} — already exists`);
      skipped++;
      continue;
    }

    // Insert client row
    const { data: client, error: clientErr } = await admin
      .from("clients")
      .insert({
        tenant_id: tenantId,
        client_type: "individual",
        assigned_broker_id: brokerId,
        kyc_status: c.kyc_status,
        edd_status: c.edd_status,
        risk_rating: c.risk_rating,
        client_status: c.client_status,
        is_represented: !c.acting_on_own_behalf,
        created_at: c.created_at,
        updated_at: c.created_at,
      })
      .select("id")
      .single();

    if (clientErr || !client) {
      console.error(`  ERROR inserting client ${c.first_name} ${c.last_name}:`, clientErr?.message);
      continue;
    }

    // Build individual_details row (only include fields present in schema)
    const details: Record<string, unknown> = {
      client_id: client.id,
      first_name: c.first_name,
      last_name: c.last_name,
      date_of_birth: c.date_of_birth,
      nationality: c.nationality,
      country_of_residence: c.country_of_residence,
      is_lithuanian_resident: c.is_lithuanian_resident,
      occupation: c.occupation,
      source_of_funds: c.source_of_funds,
      source_of_wealth: c.source_of_wealth,
      purpose_of_relationship: c.purpose_of_relationship,
      relationship_frequency: c.relationship_frequency,
      relationship_use: c.relationship_use,
      pep_status: c.pep_status,
      pep_self_declared: c.pep_self_declared,
      sanctions_status: c.sanctions_status,
      adverse_media_status: c.adverse_media_status,
      id_document_type: c.id_document_type,
      id_document_number: c.id_document_number,
      id_document_expiry: c.id_document_expiry,
      id_issuing_country: c.id_issuing_country,
      residential_address: c.residential_address,
      phone: c.phone,
      email: c.email,
      acting_on_own_behalf: c.acting_on_own_behalf,
      created_at: c.created_at,
      updated_at: c.created_at,
    };

    // Optional fields
    if (c.personal_id_number) details.personal_id_number = c.personal_id_number;
    if (c.foreign_id_number) details.foreign_id_number = c.foreign_id_number;
    if (c.pep_details) details.pep_details = c.pep_details;
    if (c.correspondence_address) details.correspondence_address = c.correspondence_address;
    if (c.beneficial_owner_info) details.beneficial_owner_info = c.beneficial_owner_info;

    const { error: detailsErr } = await admin
      .from("individual_details")
      .insert(details);

    if (detailsErr) {
      console.error(`  ERROR inserting individual_details for ${c.first_name} ${c.last_name}:`, detailsErr.message);
      // Clean up orphaned client row
      await admin.from("clients").delete().eq("id", client.id);
      continue;
    }

    console.log(`  OK    ${c.first_name} ${c.last_name} (${c.kyc_status}, ${c.risk_rating})`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}, Total: ${CLIENTS.length}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
