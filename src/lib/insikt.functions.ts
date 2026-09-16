import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DocumentData, Query } from "firebase-admin/firestore";

import { requireFirebaseAuth } from "@/integrations/firebase/auth";

import { fsAntal, fsDb, fsHämta, fsNyRad, fsUppdatera } from "./fs-db.server";

/* ------------------------------------------------------------------ */
/* Typer                                                              */
/* ------------------------------------------------------------------ */

export type Parti = {
  kod: string;
  namn: string;
  forkortning: string;
  farg: string | null;
  ordning: number;
};

export type Ledamot = {
  id: string;
  fornamn: string;
  efternamn: string;
  parti: string | null;
  valkrets: string | null;
  status: string | null;
  fodd_ar: number | null;
  kon: string | null;
  bild_url: string | null;
  bild_url_liten: string | null;
  kalla_url: string | null;
};

export type Votering = {
  id: string;
  arende_id: string | null;
  rm: string | null;
  beteckning: string | null;
  punkt: string | null;
  rubrik: string | null;
  gallde: string | null;
  avser: string | null;
  ja: number;
  nej: number;
  avstar: number;
  franvarande: number;
  vinnare: string | null;
  datum: string | null;
  kalla_url: string | null;
};

type ArendeDoc = {
  id: string;
  rm: string | null;
  beteckning: string | null;
  organ: string | null;
  doktyp: string | null;
  titel: string | null;
  undertitel: string | null;
  datum: string | null;
  publicerad: string | null;
  kalla_url_html: string | null;
  kalla_url_text: string | null;
  uppdaterad: string;
  sakfragor?: string[];
  sakfragor_kalla?: Record<string, string>;
};

type VoteringDoc = Votering & {
  beslutspunkt_id: string | null;
  typ: string | null;
  uppdaterad: string;
  organ: string | null;
  arende_titel: string | null;
  sakfragor: string[];
};

type RostDoc = {
  votering_id: string;
  ledamot_id: string;
  parti: string | null;
  valkrets: string | null;
  rost: string;
  avser: string | null;
  datum: string | null;
  arende_id: string | null;
  titel: string | null;
  rubrik: string | null;
  beteckning: string | null;
  punkt: string | null;
  sakfragor: string[];
  partimajoritet: string | null;
};

type PartitotalDoc = {
  votering_id: string;
  parti: string;
  ja: number;
  nej: number;
  avstar: number;
  franvarande: number;
  majoritetsrost: string | null;
  enligt: number;
  datum: string | null;
  rm: string | null;
  arende_id: string | null;
  titel: string | null;
  rubrik: string | null;
  beteckning: string | null;
  punkt: string | null;
  sakfragor: string[];
};

/** En post i rostmatriser/{ledamot_id} eller partimajoriteter/{parti}. */
type MatrisPost = {
  rost?: string;
  majoritet: string | null;
  datum: string | null;
  sakfragor: string[];
  titel: string | null;
  beteckning: string | null;
  punkt: string | null;
};

const GILTIGA_ROSTER = new Set(["Ja", "Nej", "Avstår"]);
const TJANSTGORANDE = "Tjänstgörande riksdagsledamot";

function iPeriod(datum: string | null | undefined, fran?: string | null, till?: string | null) {
  if (fran && (!datum || datum < fran)) return false;
  if (till && (!datum || datum > till)) return false;
  return true;
}

function harSakfraga(sakfragor: string[] | undefined, sakfraga?: string | null) {
  return !sakfraga || (sakfragor ?? []).includes(sakfraga);
}

function textSok(q: string, ...falt: (string | null | undefined)[]) {
  const s = q.toLowerCase();
  return falt.some((f) => f?.toLowerCase().includes(s));
}

/* ------------------------------------------------------------------ */
/* Datastatus – vad täcker Insikt just nu?                            */
/* ------------------------------------------------------------------ */

export const getDatastatus = createServerFn({ method: "GET" }).handler(async () => {
  const db = await fsDb();
  const [ledamoter, arenden, voteringar, roster, senast, aldst, senastUppdaterad] =
    await Promise.all([
      fsAntal("ledamoter"),
      fsAntal("arenden"),
      fsAntal("voteringar"),
      fsAntal("roster"),
      db.collection("voteringar").orderBy("datum", "desc").limit(1).get(),
      db.collection("voteringar").orderBy("datum", "asc").limit(1).get(),
      db.collection("voteringar").orderBy("uppdaterad", "desc").limit(1).get(),
    ]);

  return {
    ledamoter,
    arenden,
    voteringar,
    roster,
    senasteVotering: (senast.docs[0]?.data()["datum"] as string | null) ?? null,
    aldstaVotering: (aldst.docs[0]?.data()["datum"] as string | null) ?? null,
    senastUppdaterad: (senastUppdaterad.docs[0]?.data()["uppdaterad"] as string | null) ?? null,
  };
});

/* ------------------------------------------------------------------ */
/* Startsida                                                          */
/* ------------------------------------------------------------------ */

