/**
 * Migrering Supabase (PostgREST) -> Firestore.
 *
 * Kör:  node scripts/migrera-till-firestore.mjs
 * Krav: .env med SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY
 *       samt ADC mot GCP: `gcloud auth application-default login`
 *       (eller GOOGLE_APPLICATION_CREDENTIALS).
 *
 * Idempotent: dokument-id:n är deterministiska och skrivs med merge,
 * så skriptet kan köras om utan dubbletter. Framsteg sparas i
 * scripts/.migrering-state.json så en avbruten körning kan återupptas.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FIL = join(ROT, "scripts", ".migrering-state.json");
const SIDA = 1000;

/* ------------------------------- env ------------------------------- */

const env = Object.fromEntries(
  readFileSync(join(ROT, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^"|"$/g, ""),
      ];
    }),
);

const SUPA_URL = env.SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_PUBLISHABLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY saknas i .env");
  process.exit(1);
}

/* ----------------------------- Firestore --------------------------- */

initializeApp({
  credential: applicationDefault(),
  projectId: env.FIREBASE_PROJECT_ID || "insikt-riksdag",
});
const db = getFirestore();

function ren(obj) {
  const ut = {};
  for (const [k, v] of Object.entries(obj)) ut[k] = v === undefined ? null : v;
  return ut;
}

let skrivna = 0;
async function skrivBatch(samling, poster) {
  for (let i = 0; i < poster.length; i += 450) {
    const batch = db.batch();
    for (const p of poster.slice(i, i + 450)) {
      batch.set(db.collection(samling).doc(String(p.id)), ren(p.data), { merge: true });
    }
    await batch.commit();
    skrivna += Math.min(450, poster.length - i);
  }
}

/* ----------------------------- Supabase ---------------------------- */

