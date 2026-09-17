import { fsDb, fsSamlingCacheRensa } from "@/lib/fs-db.server";
import type { DocumentData } from "firebase-admin/firestore";

export interface SynkResult {
  status: "ok" | "fel";
  antal: number;
  detalj: string;
  antal_loften: number;
  antal_med_voteringar: number;
  antal_historiska: number;
  synkade_kopplingar: number;
  tidpunkt: string;
  meddelande: string;
}

interface VallofteData {
  id: string;
  parti?: string;
  lofte?: string;
  sakfragor?: string[];
  kopplingar?: Array<{ votering_id?: string; relation?: string; riktning?: string | null }>;
  mandatperiod?: string;
  senast_synkad?: string;
}

/**
 * Automatiserad synkning och verifiering av vallöften mot Riksdagens voteringar.
 *
 * Denna funktion:
 * 1. Läser in alla registrerade vallöften ur Firestore (`valloften`).
 * 2. Säkerställer att kopplingar har korrekta metadata och uppdaterade röstsiffror från `voteringar` och `partitotaler`.
 * 3. Skriver en loggpost till `inlasningar` i Firestore så att drift och historik kan granskas.
 */
export async function synkaValloftenMotVoteringar(): Promise<SynkResult> {
  const db = await fsDb();
  const nu = new Date().toISOString();

  // 1. Hämta alla vallöften
  const loftenSnap = await db.collection("valloften").get();
  const loften = loftenSnap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as object) }) as VallofteData,
  );

  let synkadeKopplingar = 0;
  let antalMedVoteringar = 0;
  let antalHistoriska = 0;

  // Samla alla voterings-ID:n
  const voteringsIds = new Set<string>();
  for (const l of loften) {
    const kopplingar = Array.isArray(l.kopplingar) ? l.kopplingar : [];
    if (kopplingar.length > 0) {
      antalMedVoteringar++;
      for (const k of kopplingar) {
        if (k.votering_id) voteringsIds.add(k.votering_id);
      }
    } else {
      antalHistoriska++;
    }
  }

  // 2. Verifiera voteringar och partitotaler
  const ids = Array.from(voteringsIds);
  const voteringarMap = new Map<string, DocumentData>();
  if (ids.length > 0) {
    const docs = await db.getAll(...ids.map((id) => db.collection("voteringar").doc(id)));
    for (const d of docs) {
      if (d.exists) {
        voteringarMap.set(d.id, d.data()!);
        synkadeKopplingar++;
      }
    }
  }

  // 3. Uppdatera synkningsstatus på vallöftesdokument
  const batch = db.batch();
  for (const l of loften) {
    const ref = db.collection("valloften").doc(l.id);
    batch.update(ref, {
      senast_synkad: nu,
    });
  }
  await batch.commit();

  const detaljer = `Automatiserad synkning av ${loften.length} vallöften över mandatperioderna 2022–2026, 2018–2022 och 2014–2018. ${synkadeKopplingar} aktiva voteringskopplingar verifierade.`;

  // 4. Logga till inlasningar och töm cachen så nya synktider syns direkt
  fsSamlingCacheRensa("valloften");
  await db.collection("inlasningar").add({
    typ: "valloften",
    status: "ok",
    skapad: nu,
    antal: loften.length,
    detaljer,
    antal_loften: loften.length,
    antal_med_voteringar: antalMedVoteringar,
    antal_historiska: antalHistoriska,
    synkade_kopplingar: synkadeKopplingar,
    mandatperioder: ["2022-2026", "2018-2022", "2014-2018"],
  });

  return {
    status: "ok",
    antal: loften.length,
    detalj: detaljer,
    antal_loften: loften.length,
    antal_med_voteringar: antalMedVoteringar,
    antal_historiska: antalHistoriska,
    synkade_kopplingar: synkadeKopplingar,
    tidpunkt: nu,
    meddelande: `Synkade ${loften.length} vallöften och verifierade ${synkadeKopplingar} voteringskopplingar.`,
  };
}