export const getStartsida = createServerFn({ method: "GET" }).handler(async () => {
  const db = await fsDb();
  const [voteringar, partier, sakfragor, valkretsar] = await Promise.all([
    db.collection("voteringar").orderBy("datum", "desc").limit(8).get(),
    db.collection("partier").orderBy("ordning").get(),
    db.collection("sakfragor").orderBy("ordning").get(),
    db.collection("ledamoter").where("status", "==", TJANSTGORANDE).get(),
  ]);

  const valkretsNamn = [
    ...new Set(
      valkretsar.docs
        .map((d) => d.data()["valkrets"] as string | null)
        .filter((v): v is string => !!v),
    ),
  ].sort((a, b) => a.localeCompare(b, "sv"));

  const senasteVoteringar = voteringar.docs
    .map((d) => {
      const v = d.data() as VoteringDoc;
      if (!v.datum) return null;
      return {
        ...v,
        arenden: v.arende_id
          ? { id: v.arende_id, titel: v.arende_titel ?? null, organ: v.organ ?? null, rm: v.rm }
          : null,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return {
    senasteVoteringar: senasteVoteringar as (Votering & {
      arenden: { id: string; titel: string | null; organ: string | null; rm: string | null } | null;
    })[],
    partier: partier.docs.map((d) => d.data() as Parti),
    sakfragor: sakfragor.docs.map((d) => {
      const s = d.data();
      return {
        slug: s["slug"] as string,
        namn: s["namn"] as string,
        beskrivning: (s["beskrivning"] as string | null) ?? null,
      };
    }),
    valkretsar: valkretsNamn,
  };
});

/* ------------------------------------------------------------------ */
/* Ledamöter                                                          */
/* ------------------------------------------------------------------ */

export const listLedamoter = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().default(""),
        parti: z.string().default(""),
        valkrets: z.string().default(""),
        utskott: z.string().default(""),
        tjanstgoring: z.string().default("aktuella"),
        sortering: z.string().default("namn"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const db = await fsDb();
    // En equality i Firestore (parti eller valkrets), resten i minnet –
    // undviker sammansatta index och matchar gamla ilike-sökningen.
    let fraga: Query<DocumentData> = db.collection("ledamoter");
    if (data.parti) fraga = fraga.where("parti", "==", data.parti);
    else if (data.valkrets) fraga = fraga.where("valkrets", "==", data.valkrets);
    else if (data.tjanstgoring === "aktuella") fraga = fraga.where("status", "==", TJANSTGORANDE);

    const snap = await fraga.get();
    let rader = snap.docs.map(
      (d) =>
        ({ id: d.id, ...d.data() }) as Ledamot & {
          sorteringsnamn?: string | null;
          utskott?: string[];
        },
    );

    if (data.parti && data.valkrets) rader = rader.filter((l) => l.valkrets === data.valkrets);
    if (data.tjanstgoring === "aktuella" && (data.parti || data.valkrets))
      rader = rader.filter((l) => l.status === TJANSTGORANDE);
    if (data.tjanstgoring === "historiska") rader = rader.filter((l) => l.status !== TJANSTGORANDE);
    if (data.utskott) rader = rader.filter((l) => (l.utskott ?? []).includes(data.utskott));
    if (data.q) {
      const q = data.q.replace(/[%,]/g, " ").trim();
      rader = rader.filter((l) => textSok(q, l.fornamn, l.efternamn, l.sorteringsnamn));
    }

    rader.sort((a, b) =>
      data.sortering === "parti"
        ? (a.parti ?? "").localeCompare(b.parti ?? "", "sv") ||
          a.efternamn.localeCompare(b.efternamn, "sv")
        : a.efternamn.localeCompare(b.efternamn, "sv") || a.fornamn.localeCompare(b.fornamn, "sv"),
    );

    return { ledamoter: rader.slice(0, 400), totalt: rader.length };
  });

export const getFilterval = createServerFn({ method: "GET" }).handler(async () => {
  const db = await fsDb();
  const [partier, ledamoter, uppdrag] = await Promise.all([
    db.collection("partier").orderBy("ordning").get(),
    db.collection("ledamoter").get(),
    db.collection("uppdrag").where("typ", "==", "uppdrag").get(),
  ]);
  return {
    partier: partier.docs.map((d) => d.data() as Parti),
    valkretsar: [
      ...new Set(
        ledamoter.docs
          .map((d) => d.data()["valkrets"] as string | null)
          .filter((v): v is string => !!v),
      ),
    ].sort((a, b) => a.localeCompare(b, "sv")),
    utskott: [
      ...new Set(
        uppdrag.docs
          .map((d) => d.data()["organ_kod"] as string | null)
          .filter((v): v is string => !!v && v.length <= 6),
      ),
    ].sort(),
  };
});

export const getLedamot = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string(), fran: z.string().default(""), till: z.string().default("") })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await fsDb();
    const ledamot = await fsHämta<Ledamot>("ledamoter", data.id);
    if (!ledamot) return null;

    const fran = data.fran || null;
    const till = data.till || null;

    const [uppdragSnap, rosterSnap, matris] = await Promise.all([
      db.collection("uppdrag").where("ledamot_id", "==", data.id).get(),
      db.collection("roster").where("ledamot_id", "==", data.id).get(),
      fsHämta<{ poster: Record<string, MatrisPost> }>("rostmatriser", data.id),
    ]);

    const uppdrag = uppdragSnap.docs
      .map(
        (d) =>
          d.data() as {
            organ_kod: string | null;
            roll: string | null;
            typ: string | null;
            status: string | null;
            fran: string | null;
            till: string | null;
          },
      )
      .sort((a, b) => (b.fran ?? "").localeCompare(a.fran ?? ""));

    const rostRader = rosterSnap.docs
      .map((d) => d.data() as RostDoc)
      .sort((a, b) => (b.datum ?? "").localeCompare(a.datum ?? ""))
      .slice(0, 300)
      .map((r) => ({
        rost: r.rost,
        parti: r.parti,
        voteringar: {
          id: r.votering_id,
          rubrik: r.rubrik ?? null,
          beteckning: r.beteckning ?? null,
          punkt: r.punkt ?? null,
          datum: r.datum ?? null,
          gallde: null as string | null,
          arende_id: r.arende_id ?? null,
          arenden: r.titel ? { titel: r.titel } : null,
        },
      }));

    // ledamot_sammanfattning: räkna per röst + jämför giltiga röster mot partimajoriteten.
    const s = {
      ja: 0,
      nej: 0,
      avstar: 0,
      franvarande: 0,
      jamforbara: 0,
      lika_med_partimajoritet: 0,
    };
    for (const p of Object.values(matris?.poster ?? {})) {
      if (!iPeriod(p.datum, fran, till)) continue;
      const rost = p.rost ?? "";
      if (rost === "Ja") s.ja += 1;
      else if (rost === "Nej") s.nej += 1;
      else if (rost === "Avstår") s.avstar += 1;
      else if (rost === "Frånvarande") s.franvarande += 1;
      if (GILTIGA_ROSTER.has(rost) && p.majoritet) {
        s.jamforbara += 1;
        if (rost === p.majoritet) s.lika_med_partimajoritet += 1;
      }
    }

    return { ledamot, uppdrag, roster: rostRader, sammanfattning: s };
  });

/* ------------------------------------------------------------------ */
/* Partier                                                            */
/* ------------------------------------------------------------------ */

export const listPartier = createServerFn({ method: "GET" }).handler(async () => {
  const db = await fsDb();
  const [partier, ledamoter] = await Promise.all([
    db.collection("partier").orderBy("ordning").get(),
    db.collection("ledamoter").where("status", "==", TJANSTGORANDE).get(),
  ]);
  const mandat = new Map<string, number>();
  for (const d of ledamoter.docs) {
    const p = d.data()["parti"] as string | null;
    if (p) mandat.set(p, (mandat.get(p) ?? 0) + 1);
  }
  return partier.docs.map((d) => {
    const p = d.data() as Parti;
    return { ...p, tjanstgorande: mandat.get(p.kod) ?? 0 };
  });
});