async function supaSida(tabell, offset, extra = "") {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/${tabell}?select=*&limit=${SIDA}&offset=${offset}${extra}`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${tabell}: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** Hämtar alla rader i en tabell (sidvis). */
async function supaAllt(tabell, extra = "") {
  const ut = [];
  for (let offset = 0; ; offset += SIDA) {
    const sida = await supaSida(tabell, offset, extra);
    ut.push(...sida);
    if (sida.length < SIDA) return ut;
    process.stdout.write(`\r  ${tabell}: läst ${ut.length}`);
  }
}

/* ------------------------------ state ------------------------------ */

const state = existsSync(STATE_FIL)
  ? JSON.parse(readFileSync(STATE_FIL, "utf8"))
  : { klara: [], rosterOffset: 0 };
function sparaState() {
  writeFileSync(STATE_FIL, JSON.stringify(state));
}
const klar = (t) => state.klara.includes(t);
const markeraKlar = (t) => {
  state.klara.push(t);
  sparaState();
};

function majoritet(p) {
  if (p.ja > p.nej && p.ja > p.avstar) return "Ja";
  if (p.nej > p.ja && p.nej > p.avstar) return "Nej";
  if (p.avstar > p.ja && p.avstar > p.nej) return "Avstår";
  return null;
}

/* ------------------------------ main ------------------------------- */

console.log("Läser referensdata från Supabase …");

const [partier, sakfragor, arenden, beslutspunkter, voteringar, uppdrag, ledamoter, partitotaler] =
  await Promise.all([
    supaAllt("partier"),
    supaAllt("sakfragor"),
    supaAllt("arenden"),
    supaAllt("beslutspunkter"),
    supaAllt("voteringar"),
    supaAllt("uppdrag"),
    supaAllt("ledamoter"),
    supaAllt("partitotaler"),
  ]);
console.log(
  `\npartier=${partier.length} sakfragor=${sakfragor.length} arenden=${arenden.length} ` +
    `beslutspunkter=${beslutspunkter.length} voteringar=${voteringar.length} ` +
    `uppdrag=${uppdrag.length} ledamoter=${ledamoter.length} partitotaler=${partitotaler.length}`,
);

let arendeSakfragor = [];
try {
  arendeSakfragor = await supaAllt("arende_sakfragor");
} catch (e) {
  console.warn("Kunde inte läsa arende_sakfragor:", e.message);
}
const sakfragorPerArende = new Map();
for (const k of arendeSakfragor) {
  const m = sakfragorPerArende.get(k.arende_id) ?? { slugs: new Set(), kalla: {} };
  m.slugs.add(k.sakfraga);
  m.kalla[k.sakfraga] = k.kalla ?? "insikt";
  sakfragorPerArende.set(k.arende_id, m);
}
const arendeMap = new Map(arenden.map((a) => [a.id, a]));
const sakfragorFor = (arendeId) => [...(sakfragorPerArende.get(arendeId)?.slugs ?? [])];

/* ----- småtabeller ------------------------------------------------ */

if (!klar("partier")) {
  await skrivBatch(
    "partier",
    partier.map((p) => ({ id: p.kod, data: p })),
  );
  markeraKlar("partier");
  console.log("partier klart");
}
if (!klar("sakfragor")) {
  await skrivBatch(
    "sakfragor",
    sakfragor.map((s) => ({ id: s.slug, data: s })),
  );
  markeraKlar("sakfragor");
  console.log("sakfragor klart");
}
if (!klar("arenden")) {
  await skrivBatch(
    "arenden",
    arenden.map((a) => ({
      id: a.id,
      data: {
        ...a,
        sakfragor: sakfragorFor(a.id),
        sakfragor_kalla: sakfragorPerArende.get(a.id)?.kalla ?? {},
      },
    })),
  );
  markeraKlar("arenden");
  console.log("arenden klart");
}
if (!klar("beslutspunkter")) {
  await skrivBatch(
    "beslutspunkter",
    beslutspunkter.map((b) => ({ id: b.id, data: b })),
  );
  markeraKlar("beslutspunkter");
  console.log("beslutspunkter klart");
}
if (!klar("voteringar")) {
  await skrivBatch(
    "voteringar",
    voteringar.map((v) => {
      const a = v.arende_id ? arendeMap.get(v.arende_id) : null;
      return {
        id: v.id,
        data: {
          ...v,
          organ: a?.organ ?? null,
          arende_titel: a?.titel ?? null,
          sakfragor: sakfragorFor(v.arende_id),
        },
      };
    }),
  );
  markeraKlar("voteringar");
  console.log("voteringar klart");
}
if (!klar("ledamoter")) {
  const utskottPerLedamot = new Map();
  for (const u of uppdrag) {
    if (u.typ !== "uppdrag" || !u.organ_kod) continue;
    const set = utskottPerLedamot.get(u.ledamot_id) ?? new Set();
    set.add(u.organ_kod);
    utskottPerLedamot.set(u.ledamot_id, set);
  }
  await skrivBatch(
    "ledamoter",
    ledamoter.map((l) => ({
      id: l.id,
      data: { ...l, utskott: [...(utskottPerLedamot.get(l.id) ?? [])].sort() },
    })),
  );
  markeraKlar("ledamoter");
  console.log("ledamoter klart");
}
if (!klar("uppdrag")) {
  await skrivBatch(
    "uppdrag",
    uppdrag.map((u) => ({ id: `u${u.id}`, data: u })),
  );
  markeraKlar("uppdrag");
  console.log("uppdrag klart");
}

/* ----- votering-meta + majoritetskarta ------------------------------ */

const voteringMeta = new Map();
for (const v of voteringar) {
  const a = v.arende_id ? arendeMap.get(v.arende_id) : null;
  voteringMeta.set(v.id, {
    datum: v.datum ?? null,
    rm: v.rm ?? null,
    arende_id: v.arende_id ?? null,
    organ: a?.organ ?? null,
    titel: a?.titel ?? v.rubrik ?? null,
    rubrik: v.rubrik ?? null,
    beteckning: v.beteckning ?? null,
    punkt: v.punkt ?? null,
    sakfragor: sakfragorFor(v.arende_id),
  });
}

const majoritetKarta = new Map(); // `${vid}|${parti}` -> majoritetsrost
for (const p of partitotaler) {
  majoritetKarta.set(`${p.votering_id}|${p.parti}`, majoritet(p));
}

/* ----- roster (strömmas sidvis) + matriser -------------------------- */

// Matriser byggs alltid om från hela roster-strömmen så att en
// återupptagen körning ändå får kompletta aggregat.
const matriser = new Map(); // ledamot_id -> {vid: post}
const rostPerParti = new Map(); // `${vid}|${parti}` -> {Ja,Nej,Avstår,Frånvarande}
const skrivRoster = !klar("roster");
let rosterTotalt = state.rosterOffset ?? 0;

let offset = 0;
for (;;) {
  const sida = await supaSida("roster", offset, "&order=votering_id,ledamot_id");
  if (sida.length === 0) break;
  const poster = [];
  for (const r of sida) {
    const meta = voteringMeta.get(r.votering_id) ?? {};
    const maj = r.parti ? (majoritetKarta.get(`${r.votering_id}|${r.parti}`) ?? null) : null;
    poster.push({
      id: `${r.votering_id}|${r.ledamot_id}`,
      data: {
        ...r,
        datum: meta.datum ?? null,
        arende_id: meta.arende_id ?? null,
        organ: meta.organ ?? null,
        titel: meta.titel ?? null,
        rubrik: meta.rubrik ?? null,
        beteckning: meta.beteckning ?? null,
        punkt: meta.punkt ?? null,
        sakfragor: meta.sakfragor ?? [],
        partimajoritet: maj,
      },
    });
    const m = matriser.get(r.ledamot_id) ?? {};
    m[r.votering_id] = {
      rost: r.rost,
      parti: r.parti ?? null,
      majoritet: maj,
      datum: meta.datum ?? null,
      sakfragor: meta.sakfragor ?? [],
      titel: meta.titel ?? null,
      beteckning: meta.beteckning ?? null,
      punkt: meta.punkt ?? null,
    };
    matriser.set(r.ledamot_id, m);
    const pk = `${r.votering_id}|${r.parti}`;
    const c = rostPerParti.get(pk) ?? { Ja: 0, Nej: 0, Avstår: 0, Frånvarande: 0 };
    if (c[r.rost] !== undefined) c[r.rost] += 1;
    rostPerParti.set(pk, c);
  }
  if (skrivRoster && offset >= rosterTotalt) {
    await skrivBatch("roster", poster);
    rosterTotalt = offset + sida.length;
    state.rosterOffset = rosterTotalt;
    sparaState();
  }
  offset += sida.length;
  process.stdout.write(`\rroster: ${offset}`);
  if (sida.length < SIDA) break;
}
console.log(`\nroster klart (${offset})`);
if (skrivRoster) markeraKlar("roster");

/* ----- partitotaler med majoritet + enligt --------------------------- */

if (!klar("partitotaler")) {
  const poster = partitotaler.map((p) => {
    const meta = voteringMeta.get(p.votering_id) ?? {};
    const maj = majoritetKarta.get(`${p.votering_id}|${p.parti}`) ?? null;
    const fordelning = rostPerParti.get(`${p.votering_id}|${p.parti}`) ?? {};
    const enligt = maj ? (fordelning[maj] ?? 0) : 0;
    return {
      id: `${p.votering_id}|${p.parti}`,
      data: {
        ...p,
        majoritetsrost: maj,
        enligt,
        datum: meta.datum ?? null,
        rm: meta.rm ?? null,
        arende_id: meta.arende_id ?? null,
        organ: meta.organ ?? null,
        titel: meta.titel ?? null,
        rubrik: meta.rubrik ?? null,
        beteckning: meta.beteckning ?? null,
        punkt: meta.punkt ?? null,
        sakfragor: meta.sakfragor ?? [],
      },
    };
  });
  await skrivBatch("partitotaler", poster);
  markeraKlar("partitotaler");
  console.log("partitotaler klart");
}

/* ----- partimajoriteter + rostmatriser ------------------------------- */

if (!klar("matriser")) {
  const partiMajoriteter = new Map(); // parti -> {vid: post}
  for (const p of partitotaler) {
    const meta = voteringMeta.get(p.votering_id) ?? {};
    const m = partiMajoriteter.get(p.parti) ?? {};
    m[p.votering_id] = {
      majoritet: majoritetKarta.get(`${p.votering_id}|${p.parti}`) ?? null,
      datum: meta.datum ?? null,
      sakfragor: meta.sakfragor ?? [],
      titel: meta.titel ?? null,
      beteckning: meta.beteckning ?? null,
      punkt: meta.punkt ?? null,
    };
    partiMajoriteter.set(p.parti, m);
  }
  await skrivBatch(
    "partimajoriteter",
    [...partiMajoriteter.entries()].map(([parti, poster]) => ({ id: parti, data: { poster } })),
  );
  console.log("partimajoriteter klart");

  await skrivBatch(
    "rostmatriser",
    [...matriser.entries()].map(([lid, poster]) => ({ id: lid, data: { poster } })),
  );
  console.log(`rostmatriser klart (${matriser.size} ledamöter)`);
  markeraKlar("matriser");
}

/* ----- övriga tabeller ---------------------------------------------- */

for (const [tabell, samling, idFalt] of [
  ["ai_sammanfattningar", "ai_sammanfattningar", "arende_id"],
  ["ai_voteringssammanfattningar", "ai_voteringssammanfattningar", "votering_id"],
  ["felrapporter", "felrapporter", "id"],
  ["inlasningar", "inlasningar", "id"],
]) {
  if (klar(samling)) continue;
  try {
    const rader = await supaAllt(tabell);
    await skrivBatch(
      samling,
      rader.map((r) => ({ id: r[idFalt], data: r })),
    );
    console.log(`${samling} klart (${rader.length})`);
  } catch (e) {
    console.warn(`Hoppade över ${tabell}: ${e.message}`);
  }
  markeraKlar(samling);
}

// anvandarroller migreras inte – Supabase-uids matchar inte Firebase-uids.
// Skapa i stället anvandarroller/{firebase-uid} { role: "admin" } efter första inloggningen.

await db
  .collection("meta")
  .doc("migrering")
  .set({
    klar: new Date().toISOString(),
    kalla: "supabase",
    antal: {
      partier: partier.length,
      sakfragor: sakfragor.length,
      arenden: arenden.length,
      beslutspunkter: beslutspunkter.length,
      voteringar: voteringar.length,
      uppdrag: uppdrag.length,
      ledamoter: ledamoter.length,
      partitotaler: partitotaler.length,
      roster: offset,
    },
  });

console.log(`\nKlart. Totalt ${skrivna} dokument skrivna.`);
process.exit(0);
