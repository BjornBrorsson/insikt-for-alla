/**
 * Bygger aggregatdokumenten aggregat/avvikelser och aggregat/splittringar
 * från befintliga rostmatriser och partitotaler. Körs en gång efter
 * migrationen – därefter underhålls aggregaten av inläsningen.
 *
 * Kör: node scripts/bygg-aggregat.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROT = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(ROT, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

initializeApp({ credential: applicationDefault(), projectId: env.FIREBASE_PROJECT_ID || "insikt-riksdag" });
const db = getFirestore();

const JNÅ = new Set(["Ja", "Nej", "Avstår"]);
const MAX_A = 800;
const MAX_S = 400;
const MIN_MINORITET = 2;

async function alla(samling) {
  const ut = [];
  let q = db.collection(samling).orderBy("__name__").limit(500);
  for (;;) {
    const s = await q.get();
    ut.push(...s.docs);
    if (s.size < 500) return ut;
    q = db.collection(samling).orderBy("__name__").startAfter(s.docs[s.size - 1].id).limit(500);
  }
}

const matriser = await alla("rostmatriser");
const avvikelser = [];
for (const m of matriser) {
  for (const [vid, p] of Object.entries(m.data().poster ?? {})) {
    if (!p.rost || !p.majoritet || !JNÅ.has(p.rost) || p.rost === p.majoritet) continue;
    avvikelser.push({
      votering_id: vid,
      ledamot_id: m.id,
      parti: p.parti ?? null,
      rost: p.rost,
      majoritet: p.majoritet,
      datum: p.datum ?? null,
      beteckning: p.beteckning ?? null,
      titel: p.titel ?? null,
      sakfragor: p.sakfragor ?? [],
    });
  }
}
avvikelser.sort((a, b) => (b.datum ?? "").localeCompare(a.datum ?? ""));
await db.collection("aggregat").doc("avvikelser").set({
  poster: avvikelser.slice(0, MAX_A),
  totalt: avvikelser.length,
  uppdaterad: new Date().toISOString(),
});
console.log(`avvikelser: ${avvikelser.length}`);

const totaler = await alla("partitotaler");
const splittringar = [];
for (const d of totaler) {
  const t = d.data();
  const avgivna = (t.ja ?? 0) + (t.nej ?? 0) + (t.avstar ?? 0);
  const minoritet = avgivna - Math.max(t.ja ?? 0, t.nej ?? 0, t.avstar ?? 0);
  if (minoritet < MIN_MINORITET || avgivna === 0) continue;
  const splittring = minoritet / avgivna;
  splittringar.push({
    votering_id: t.votering_id ?? "",
    parti: t.parti ?? "",
    ja: t.ja ?? 0,
    nej: t.nej ?? 0,
    avstar: t.avstar ?? 0,
    avgivna,
    splittring,
    poang: splittring * Math.log2(avgivna),
    majoritetsrost: t.majoritetsrost ?? null,
    datum: t.datum ?? null,
    beteckning: t.beteckning ?? null,
    titel: t.titel ?? null,
    arende_id: t.arende_id ?? null,
    sakfragor: t.sakfragor ?? [],
  });
}
splittringar.sort((a, b) => b.poang - a.poang || (b.datum ?? "").localeCompare(a.datum ?? ""));
await db.collection("aggregat").doc("splittringar").set({
  poster: splittringar.slice(0, MAX_S),
  totalt: splittringar.length,
  uppdaterad: new Date().toISOString(),
});
console.log(`splittringar: ${splittringar.length}`);
process.exit(0);