export const getParti = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ kod: z.string(), fran: z.string().default(""), till: z.string().default("") })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await fsDb();
    const parti = await fsHämta<Parti>("partier", data.kod);
    if (!parti) return null;

    const fran = data.fran || null;
    const till = data.till || null;

    const [ledamoterSnap, totalerSnap, majoriteterSnap] = await Promise.all([
      db
        .collection("ledamoter")
        .where("parti", "==", data.kod)
        .where("status", "==", TJANSTGORANDE)
        .get(),
      db.collection("partitotaler").where("parti", "==", data.kod).get(),
      db.collection("partimajoriteter").get(),
    ]);

    const ledamoter = ledamoterSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Ledamot)
      .sort((a, b) => a.efternamn.localeCompare(b.efternamn, "sv"));

    // parti_sammanhallning: bara voteringar där partiet har en majoritetsröst.
    const sh = { voteringar: 0, avgivna_roster: 0, enligt_majoritet: 0 };
    const voteringRader: {
      ja: number;
      nej: number;
      avstar: number;
      franvarande: number;
      voteringar: {
        id: string;
        rubrik: string | null;
        beteckning: string | null;
        punkt: string | null;
        datum: string | null;
        gallde: string | null;
        arenden: { titel: string | null } | null;
      };
    }[] = [];

    for (const d of totalerSnap.docs) {
      const t = d.data() as PartitotalDoc;
      if (iPeriod(t.datum, fran, till) && t.majoritetsrost) {
        sh.voteringar += 1;
        sh.avgivna_roster += t.ja + t.nej + t.avstar;
        sh.enligt_majoritet += t.enligt ?? 0;
      }
      voteringRader.push({
        ja: t.ja,
        nej: t.nej,
        avstar: t.avstar,
        franvarande: t.franvarande,
        voteringar: {
          id: t.votering_id,
          rubrik: t.rubrik ?? null,
          beteckning: t.beteckning ?? null,
          punkt: t.punkt ?? null,
          datum: t.datum ?? null,
          gallde: null,
          arenden: t.titel ? { titel: t.titel } : null,
        },
      });
    }

    voteringRader.sort((a, b) =>
      (b.voteringar.datum ?? "").localeCompare(a.voteringar.datum ?? ""),
    );

    // parti_likhet: gemensamma voteringar där båda partierna har en majoritetsröst.
    const egna =
      (
        majoriteterSnap.docs.find((d) => d.id === data.kod)?.data() as
          { poster: Record<string, MatrisPost> } | undefined
      )?.poster ?? {};
    const likhet: { parti: string; gemensamma: number; lika: number }[] = [];
    for (const d of majoriteterSnap.docs) {
      if (d.id === data.kod) continue;
      const poster = (d.data() as { poster: Record<string, MatrisPost> }).poster ?? {};
      let gemensamma = 0;
      let lika = 0;
      for (const [vid, egen] of Object.entries(egna)) {
        const annan = poster[vid];
        if (!egen.majoritet || !annan?.majoritet || !iPeriod(egen.datum, fran, till)) continue;
        gemensamma += 1;
        if (egen.majoritet === annan.majoritet) lika += 1;
      }
      if (gemensamma > 0) likhet.push({ parti: d.id, gemensamma, lika });
    }
    likhet.sort((a, b) => b.lika - a.lika);

    return {
      parti,
      ledamoter,
      sammanhallning: sh,
      likhet,
      voteringar: voteringRader.slice(0, 200),
    };
  });

/* ------------------------------------------------------------------ */
/* Valkretsar                                                         */
/* ------------------------------------------------------------------ */

export const listValkretsar = createServerFn({ method: "GET" }).handler(async () => {
  const db = await fsDb();
  const snap = await db.collection("ledamoter").where("status", "==", TJANSTGORANDE).get();
  const karta = new Map<string, number>();
  for (const d of snap.docs) {
    const v = d.data()["valkrets"] as string | null;
    if (v) karta.set(v, (karta.get(v) ?? 0) + 1);
  }
  return [...karta.entries()]
    .map(([valkrets, ledamoter]) => ({ valkrets, ledamoter }))
    .sort((a, b) => a.valkrets.localeCompare(b.valkrets, "sv"));
});

export const getValkrets = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ namn: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const db = await fsDb();
    const snap = await db
      .collection("ledamoter")
      .where("valkrets", "==", data.namn)
      .where("status", "==", TJANSTGORANDE)
      .get();
    const rader = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Ledamot)
      .sort((a, b) => a.efternamn.localeCompare(b.efternamn, "sv"));
    const fordelning = new Map<string, number>();
    for (const l of rader) if (l.parti) fordelning.set(l.parti, (fordelning.get(l.parti) ?? 0) + 1);
    return {
      valkrets: data.namn,
      ledamoter: rader,
      fordelning: [...fordelning.entries()]
        .map(([parti, antal]) => ({ parti, antal }))
        .sort((a, b) => b.antal - a.antal),
    };
  });

/* ------------------------------------------------------------------ */
/* Voteringar och ärenden                                             */
/* ------------------------------------------------------------------ */

export const listVoteringar = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().default(""),
        rm: z.string().default(""),
        organ: z.string().default(""),
        sakfraga: z.string().default(""),
        fran: z.string().default(""),
        till: z.string().default(""),
        sida: z.number().default(1),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const db = await fsDb();
    const perSida = 25;

    // Mest avgränsande filtret i Firestore, resten i minnet.
    let fraga: Query<DocumentData> = db.collection("voteringar");
    if (data.sakfraga) fraga = fraga.where("sakfragor", "array-contains", data.sakfraga);
    else if (data.organ) fraga = fraga.where("organ", "==", data.organ);
    else if (data.rm) fraga = fraga.where("rm", "==", data.rm);

    const snap = await fraga.get();
    let rader = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VoteringDoc);

    if (data.rm) rader = rader.filter((v) => v.rm === data.rm);
    if (data.organ) rader = rader.filter((v) => v.organ === data.organ);
    if (data.sakfraga) rader = rader.filter((v) => (v.sakfragor ?? []).includes(data.sakfraga));
    rader = rader.filter((v) => iPeriod(v.datum, data.fran || null, data.till || null));
    if (data.q) {
      const q = data.q.replace(/[%,]/g, " ").trim();
      rader = rader.filter((v) => textSok(q, v.rubrik, v.beteckning, v.gallde));
    }

    rader.sort((a, b) => {
      if (a.datum && b.datum) return b.datum.localeCompare(a.datum);
      if (a.datum) return -1;
      if (b.datum) return 1;
      return 0;
    });

    const totalt = rader.length;
    const sida = rader.slice((data.sida - 1) * perSida, data.sida * perSida).map((v) => ({
      ...v,
      arenden: v.arende_id
        ? { id: v.arende_id, titel: v.arende_titel ?? null, organ: v.organ ?? null, rm: v.rm }
        : null,
    }));

    return {
      voteringar: sida as (Votering & {
        arenden: {
          id: string;
          titel: string | null;
          organ: string | null;
          rm: string | null;
        } | null;
      })[],
      totalt,
      perSida,
    };
  });

export const getVoteringsfilter = createServerFn({ method: "GET" }).handler(async () => {
  const db = await fsDb();
  const [voteringar, arenden, sakfragor] = await Promise.all([
    db.collection("voteringar").get(),
    db.collection("arenden").get(),
    db.collection("sakfragor").orderBy("ordning").get(),
  ]);
  return {
    riksmoten: [
      ...new Set(
        voteringar.docs.map((d) => d.data()["rm"] as string | null).filter((v): v is string => !!v),
      ),
    ]
      .sort()
      .reverse(),
    utskott: [
      ...new Set(
        arenden.docs.map((d) => d.data()["organ"] as string | null).filter((v): v is string => !!v),
      ),
    ].sort(),
    sakfragor: sakfragor.docs.map((d) => {
      const s = d.data();
      return { slug: s["slug"] as string, namn: s["namn"] as string };
    }),
  };
});

