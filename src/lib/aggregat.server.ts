import type { Firestore } from "firebase-admin/firestore";
import { fsSidvis } from "./fs-db.server";

/**
 * Förberäknade aggregat: avvikelser (ledamöter som röstat mot partiets
 * majoritet) och partisplittringar (voteringar där ett parti inte röstade
 * enigt). Byggs om i sin helhet efter varje inläsning – en full rebuild är
 * billig (~11k dokument) och kan aldrig bli inkonsekvent.
 */

const JAMFORBARA = new Set(["Ja", "Nej", "Avstår"]);
const MAX_AVVIKELSER = 800;
const MAX_SPLITTRINGAR = 400;
/** Minsta minoritet som räknas som en splittring (annars är det bara en avvikare). */
const MIN_MINORITET = 2;

export type AvvikelsePost = {
  votering_id: string;
  ledamot_id: string;
  parti: string | null;
  rost: string;
  majoritet: string;
  datum: string | null;
  beteckning: string | null;
  titel: string | null;
  sakfragor: string[];
};

export type SplittringPost = {
  votering_id: string;
  parti: string;
  ja: number;
  nej: number;
  avstar: number;
  avgivna: number;
  /** Minoritetens andel av partiets avgivna röster (0–0.5). */
  splittring: number;
  /** Rangordningspoäng: splittring viktad mot antal avgivna röster. */
  poang: number;
  majoritetsrost: string | null;
  datum: string | null;
  beteckning: string | null;
  titel: string | null;
  arende_id: string | null;
  sakfragor: string[];
};

type MatrisPost = {
  rost?: string;
  parti?: string | null;
  majoritet?: string | null;
  datum?: string | null;
  beteckning?: string | null;
  titel?: string | null;
  sakfragor?: string[];
};

type PartitotalDoc = {
  votering_id?: string;
  parti?: string;
  ja?: number;
  nej?: number;
  avstar?: number;
  majoritetsrost?: string | null;
  datum?: string | null;
  beteckning?: string | null;
  titel?: string | null;
  arende_id?: string | null;
  sakfragor?: string[];
};

export async function byggAvvikelseOchSplittring(db: Firestore) {
  /* Avvikelser ur röstmatriserna (rost + partimajoritet per post). */
  const matriser = await fsSidvis<{ poster: Record<string, MatrisPost> }>("rostmatriser");
  const avvikelser: AvvikelsePost[] = [];
  for (const m of matriser) {
    for (const [voteringId, p] of Object.entries(m.poster ?? {})) {
      if (!p.rost || !p.majoritet || !JAMFORBARA.has(p.rost) || p.rost === p.majoritet) continue;
      avvikelser.push({
        votering_id: voteringId,
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
    poster: avvikelser.slice(0, MAX_AVVIKELSER),
    totalt: avvikelser.length,
    uppdaterad: new Date().toISOString(),
  });

  /* Splittringar ur partitotalerna. */
  const totaler = await fsSidvis<PartitotalDoc>("partitotaler");
  const splittringar: SplittringPost[] = [];
  for (const t of totaler) {
    const ja = t.ja ?? 0;
    const nej = t.nej ?? 0;
    const avstar = t.avstar ?? 0;
    const avgivna = ja + nej + avstar;
    const minoritet = avgivna - Math.max(ja, nej, avstar);
    if (minoritet < MIN_MINORITET || avgivna === 0) continue;
    const splittring = minoritet / avgivna;
    splittringar.push({
      votering_id: t.votering_id ?? "",
      parti: t.parti ?? "",
      ja,
      nej,
      avstar,
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
    poster: splittringar.slice(0, MAX_SPLITTRINGAR),
    totalt: splittringar.length,
    uppdaterad: new Date().toISOString(),
  });

  return { avvikelser: avvikelser.length, splittringar: splittringar.length };
}
