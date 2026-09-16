import type { DocumentData, Query } from "firebase-admin/firestore";

/**
 * Firestore-hjälp för serverfunktionerna.
 * All data läses/skrivs via Admin SDK på servern – klienten når aldrig databasen.
 */

async function firestore() {
  const { db } = await import("@/integrations/firebase/server");
  return db();
}

export async function fsDb() {
  return firestore();
}

/** Tar bort undefined-fält (Firestore accepterar dem inte) och gör om dem till null. */
export function ren<T extends Record<string, unknown>>(obj: T): T {
  const ut: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) ut[k] = v === undefined ? null : v;
  return ut as T;
}

export async function fsHämta<T>(
  samling: string,
  id: string,
): Promise<(T & { id: string }) | null> {
  const db = await firestore();
  const snap = await db.collection(samling).doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as T & { id: string }) : null;
}

/** Hämtar alla dokument i en fråga. Använd bara för avgränsade frågor. */
export async function fsAlla<T>(q: Query<DocumentData>): Promise<(T & { id: string })[]> {
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T & { id: string });
}

/** Sidvis hämtning av stora samlingar. */
export async function fsSidvis<T>(
  samling: string,
  sidStorlek = 500,
): Promise<(T & { id: string })[]> {
  const db = await firestore();
  const ut: (T & { id: string })[] = [];
  let q: Query<DocumentData> = db.collection(samling).orderBy("__name__").limit(sidStorlek);
  for (;;) {
    const snap = await q.get();
    for (const d of snap.docs) ut.push({ id: d.id, ...d.data() } as T & { id: string });
    if (snap.size < sidStorlek) return ut;
    q = db
      .collection(samling)
      .orderBy("__name__")
      .startAfter(snap.docs[snap.size - 1]!.id)
      .limit(sidStorlek);
  }
}

/** Skriver dokument i batchar om max 500 (Firestore-gränsen). */
export async function fsSkrivManga(
  samling: string,
  poster: { id: string; data: Record<string, unknown> }[],
  slaaIhop = true,
): Promise<number> {
  const db = await firestore();
  let skrivna = 0;
  for (let i = 0; i < poster.length; i += 450) {
    const batch = db.batch();
    for (const p of poster.slice(i, i + 450)) {
      batch.set(db.collection(samling).doc(p.id), ren(p.data), { merge: slaaIhop });
    }
    await batch.commit();
    skrivna += Math.min(450, poster.length - i);
  }
  return skrivna;
}

export async function fsSatt(samling: string, id: string, data: Record<string, unknown>) {
  const db = await firestore();
  await db.collection(samling).doc(id).set(ren(data), { merge: true });
}

export async function fsUppdatera(samling: string, id: string, data: Record<string, unknown>) {
  const db = await firestore();
  await db.collection(samling).doc(id).update(ren(data));
}

export async function fsNyRad(samling: string, data: Record<string, unknown>) {
  const db = await firestore();
  const ref = await db.collection(samling).add(ren(data));
  return ref.id;
}

export async function fsRadera(samling: string, id: string) {
  const db = await firestore();
  await db.collection(samling).doc(id).delete();
}

export async function fsRaderaDar(samling: string, fält: string, värden: string[]) {
  const db = await firestore();
  for (let i = 0; i < värden.length; i += 30) {
    const snap = await db
      .collection(samling)
      .where(fält, "in", värden.slice(i, i + 30))
      .get();
    if (snap.empty) continue;
    const batch = db.batch();
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
  }
}

/** Antal dokument i en samling (aggregeringsfråga – billig). */
export async function fsAntal(samling: string): Promise<number> {
  const db = await firestore();
  const snap = await db.collection(samling).count().get();
  return snap.data().count;
}

export type Rost = "Ja" | "Nej" | "Avstår" | "Frånvarande";

/** Samma härledning som SQL-vyn v_partimajoritet. */
export function majoritetsrost(p: {
  ja: number;
  nej: number;
  avstar: number;
}): "Ja" | "Nej" | "Avstår" | null {
  if (p.ja > p.nej && p.ja > p.avstar) return "Ja";
  if (p.nej > p.ja && p.nej > p.avstar) return "Nej";
  if (p.avstar > p.ja && p.avstar > p.nej) return "Avstår";
  return null;
}