export const getVotering = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const db = await fsDb();
    const votering = await fsHämta<VoteringDoc>("voteringar", data.id);
    if (!votering) return null;

    const [arende, beslutspunkt, partitotalerSnap, rosterSnap] = await Promise.all([
      votering.arende_id ? fsHämta<ArendeDoc>("arenden", votering.arende_id) : null,
      votering.beslutspunkt_id
        ? fsHämta<{
            punkt: string;
            rubrik: string | null;
            forslag: string | null;
            beslutstyp: string | null;
            motforslag_nummer: string | null;
            motforslag_partier: string | null;
            vinnare: string | null;
            voteringskrav: string | null;
          }>("beslutspunkter", votering.beslutspunkt_id)
        : null,
      db.collection("partitotaler").where("votering_id", "==", data.id).get(),
      db.collection("roster").where("votering_id", "==", data.id).get(),
    ]);

    // Hämta bara namn på de ledamöter som faktiskt finns i voteringen.
    const rosterDocs = rosterSnap.docs.map((d) => d.data() as RostDoc);
    const ledamotSnaps =
      rosterDocs.length === 0
        ? []
        : await db.getAll(...rosterDocs.map((r) => db.collection("ledamoter").doc(r.ledamot_id)));
    const namn = new Map(
      ledamotSnaps
        .filter((s) => s.exists)
        .map((s) => {
          const l = s.data()!;
          return [s.id, { fornamn: l["fornamn"], efternamn: l["efternamn"] }] as const;
        }),
    );

    const partitotaler = partitotalerSnap.docs.map((d) => d.data() as PartitotalDoc);

    return {
      votering: {
        ...votering,
        arenden: arende
          ? {
              id: arende.id,
              titel: arende.titel,
              organ: arende.organ,
              rm: arende.rm,
              datum: arende.datum,
              kalla_url_html: arende.kalla_url_html,
            }
          : null,
        beslutspunkter: beslutspunkt
          ? {
              id: beslutspunkt.id,
              punkt: beslutspunkt.punkt,
              rubrik: beslutspunkt.rubrik,
              forslag: beslutspunkt.forslag,
              beslutstyp: beslutspunkt.beslutstyp,
              motforslag_nummer: beslutspunkt.motforslag_nummer,
              motforslag_partier: beslutspunkt.motforslag_partier,
              vinnare: beslutspunkt.vinnare,
              voteringskrav: beslutspunkt.voteringskrav,
            }
          : null,
      },
      partitotaler: partitotaler.map((p) => ({
        parti: p.parti,
        ja: p.ja,
        nej: p.nej,
        avstar: p.avstar,
        franvarande: p.franvarande,
      })),
      majoritet: partitotaler.map((p) => ({ parti: p.parti, majoritetsrost: p.majoritetsrost })),
      roster: rosterDocs.map((r) => ({
        ledamot_id: r.ledamot_id,
        parti: r.parti,
        valkrets: r.valkrets,
        rost: r.rost,
        ledamoter: namn.get(r.ledamot_id) ?? null,
      })),
    };
  });

export type VoteringsSammanfattning = {
  sammanfattning: string;
  modell: string;
  tillrackligt_underlag: boolean;
  granskad: boolean;
  skapad: string;
};

export type VoteringsSammanfattningSvar =
  | { status: "klar"; sammanfattning: VoteringsSammanfattning }
  | { status: "ej_konfigurerad" }
  | { status: "saknas" }
  | { status: "for_mycket_trafik"; orsak: "ip" | "global" };

/**
 * Hämtar en AI-genererad klartextsammanfattning av en votering.
 * Finns ingen sparad genereras en vid första anropet och sparas (cache).
 */
export const getVoteringsSammanfattning = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }): Promise<VoteringsSammanfattningSvar> => {
    const db = await fsDb();

    const sparad = await fsHämta<VoteringsSammanfattning>("ai_voteringssammanfattningar", data.id);
    if (sparad) {
      const { sammanfattning, modell, tillrackligt_underlag, granskad, skapad } = sparad;
      return {
        status: "klar",
        sammanfattning: { sammanfattning, modell, tillrackligt_underlag, granskad, skapad },
      };
    }

    const { geminiKonfigurerad } = await import("./gemini.server");
    if (!geminiKonfigurerad()) return { status: "ej_konfigurerad" };

    const votering = await fsHämta<VoteringDoc>("voteringar", data.id);
    if (!votering) return { status: "saknas" };

    const [beslutspunkt, partitotalerSnap] = await Promise.all([
      votering.beslutspunkt_id
        ? fsHämta<Record<string, unknown>>("beslutspunkter", votering.beslutspunkt_id)
        : null,
      db.collection("partitotaler").where("votering_id", "==", data.id).get(),
    ]);
    const partitotaler = partitotalerSnap.docs.map((d) => d.data() as PartitotalDoc);

    // Rate limit kontrolleras först när vi vet att en generering faktiskt behövs.
    const { reserveraAiGenerering, klientIp } = await import("./rate-limit.server");
    const plats = reserveraAiGenerering(klientIp());
    if (!plats.ok) return { status: "for_mycket_trafik", orsak: plats.orsak };

    const { genereraVoteringssammanfattning } = await import("./voteringssammanfattning.server");
    const { GeminiKvotFel } = await import("./gemini.server");
    let genererad;
    try {
      genererad = await genereraVoteringssammanfattning({
        id: votering.id,
        titel: votering.arende_titel ?? null,
        beteckning: votering.beteckning,
        punkt: votering.punkt,
        rubrik: votering.rubrik,
        gallde: votering.gallde,
        datum: votering.datum,
        organ: votering.organ ?? null,
        ja: votering.ja,
        nej: votering.nej,
        avstar: votering.avstar,
        franvarande: votering.franvarande,
        vinnare: votering.vinnare,
        beslutspunkt: beslutspunkt
          ? {
              rubrik: (beslutspunkt["rubrik"] as string | null) ?? null,
              forslag: (beslutspunkt["forslag"] as string | null) ?? null,
              motforslag_nummer: (beslutspunkt["motforslag_nummer"] as string | null) ?? null,
              motforslag_partier: (beslutspunkt["motforslag_partier"] as string | null) ?? null,
            }
          : null,
        partier: partitotaler.map((p) => ({
          parti: p.parti,
          ja: p.ja,
          nej: p.nej,
          avstar: p.avstar,
          franvarande: p.franvarande,
          majoritetsrost: p.majoritetsrost,
        })),
      });
    } catch (fel) {
      if (fel instanceof GeminiKvotFel) {
        console.warn("[Insikt]", fel.message);
        return { status: "for_mycket_trafik", orsak: "global" };
      }
      throw fel;
    }

    // Cachelagring är bästa-effort: misslyckad sparning ska aldrig
    // blockera själva sammanfattningen (den regenereras vid nästa besök).
    try {
      await db
        .collection("ai_voteringssammanfattningar")
        .doc(data.id)
        .set({ votering_id: data.id, ...genererad });
    } catch (fel) {
      console.error(
        "[Insikt] Kunde inte spara voteringssammanfattning:",
        fel instanceof Error ? fel.message : fel,
      );
    }

    const slutlig = await fsHämta<VoteringsSammanfattning>("ai_voteringssammanfattningar", data.id);

    return {
      status: "klar",
      sammanfattning: slutlig
        ? {
            sammanfattning: slutlig.sammanfattning,
            modell: slutlig.modell,
            tillrackligt_underlag: slutlig.tillrackligt_underlag,
            granskad: slutlig.granskad,
            skapad: slutlig.skapad,
          }
        : { ...genererad, granskad: false, skapad: new Date().toISOString() },
    };
  });

export const getArende = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const db = await fsDb();
    const arende = await fsHämta<ArendeDoc>("arenden", data.id);
    if (!arende) return null;

    const [punkterSnap, voteringarSnap, sammanfattning, relateradeSnap, sakfragorSnap] =
      await Promise.all([
        db.collection("beslutspunkter").where("arende_id", "==", data.id).get(),
        db.collection("voteringar").where("arende_id", "==", data.id).get(),
        fsHämta<Record<string, unknown>>("ai_sammanfattningar", data.id),
        arende.organ
          ? db.collection("arenden").where("organ", "==", arende.organ).get()
          : Promise.resolve(null),
        db.collection("sakfragor").get(),
      ]);

    const sakNamn = new Map(sakfragorSnap.docs.map((d) => [d.id, d.data()["namn"] as string]));
    const kallor = arende.sakfragor_kalla ?? {};

    const relaterade = (relateradeSnap?.docs ?? [])
      .map((d) => ({ id: d.id, ...d.data() }) as ArendeDoc)
      .filter((a) => a.id !== data.id)
      .sort((a, b) => (b.datum ?? "").localeCompare(a.datum ?? ""))
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        titel: a.titel,
        beteckning: a.beteckning,
        rm: a.rm,
        datum: a.datum,
      }));

    return {
      arende: {
        id: arende.id,
        rm: arende.rm,
        beteckning: arende.beteckning,
        organ: arende.organ,
        doktyp: arende.doktyp,
        titel: arende.titel,
        undertitel: arende.undertitel,
        datum: arende.datum,
        publicerad: arende.publicerad,
        kalla_url_html: arende.kalla_url_html,
        kalla_url_text: arende.kalla_url_text,
        uppdaterad: arende.uppdaterad,
      },
      punkter: punkterSnap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .sort((a, b) =>
          String(a["punkt"] ?? "").localeCompare(String(b["punkt"] ?? ""), "sv", { numeric: true }),
        ) as {
        id: string;
        punkt: string;
        rubrik: string | null;
        forslag: string | null;
        beslutstyp: string | null;
        motforslag_nummer: string | null;
        motforslag_partier: string | null;
        vinnare: string | null;
        voteringskrav: string | null;
        votering_id: string | null;
      }[],
      voteringar: voteringarSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Votering)
        .sort((a, b) => (a.punkt ?? "").localeCompare(b.punkt ?? "", "sv", { numeric: true })),
      amnen: (arende.sakfragor ?? []).map((slug) => ({
        sakfraga: slug,
        kalla: kallor[slug] ?? "insikt",
        sakfragor: sakNamn.has(slug) ? { namn: sakNamn.get(slug)! } : null,
      })),
      sammanfattning: sammanfattning
        ? {
            sammanfattning: sammanfattning["sammanfattning"] as string,
            modell: sammanfattning["modell"] as string,
            underlag_url: (sammanfattning["underlag_url"] as string | null) ?? null,
            tillrackligt_underlag: sammanfattning["tillrackligt_underlag"] as boolean,
            granskad: sammanfattning["granskad"] as boolean,
            skapad: sammanfattning["skapad"] as string,
          }
        : null,
      relaterade,
    };
  });

/* ------------------------------------------------------------------ */
/* Sakfrågor                                                          */
/* ------------------------------------------------------------------ */

export const listSakfragor = createServerFn({ method: "GET" }).handler(async () => {
  const db = await fsDb();
  const snap = await db.collection("sakfragor").orderBy("ordning").get();
  return snap.docs.map((d) => {
    const s = d.data();
    return {
      slug: s["slug"] as string,
      namn: s["namn"] as string,
      beskrivning: (s["beskrivning"] as string | null) ?? null,
      utskott: (s["utskott"] as string[]) ?? [],
      nyckelord: (s["nyckelord"] as string[]) ?? [],
    };
  });
});

export const getSakfraga = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const db = await fsDb();
    const sakfraga = await fsHämta<{
      slug: string;
      namn: string;
      beskrivning: string | null;
      utskott: string[];
    }>("sakfragor", data.slug);
    if (!sakfraga) return null;

    const [arendenSnap, voteringarSnap] = await Promise.all([
      db.collection("arenden").where("sakfragor", "array-contains", data.slug).get(),
      db.collection("voteringar").where("sakfragor", "array-contains", data.slug).get(),
    ]);

    const arenden = arendenSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ArendeDoc)
      .sort((a, b) => (b.datum ?? "").localeCompare(a.datum ?? ""))
      .slice(0, 50)
      .map((a) => ({
        id: a.id,
        titel: a.titel,
        beteckning: a.beteckning,
        organ: a.organ,
        rm: a.rm,
        datum: a.datum,
      }));

    const voteringar = voteringarSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as VoteringDoc)
      .sort((a, b) => {
        if (a.datum && b.datum) return b.datum.localeCompare(a.datum);
        if (a.datum) return -1;
        if (b.datum) return 1;
        return 0;
      })
      .slice(0, 20)
      .map((v) => ({
        ...v,
        arenden: v.arende_id ? { id: v.arende_id, titel: v.arende_titel ?? null } : null,
      }));

    return {
      sakfraga: {
        slug: sakfraga.slug,
        namn: sakfraga.namn,
        beskrivning: sakfraga.beskrivning,
        utskott: sakfraga.utskott,
      },
      arenden,
      voteringar: voteringar as (Votering & {
        arenden: { id: string; titel: string | null } | null;
      })[],
      utskott: [...new Set(arenden.map((a) => a.organ).filter((v): v is string => !!v))],
    };
  });

/* ------------------------------------------------------------------ */
/* Sökning                                                            */
/* ------------------------------------------------------------------ */

export const sok = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ q: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const q = data.q.replace(/[%,]/g, " ").trim();
    if (q.length < 2) return { ledamoter: [], partier: [], arenden: [] };
    const db = await fsDb();

    const [ledamoterSnap, partierSnap, arendenSnap] = await Promise.all([
      db.collection("ledamoter").get(),
      db.collection("partier").get(),
      db.collection("arenden").get(),
    ]);

    const ledamoter = ledamoterSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Ledamot & { sorteringsnamn?: string | null })
      .filter((l) => textSok(q, l.fornamn, l.efternamn, l.sorteringsnamn))
      .sort((a, b) => (a.status ?? "").localeCompare(b.status ?? "", "sv"))
      .slice(0, 12);

    const partier = partierSnap.docs
      .map((d) => d.data() as Parti)
      .filter((p) => textSok(q, p.namn) || p.kod.toLowerCase() === q.toLowerCase())
      .sort((a, b) => a.ordning - b.ordning)
      .slice(0, 9);

    const arenden = arendenSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ArendeDoc)
      .filter((a) => textSok(q, a.titel, a.beteckning, a.id))
      .sort((a, b) => {
        if (a.datum && b.datum) return b.datum.localeCompare(a.datum);
        if (a.datum) return -1;
        if (b.datum) return 1;
        return 0;
      })
      .slice(0, 15)
      .map((a) => ({
        id: a.id,
        titel: a.titel,
        beteckning: a.beteckning,
        organ: a.organ,
        rm: a.rm,
        datum: a.datum,
      }));

    return { ledamoter, partier, arenden };
  });

/* ------------------------------------------------------------------ */
/* Jämförelser                                                        */
/* ------------------------------------------------------------------ */

function sorteraPaDatum<
  T extends { datum: string | null; beteckning: string | null; punkt: string | null },
>(rader: T[]) {
  return rader.sort(
    (a, b) =>
      (b.datum ?? "").localeCompare(a.datum ?? "") ||
      (a.beteckning ?? "").localeCompare(b.beteckning ?? "", "sv") ||
      (a.punkt ?? "").localeCompare(b.punkt ?? "", "sv", { numeric: true }),
  );
}

export const jamforLedamoter = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        a: z.string(),
        b: z.string(),
        fran: z.string().default(""),
        till: z.string().default(""),
        sakfraga: z.string().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const [a, b, matrisA, matrisB] = await Promise.all([
      fsHämta<Ledamot>("ledamoter", data.a),
      fsHämta<Ledamot>("ledamoter", data.b),
      fsHämta<{ poster: Record<string, MatrisPost> }>("rostmatriser", data.a),
      fsHämta<{ poster: Record<string, MatrisPost> }>("rostmatriser", data.b),
    ]);

    const posterA = matrisA?.poster ?? {};
    const posterB = matrisB?.poster ?? {};
    const fran = data.fran || null;
    const till = data.till || null;
    const sakfraga = data.sakfraga || null;

    const lista = Object.entries(posterA)
      .filter(([vid, pa]) => {
        if (!posterB[vid]) return false;
        if (!iPeriod(pa.datum, fran, till)) return false;
        if (!harSakfraga(pa.sakfragor, sakfraga)) return false;
        return true;
      })
      .map(([vid, pa]) => {
        const pb = posterB[vid]!;
        const rostA = pa.rost ?? "";
        const rostB = pb.rost ?? "";
        return {
          votering_id: vid,
          titel: pa.titel,
          beteckning: pa.beteckning,
          punkt: pa.punkt,
          datum: pa.datum,
          rost_a: rostA,
          rost_b: rostB,
          jamforbar: GILTIGA_ROSTER.has(rostA) && GILTIGA_ROSTER.has(rostB),
          lika: GILTIGA_ROSTER.has(rostA) && rostA === rostB,
        };
      });

    sorteraPaDatum(lista);

    return {
      a,
      b,
      rader: lista.slice(0, 300),
      totalt: lista.length,
      jamforbara: lista.filter((r) => r.jamforbar).length,
      lika: lista.filter((r) => r.lika).length,
      ejJamforbara: lista.filter((r) => !r.jamforbar).length,
    };
  });

export const jamforPartier = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        a: z.string(),
        b: z.string(),
        fran: z.string().default(""),
        till: z.string().default(""),
        sakfraga: z.string().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const [matrisA, matrisB] = await Promise.all([
      fsHämta<{ poster: Record<string, MatrisPost> }>("partimajoriteter", data.a),
      fsHämta<{ poster: Record<string, MatrisPost> }>("partimajoriteter", data.b),
    ]);

    const posterA = matrisA?.poster ?? {};
    const posterB = matrisB?.poster ?? {};
    const fran = data.fran || null;
    const till = data.till || null;
    const sakfraga = data.sakfraga || null;

    const lista = Object.entries(posterA)
      .filter(([vid, pa]) => {
        if (!(vid in posterB)) return false;
        if (!iPeriod(pa.datum, fran, till)) return false;
        if (!harSakfraga(pa.sakfragor, sakfraga)) return false;
        return true;
      })
      .map(([vid, pa]) => {
        const ma = pa.majoritet;
        const mb = posterB[vid]!.majoritet;
        return {
          votering_id: vid,
          titel: pa.titel,
          beteckning: pa.beteckning,
          punkt: pa.punkt,
          datum: pa.datum,
          majoritet_a: ma,
          majoritet_b: mb,
          jamforbar: ma !== null && mb !== null,
          lika: ma !== null && ma === mb,
        };
      });

    sorteraPaDatum(lista);

    return {
      rader: lista.slice(0, 300),
      totalt: lista.length,
      jamforbara: lista.filter((r) => r.jamforbar).length,
      lika: lista.filter((r) => r.lika).length,
      utanMajoritet: lista.filter((r) => !r.jamforbar).length,
    };
  });

/* ------------------------------------------------------------------ */
/* Bevakningar: hämta rubriker för sparade objekt                     */
/* ------------------------------------------------------------------ */

export const getBevakadeHandelser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        ledamoter: z.array(z.string()).default([]),
        partier: z.array(z.string()).default([]),
        sakfragor: z.array(z.string()).default([]),
        arenden: z.array(z.string()).default([]),
        voteringar: z.array(z.string()).default([]),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const db = await fsDb();

    const hamtaManga = async <T>(samling: string, ids: string[]) => {
      if (ids.length === 0) return [] as (T & { id: string })[];
      const refs = ids.map((id) => db.collection(samling).doc(id));
      const snaps = await db.getAll(...refs);
      return snaps
        .filter((s) => s.exists)
        .map((s) => ({ id: s.id, ...s.data() }) as T & { id: string });
    };

    const [ledamoter, arenden, voteringar] = await Promise.all([
      hamtaManga<Ledamot>("ledamoter", data.ledamoter),
      hamtaManga<ArendeDoc>("arenden", data.arenden),
      hamtaManga<VoteringDoc>("voteringar", data.voteringar),
    ]);

    // Flöde: nya voteringar som rör det användaren följer
    let flode: (Votering & {
      arenden: { id: string; titel: string | null } | null;
      anledning: string;
    })[] = [];

    if (data.sakfragor.length > 0 || data.partier.length > 0 || data.ledamoter.length > 0) {
      const senasteSnap = await db
        .collection("voteringar")
        .orderBy("datum", "desc")
        .limit(60)
        .get();
      flode = senasteSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as VoteringDoc)
        .filter((v) =>
          data.sakfragor.length === 0
            ? true
            : (v.sakfragor ?? []).some((s) => data.sakfragor.includes(s)),
        )
        .slice(0, 25)
        .map((v) => ({
          ...v,
          arenden: v.arende_id ? { id: v.arende_id, titel: v.arende_titel ?? null } : null,
          anledning:
            data.sakfragor.length > 0 && (v.sakfragor ?? []).some((s) => data.sakfragor.includes(s))
              ? "Rör en sakfråga du följer"
              : "Ny votering i riksdagen",
        }));
    }

    return {
      ledamoter,
      arenden: arenden.map((a) => ({
        id: a.id,
        titel: a.titel,
        beteckning: a.beteckning,
        organ: a.organ,
        rm: a.rm,
        datum: a.datum,
      })),
      voteringar: voteringar.map((v) => ({
        ...v,
        arenden: v.arende_id ? { id: v.arende_id, titel: v.arende_titel ?? null } : null,
      })) as (Votering & { arenden: { id: string; titel: string | null } | null })[],
      flode,
    };
  });

/* ------------------------------------------------------------------ */
/* Rapportera fel                                                     */
/* ------------------------------------------------------------------ */

export const rapporteraFel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sida: z.string().max(500).default(""),
        beskrivning: z.string().min(5).max(4000),
        epost: z.string().max(320).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await fsNyRad("felrapporter", {
      sida: data.sida || null,
      beskrivning: data.beskrivning,
      epost: data.epost || null,
      status: "ny",
      skapad: new Date().toISOString(),
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Administration                                                     */
/* ------------------------------------------------------------------ */

/** Kastar om den inloggade användaren inte har administratörsrollen. */
async function kravAdmin(context: { userId: string }) {
  const roll = await fsHämta<{ role: string }>("anvandarroller", context.userId);
  if (roll?.role !== "admin") {
    throw new Error("Behörighet saknas: kräver administratörsroll.");
  }
}

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    await kravAdmin(context as { userId: string });
    const db = await fsDb();
    const [inlasningar, felrapporter, sammanfattningar, arenden] = await Promise.all([
      db.collection("inlasningar").orderBy("startad", "desc").limit(30).get(),
      db.collection("felrapporter").orderBy("skapad", "desc").limit(50).get(),
      db.collection("ai_sammanfattningar").orderBy("skapad", "desc").limit(50).get(),
      db.collection("arenden").get(),
    ]);

    const arendeInfo = new Map(
      arenden.docs.map((d) => {
        const a = d.data();
        return [d.id, { id: d.id, titel: a["titel"], beteckning: a["beteckning"] }] as const;
      }),
    );

    return {
      inlasningar: inlasningar.docs.map((d) => {
        const r = d.data();
        return {
          id: d.id,
          typ: r["typ"] as string,
          status: r["status"] as string,
          antal: r["antal"] as number,
          detalj: (r["detalj"] as string | null) ?? null,
          rm: (r["rm"] as string | null) ?? null,
          startad: r["startad"] as string,
          avslutad: (r["avslutad"] as string | null) ?? null,
        };
      }),
      felrapporter: felrapporter.docs.map((d) => {
        const r = d.data();
        return {
          id: d.id,
          sida: (r["sida"] as string | null) ?? null,
          beskrivning: r["beskrivning"] as string,
          epost: (r["epost"] as string | null) ?? null,
          status: r["status"] as string,
          skapad: r["skapad"] as string,
        };
      }),
      sammanfattningar: sammanfattningar.docs.map((d) => {
        const s = d.data();
        return {
          id: d.id,
          arende_id: s["arende_id"] as string,
          sammanfattning: s["sammanfattning"] as string,
          modell: s["modell"] as string,
          underlag_url: (s["underlag_url"] as string | null) ?? null,
          tillrackligt_underlag: s["tillrackligt_underlag"] as boolean,
          granskad: s["granskad"] as boolean,
          skapad: s["skapad"] as string,
          arenden: arendeInfo.get(s["arende_id"] as string) ?? null,
        };
      }),
    };
  });

export const uppdateraFelrapport = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        status: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await kravAdmin(context as { userId: string });
    await fsUppdatera("felrapporter", data.id, { status: data.status });
    return { ok: true };
  });

export const granskaAiSammanfattning = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        granskad: z.boolean(),
        text: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await kravAdmin(context as { userId: string });
    const updatePayload: { granskad: boolean; sammanfattning?: string } = {
      granskad: data.granskad,
    };
    if (data.text !== undefined) updatePayload.sammanfattning = data.text;
    await fsUppdatera("ai_sammanfattningar", data.id, updatePayload);
    return { ok: true };
  });

export const korInlasning = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        typ: z.enum(["ledamoter", "voteringar"]),
        rm: z.string().default("2025/26"),
        max: z.number().default(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await kravAdmin(context as { userId: string });
    const { ingestLedamoter, ingestRiksmote } = await import("./riksdagen.server");
    if (data.typ === "ledamoter") {
      const res = await ingestLedamoter("tjanstgorande");
      return res;
    }
    const res = await ingestRiksmote(data.rm, data.max);
    return res;
  });

/* ------------------------------------------------------------------ */
/* Motioner: Hämta information och sammanfattning för en motion       */
/* ------------------------------------------------------------------ */

export type MotionInfo = {
  dok_id: string;
  beteckning: string;
  rm: string | null;
  nummer: string | null;
  typrubrik: string | null;
  titel: string | null;
  subtitel: string | null;
  organ: string | null;
  datum: string | null;
  kalla_url: string;
  undertecknare: { namn: string; parti: string | null; roll: string | null }[];
  yrkanden: { nummer: string; lydelse: string; utskottet: string | null }[];
  motivering: string | null;
};

const RM_PREFIX: Record<string, string> = {
  "2026/27": "HE",
  "2025/26": "HD",
  "2024/25": "HC",
  "2023/24": "HB",
  "2022/23": "HA",
  "2021/22": "H9",
  "2020/21": "H8",
  "2019/20": "H7",
  "2018/19": "H6",
  "2017/18": "H5",
  "2016/17": "H4",
  "2015/16": "H3",
};

function beraknaMotionDokId(bet: string): string | null {
  const m = bet.match(/(\d{4}\/\d{2}):(\d+)/);
  if (!m) return null;
  const rm = m[1];
  if (!rm) return null;
  const p = RM_PREFIX[rm];
  if (!p) return null;
  return `${p}02${m[2]}`;
}

const motionCache = new Map<string, MotionInfo>();

export const getMotion = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ beteckning: z.string() }).parse(input))
  .handler(async ({ data }): Promise<MotionInfo | null> => {
    const sokBeteckning = data.beteckning.trim();
    if (motionCache.has(sokBeteckning)) {
      return motionCache.get(sokBeteckning)!;
    }

    try {
      let dokId = beraknaMotionDokId(sokBeteckning);

      if (!dokId) {
        const listUrl = `https://data.riksdagen.se/dokumentlista/?sok=${encodeURIComponent(sokBeteckning)}&doktyp=mot&utformat=json`;
        const listRes = await fetch(listUrl, { headers: { accept: "application/json" } });
        if (listRes.ok) {
          const listData = (await listRes.json()) as Record<string, unknown>;
          const dokList = (listData["dokumentlista"] ?? {}) as Record<string, unknown>;
          const dArray = dokList["dokument"];
          const firstDok = Array.isArray(dArray) ? dArray[0] : dArray;
          if (firstDok && typeof firstDok === "object") {
            dokId =
              ((firstDok as Record<string, unknown>)["dok_id"] as string) ||
              ((firstDok as Record<string, unknown>)["id"] as string);
          }
        }
      }

      if (!dokId) return null;

      const detUrl = `https://data.riksdagen.se/dokument/${dokId}.json`;
      const detRes = await fetch(detUrl, { headers: { accept: "application/json" } });
      if (!detRes.ok) return null;
      const detData = (await detRes.json()) as Record<string, unknown>;
      const dokStatus = (detData["dokumentstatus"] ?? {}) as Record<string, unknown>;
      const d = (dokStatus["dokument"] ?? {}) as Record<string, unknown>;
      const intressenter = (dokStatus["dokintressent"] as Record<string, unknown>)?.["intressent"];
      const forslag = (dokStatus["dokforslag"] as Record<string, unknown>)?.["forslag"];

      let motivering: string | null = null;
      const html = d["html"];
      if (typeof html === "string") {
        const clean = html
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, "\n")
          .replace(/[ \t]+/g, " ")
          .replace(/\n{2,}/g, "\n")
          .trim();
        const motIdx = clean.search(/motivering/i);
        if (motIdx !== -1) {
          motivering = clean
            .slice(motIdx, motIdx + 1500)
            .replace(/^motivering\s*/i, "")
            .trim();
        }
      }

      type RawIntr = { namn?: string; partibet?: string; roll?: string };
      type RawForslag = { nummer?: string; lydelse?: string; utskottet?: string };

      const uLista = Array.isArray(intressenter)
        ? (intressenter as RawIntr[])
        : intressenter
          ? [intressenter as RawIntr]
          : [];
      const fLista = Array.isArray(forslag)
        ? (forslag as RawForslag[])
        : forslag
          ? [forslag as RawForslag]
          : [];

      const resultat: MotionInfo = {
        dok_id: dokId,
        beteckning: sokBeteckning,
        rm: (d["rm"] as string) ?? null,
        nummer: (d["nummer"] as string) ?? null,
        typrubrik: (d["typrubrik"] as string) ?? null,
        titel: (d["titel"] as string) ?? null,
        subtitel: (d["subtitel"] as string) ?? null,
        organ: (d["organ"] as string) ?? null,
        datum: (d["datum"] as string) ?? null,
        kalla_url: `https://data.riksdagen.se/dokument/${dokId}`,
        undertecknare: uLista.map((i) => ({
          namn: i.namn ?? "",
          parti: i.partibet ?? null,
          roll: i.roll ?? null,
        })),
        yrkanden: fLista.map((f) => ({
          nummer: f.nummer ?? "",
          lydelse: f.lydelse ?? "",
          utskottet: f.utskottet ?? null,
        })),
        motivering,
      };

      motionCache.set(sokBeteckning, resultat);
      return resultat;
    } catch {
      return null;
    }
  });

/* ------------------------------------------------------------------ */
/* Avvikelser & partisplittringar (förberäknade aggregat)              */
/* ------------------------------------------------------------------ */

const PER_SIDA = 50;

export const getAvvikelser = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        parti: z.string().default(""),
        sakfraga: z.string().default(""),
        sida: z.coerce.number().default(1),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { fsHämta } = await import("./fs-db.server");
    const agg = await fsHämta<{
      poster: {
        votering_id: string;
        ledamot_id: string;
        parti: string | null;
        rost: string;
        majoritet: string;
        datum: string | null;
        beteckning: string | null;
        titel: string | null;
        sakfragor: string[];
      }[];
      totalt: number;
      uppdaterad: string;
    }>("aggregat", "avvikelser");

    let poster = agg?.poster ?? [];
    if (data.parti) poster = poster.filter((p) => p.parti === data.parti);
    if (data.sakfraga) poster = poster.filter((p) => p.sakfragor.includes(data.sakfraga));
    const totalt = poster.length;
    const sidPoster = poster.slice((data.sida - 1) * PER_SIDA, data.sida * PER_SIDA);

    const db = await fsDb();
    const ledamotDocs = await db.getAll(
      ...sidPoster.map((p) => db.collection("ledamoter").doc(p.ledamot_id)),
    );
    const ledamoter = new Map(
      ledamotDocs
        .filter((d) => d.exists)
        .map((d) => {
          const l = d.data()!;
          return [
            d.id,
            {
              id: d.id,
              fornamn: l["fornamn"] as string,
              efternamn: l["efternamn"] as string,
              valkrets: (l["valkrets"] as string | null) ?? null,
              bild_url_liten: (l["bild_url_liten"] as string | null) ?? null,
            },
          ];
        }),
    );

    return {
      poster: sidPoster.map((p) => ({ ...p, ledamot: ledamoter.get(p.ledamot_id) ?? null })),
      totalt,
      sida: data.sida,
      perSida: PER_SIDA,
      uppdaterad: agg?.uppdaterad ?? null,
    };
  });

export const getSplittringar = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        parti: z.string().default(""),
        sakfraga: z.string().default(""),
        sida: z.coerce.number().default(1),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { fsHämta } = await import("./fs-db.server");
    const agg = await fsHämta<{
      poster: {
        votering_id: string;
        parti: string;
        ja: number;
        nej: number;
        avstar: number;
        avgivna: number;
        splittring: number;
        poang: number;
        majoritetsrost: string | null;
        datum: string | null;
        beteckning: string | null;
        titel: string | null;
        sakfragor: string[];
      }[];
      totalt: number;
      uppdaterad: string;
    }>("aggregat", "splittringar");

    let poster = agg?.poster ?? [];
    if (data.parti) poster = poster.filter((p) => p.parti === data.parti);
    if (data.sakfraga) poster = poster.filter((p) => p.sakfragor.includes(data.sakfraga));
    const totalt = poster.length;

    return {
      poster: poster.slice((data.sida - 1) * PER_SIDA, data.sida * PER_SIDA),
      totalt,
      sida: data.sida,
      perSida: PER_SIDA,
      uppdaterad: agg?.uppdaterad ?? null,
    };
  });

/* ------------------------------------------------------------------ */
/* Vallöften                                                           */
/* ------------------------------------------------------------------ */

type VallofteKoppling = {
  votering_id: string;
  relation: "direkt" | "delvis" | "relaterad";
  /** Vilken röst som ligger i linje med löftets riktning, om den är entydig. */
  riktning: "Ja" | "Nej" | null;
  forklaringar: string[];
};

type VallofteDoc = {
  parti: string;
  lofte: string;
  sakfragor: string[];
  kalla: { titel: string; url: string; utgivare: string; val_ar: number };
  kopplingar: VallofteKoppling[];
  uppdaterad?: string;
};

export const listValloften = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        parti: z.string().default(""),
        sakfraga: z.string().default(""),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const db = await fsDb();
    let fraga: Query<DocumentData> = db.collection("valloften");
    if (data.parti) fraga = fraga.where("parti", "==", data.parti);

    const snap = await fraga.get();
    let loften = snap.docs.map((d) => ({ id: d.id, ...(d.data() as VallofteDoc) }));
    if (data.sakfraga) loften = loften.filter((l) => (l.sakfragor ?? []).includes(data.sakfraga));

    // Hämta voteringar + partiets röstfördelning för alla kopplingar.
    const voteringIds = [...new Set(loften.flatMap((l) => l.kopplingar.map((k) => k.votering_id)))];
    const voteringar = new Map<string, VoteringDoc>();
    if (voteringIds.length) {
      const docs = await db.getAll(...voteringIds.map((id) => db.collection("voteringar").doc(id)));
      for (const d of docs)
        if (d.exists) voteringar.set(d.id, { ...(d.data() as VoteringDoc), id: d.id });
    }

    const totaler = new Map<string, PartitotalDoc>();
    for (let i = 0; i < voteringIds.length; i += 30) {
      const chunk = voteringIds.slice(i, i + 30);
      if (!chunk.length) break;
      const pt = await db.collection("partitotaler").where("votering_id", "in", chunk).get();
      for (const d of pt.docs) {
        const t = d.data() as PartitotalDoc;
        totaler.set(`${t.votering_id}|${t.parti}`, t);
      }
    }

    return loften.map((l) => ({
      ...l,
      kopplingar: l.kopplingar.map((k) => {
        const v = voteringar.get(k.votering_id);
        const t = totaler.get(`${k.votering_id}|${l.parti}`);
        return {
          ...k,
          votering: v
            ? {
                id: v.id,
                beteckning: v.beteckning,
                punkt: v.punkt,
                rubrik: v.rubrik,
                arende_titel: v.arende_titel,
                gallde: v.gallde,
                datum: v.datum,
                vinnare: v.vinnare,
                kalla_url: v.kalla_url,
                ja: v.ja,
                nej: v.nej,
                avstar: v.avstar,
                franvarande: v.franvarande,
              }
            : null,
          partiRost: t
            ? {
                majoritetsrost: t.majoritetsrost,
                ja: t.ja,
                nej: t.nej,
                avstar: t.avstar,
                franvarande: t.franvarande,
              }
            : null,
        };
      }),
    }));
  });
