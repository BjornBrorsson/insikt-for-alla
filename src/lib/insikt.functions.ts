import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publicDb } from "./db.server";

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

const LEDAMOT_KOLUMNER =
  "id, fornamn, efternamn, parti, valkrets, status, fodd_ar, kon, bild_url, bild_url_liten, kalla_url";
const VOTERING_KOLUMNER =
  "id, arende_id, rm, beteckning, punkt, rubrik, gallde, avser, ja, nej, avstar, franvarande, vinnare, datum, kalla_url";

/* ------------------------------------------------------------------ */
/* Datastatus – vad täcker Insikt just nu?                            */
/* ------------------------------------------------------------------ */

export const getDatastatus = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicDb();
  const [ledamoter, arenden, voteringar, roster, senast, aldst, senastUppdaterad] =
    await Promise.all([
      db.from("ledamoter").select("id", { count: "exact", head: true }),
      db.from("arenden").select("id", { count: "exact", head: true }),
      db.from("voteringar").select("id", { count: "exact", head: true }),
      db.from("roster").select("votering_id", { count: "exact", head: true }),
      db.from("voteringar").select("datum").not("datum", "is", null).order("datum", { ascending: false }).limit(1),
      db.from("voteringar").select("datum").not("datum", "is", null).order("datum", { ascending: true }).limit(1),
      db.from("voteringar").select("uppdaterad").order("uppdaterad", { ascending: false }).limit(1),
    ]);

  return {
    ledamoter: ledamoter.count ?? 0,
    arenden: arenden.count ?? 0,
    voteringar: voteringar.count ?? 0,
    roster: roster.count ?? 0,
    senasteVotering: senast.data?.[0]?.datum ?? null,
    aldstaVotering: aldst.data?.[0]?.datum ?? null,
    senastUppdaterad: senastUppdaterad.data?.[0]?.uppdaterad ?? null,
  };
});

/* ------------------------------------------------------------------ */
/* Startsida                                                          */
/* ------------------------------------------------------------------ */

export const getStartsida = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicDb();
  const [voteringar, partier, sakfragor, valkretsar] = await Promise.all([
    db
      .from("voteringar")
      .select(`${VOTERING_KOLUMNER}, arenden(id, titel, organ, rm)`)
      .not("datum", "is", null)
      .order("datum", { ascending: false })
      .limit(8),
    db.from("partier").select("*").order("ordning"),
    db.from("sakfragor").select("slug, namn, beskrivning").order("ordning"),
    db.from("ledamoter").select("valkrets").eq("status", "Tjänstgörande riksdagsledamot"),
  ]);

  const valkretsNamn = [
    ...new Set((valkretsar.data ?? []).map((r) => r.valkrets).filter((v): v is string => !!v)),
  ].sort((a, b) => a.localeCompare(b, "sv"));

  return {
    senasteVoteringar: (voteringar.data ?? []) as unknown as (Votering & {
      arenden: { id: string; titel: string | null; organ: string | null; rm: string | null } | null;
    })[],
    partier: (partier.data ?? []) as Parti[],
    sakfragor: (sakfragor.data ?? []) as { slug: string; namn: string; beskrivning: string | null }[],
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
    const db = publicDb();

    let ledamotIds: string[] | null = null;
    if (data.utskott) {
      const { data: uppdrag } = await db
        .from("uppdrag")
        .select("ledamot_id")
        .eq("organ_kod", data.utskott)
        .limit(5000);
      ledamotIds = [...new Set((uppdrag ?? []).map((u) => u.ledamot_id))];
      if (ledamotIds.length === 0) return { ledamoter: [], totalt: 0 };
    }

    let fraga = db.from("ledamoter").select(LEDAMOT_KOLUMNER, { count: "exact" });
    if (data.parti) fraga = fraga.eq("parti", data.parti);
    if (data.valkrets) fraga = fraga.eq("valkrets", data.valkrets);
    if (data.tjanstgoring === "aktuella") fraga = fraga.eq("status", "Tjänstgörande riksdagsledamot");
    if (data.tjanstgoring === "historiska")
      fraga = fraga.neq("status", "Tjänstgörande riksdagsledamot");
    if (data.q) {
      const q = data.q.replace(/[%,]/g, " ").trim();
      fraga = fraga.or(
        `fornamn.ilike.%${q}%,efternamn.ilike.%${q}%,sorteringsnamn.ilike.%${q}%`,
      );
    }
    if (ledamotIds) fraga = fraga.in("id", ledamotIds);

    fraga =
      data.sortering === "parti"
        ? fraga.order("parti").order("efternamn")
        : fraga.order("efternamn").order("fornamn");

    const { data: rader, count, error } = await fraga.limit(400);
    if (error) throw new Error(error.message);
    return { ledamoter: (rader ?? []) as unknown as Ledamot[], totalt: count ?? 0 };
  });

export const getFilterval = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicDb();
  const [partier, valkretsar, utskott] = await Promise.all([
    db.from("partier").select("*").order("ordning"),
    db.from("ledamoter").select("valkrets").not("valkrets", "is", null).limit(5000),
    db.from("uppdrag").select("organ_kod, typ").eq("typ", "uppdrag").limit(20000),
  ]);
  return {
    partier: (partier.data ?? []) as Parti[],
    valkretsar: [
      ...new Set((valkretsar.data ?? []).map((v) => v.valkrets).filter((v): v is string => !!v)),
    ].sort((a, b) => a.localeCompare(b, "sv")),
    utskott: [
      ...new Set(
        (utskott.data ?? []).map((u) => u.organ_kod).filter((v): v is string => !!v && v.length <= 6),
      ),
    ].sort(),
  };
});

export const getLedamot = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string(), fran: z.string().default(""), till: z.string().default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = publicDb();
    const { data: ledamot } = await db
      .from("ledamoter")
      .select(LEDAMOT_KOLUMNER)
      .eq("id", data.id)
      .maybeSingle();
    if (!ledamot) return null;

    const fran = data.fran || null;
    const till = data.till || null;

    const [uppdrag, roster, sammanfattning] = await Promise.all([
      db
        .from("uppdrag")
        .select("organ_kod, roll, typ, status, fran, till")
        .eq("ledamot_id", data.id)
        .order("fran", { ascending: false }),
      db
        .from("roster")
        .select("rost, parti, voteringar(id, rubrik, beteckning, punkt, datum, gallde, arende_id, arenden(titel))")
        .eq("ledamot_id", data.id)
        .limit(300),
      db.rpc("ledamot_sammanfattning", {
        _ledamot: data.id,
        _fran: fran,
        _till: till,
        _sakfraga: null,
      }),
    ]);

    type RostRad = {
      rost: string;
      parti: string | null;
      voteringar: {
        id: string;
        rubrik: string | null;
        beteckning: string | null;
        punkt: string | null;
        datum: string | null;
        gallde: string | null;
        arende_id: string | null;
        arenden: { titel: string | null } | null;
      } | null;
    };

    const rostRader = ((roster.data ?? []) as unknown as RostRad[])
      .filter((r) => r.voteringar)
      .sort((a, b) => (b.voteringar!.datum ?? "").localeCompare(a.voteringar!.datum ?? ""));

    const s = (sammanfattning.data ?? [])[0] as
      | {
          ja: number;
          nej: number;
          avstar: number;
          franvarande: number;
          jamforbara: number;
          lika_med_partimajoritet: number;
        }
      | undefined;

    return {
      ledamot: ledamot as unknown as Ledamot,
      uppdrag: (uppdrag.data ?? []) as {
        organ_kod: string | null;
        roll: string | null;
        typ: string | null;
        status: string | null;
        fran: string | null;
        till: string | null;
      }[],
      roster: rostRader,
      sammanfattning: s ?? {
        ja: 0,
        nej: 0,
        avstar: 0,
        franvarande: 0,
        jamforbara: 0,
        lika_med_partimajoritet: 0,
      },
    };
  });

/* ------------------------------------------------------------------ */
/* Partier                                                            */
/* ------------------------------------------------------------------ */

export const listPartier = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicDb();
  const [partier, ledamoter] = await Promise.all([
    db.from("partier").select("*").order("ordning"),
    db
      .from("ledamoter")
      .select("parti, status")
      .eq("status", "Tjänstgörande riksdagsledamot")
      .limit(5000),
  ]);
  const mandat = new Map<string, number>();
  for (const l of ledamoter.data ?? []) {
    if (l.parti) mandat.set(l.parti, (mandat.get(l.parti) ?? 0) + 1);
  }
  return (partier.data ?? []).map((p) => ({
    ...(p as Parti),
    tjanstgorande: mandat.get((p as Parti).kod) ?? 0,
  }));
});

export const getParti = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ kod: z.string(), fran: z.string().default(""), till: z.string().default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = publicDb();
    const fran = data.fran || null;
    const till = data.till || null;

    const [parti, ledamoter, sammanhallning, likhet, voteringar] = await Promise.all([
      db.from("partier").select("*").eq("kod", data.kod).maybeSingle(),
      db
        .from("ledamoter")
        .select(LEDAMOT_KOLUMNER)
        .eq("parti", data.kod)
        .eq("status", "Tjänstgörande riksdagsledamot")
        .order("efternamn")
        .limit(500),
      db.rpc("parti_sammanhallning", { _parti: data.kod, _fran: fran, _till: till }),
      db.rpc("parti_likhet", { _parti: data.kod, _fran: fran, _till: till }),
      db
        .from("partitotaler")
        .select("ja, nej, avstar, franvarande, voteringar(id, rubrik, beteckning, punkt, datum, gallde, arenden(titel))")
        .eq("parti", data.kod)
        .limit(200),
    ]);

    if (!parti.data) return null;

    type PartiVotering = {
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
      } | null;
    };

    const voteringRader = ((voteringar.data ?? []) as unknown as PartiVotering[])
      .filter((v) => v.voteringar)
      .sort((a, b) => (b.voteringar!.datum ?? "").localeCompare(a.voteringar!.datum ?? ""));

    return {
      parti: parti.data as Parti,
      ledamoter: (ledamoter.data ?? []) as unknown as Ledamot[],
      sammanhallning: ((sammanhallning.data ?? []) as {
        voteringar: number;
        avgivna_roster: number;
        enligt_majoritet: number;
      }[])[0] ?? { voteringar: 0, avgivna_roster: 0, enligt_majoritet: 0 },
      likhet: (likhet.data ?? []) as { parti: string; gemensamma: number; lika: number }[],
      voteringar: voteringRader,
    };
  });

/* ------------------------------------------------------------------ */
/* Valkretsar                                                         */
/* ------------------------------------------------------------------ */

export const listValkretsar = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicDb();
  const { data } = await db
    .from("ledamoter")
    .select("valkrets, parti")
    .eq("status", "Tjänstgörande riksdagsledamot")
    .limit(5000);
  const karta = new Map<string, number>();
  for (const r of data ?? []) {
    if (r.valkrets) karta.set(r.valkrets, (karta.get(r.valkrets) ?? 0) + 1);
  }
  return [...karta.entries()]
    .map(([valkrets, ledamoter]) => ({ valkrets, ledamoter }))
    .sort((a, b) => a.valkrets.localeCompare(b.valkrets, "sv"));
});

export const getValkrets = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ namn: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const db = publicDb();
    const { data: ledamoter } = await db
      .from("ledamoter")
      .select(LEDAMOT_KOLUMNER)
      .eq("valkrets", data.namn)
      .eq("status", "Tjänstgörande riksdagsledamot")
      .order("efternamn")
      .limit(200);
    const rader = (ledamoter ?? []) as unknown as Ledamot[];
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
    const db = publicDb();
    const perSida = 25;

    let arendeIds: string[] | null = null;
    if (data.sakfraga) {
      const { data: kopplingar } = await db
        .from("arende_sakfragor")
        .select("arende_id")
        .eq("sakfraga", data.sakfraga)
        .limit(5000);
      arendeIds = (kopplingar ?? []).map((k) => k.arende_id);
      if (arendeIds.length === 0) return { voteringar: [], totalt: 0, perSida };
    }
    if (data.organ) {
      const { data: arenden } = await db
        .from("arenden")
        .select("id")
        .eq("organ", data.organ)
        .limit(5000);
      const ids = (arenden ?? []).map((a) => a.id);
      arendeIds = arendeIds ? arendeIds.filter((id) => ids.includes(id)) : ids;
      if (arendeIds.length === 0) return { voteringar: [], totalt: 0, perSida };
    }

    let fraga = db
      .from("voteringar")
      .select(`${VOTERING_KOLUMNER}, arenden(id, titel, organ, rm)`, { count: "exact" });
    if (data.rm) fraga = fraga.eq("rm", data.rm);
    if (data.fran) fraga = fraga.gte("datum", data.fran);
    if (data.till) fraga = fraga.lte("datum", data.till);
    if (arendeIds) fraga = fraga.in("arende_id", arendeIds);
    if (data.q) {
      const q = data.q.replace(/[%,]/g, " ").trim();
      fraga = fraga.or(`rubrik.ilike.%${q}%,beteckning.ilike.%${q}%,gallde.ilike.%${q}%`);
    }

    const fran = (data.sida - 1) * perSida;
    const { data: rader, count, error } = await fraga
      .order("datum", { ascending: false, nullsFirst: false })
      .range(fran, fran + perSida - 1);
    if (error) throw new Error(error.message);

    return {
      voteringar: (rader ?? []) as unknown as (Votering & {
        arenden: { id: string; titel: string | null; organ: string | null; rm: string | null } | null;
      })[],
      totalt: count ?? 0,
      perSida,
    };
  });

export const getVoteringsfilter = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicDb();
  const [rm, organ, sakfragor] = await Promise.all([
    db.from("voteringar").select("rm").limit(5000),
    db.from("arenden").select("organ").limit(5000),
    db.from("sakfragor").select("slug, namn").order("ordning"),
  ]);
  return {
    riksmoten: [...new Set((rm.data ?? []).map((r) => r.rm).filter((v): v is string => !!v))].sort().reverse(),
    utskott: [...new Set((organ.data ?? []).map((r) => r.organ).filter((v): v is string => !!v))].sort(),
    sakfragor: (sakfragor.data ?? []) as { slug: string; namn: string }[],
  };
});

export const getVotering = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const db = publicDb();
    const { data: votering } = await db
      .from("voteringar")
      .select(
        `${VOTERING_KOLUMNER}, arenden(id, titel, organ, rm, datum, kalla_url_html), beslutspunkter(id, punkt, rubrik, forslag, beslutstyp, motforslag_nummer, motforslag_partier, vinnare, voteringskrav)`,
      )
      .eq("id", data.id)
      .maybeSingle();
    if (!votering) return null;

    const [partitotaler, majoritet, roster] = await Promise.all([
      db.from("partitotaler").select("*").eq("votering_id", data.id),
      db.from("v_partimajoritet").select("parti, majoritetsrost").eq("votering_id", data.id),
      db
        .from("roster")
        .select("ledamot_id, parti, valkrets, rost, ledamoter:ledamot_id(fornamn, efternamn)")
        .eq("votering_id", data.id)
        .limit(400),
    ]);

    return {
      votering: votering as unknown as Votering & {
        arenden: {
          id: string;
          titel: string | null;
          organ: string | null;
          rm: string | null;
          datum: string | null;
          kalla_url_html: string | null;
        } | null;
        beslutspunkter: {
          id: string;
          punkt: string;
          rubrik: string | null;
          forslag: string | null;
          beslutstyp: string | null;
          motforslag_nummer: string | null;
          motforslag_partier: string | null;
          vinnare: string | null;
          voteringskrav: string | null;
        } | null;
      },
      partitotaler: (partitotaler.data ?? []) as {
        parti: string;
        ja: number;
        nej: number;
        avstar: number;
        franvarande: number;
      }[],
      majoritet: (majoritet.data ?? []) as { parti: string; majoritetsrost: string | null }[],
      roster: (roster.data ?? []) as unknown as {
        ledamot_id: string;
        parti: string | null;
        valkrets: string | null;
        rost: string;
        ledamoter: { fornamn: string; efternamn: string } | null;
      }[],
    };
  });

export const getArende = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const db = publicDb();
    const { data: arende } = await db.from("arenden").select("*").eq("id", data.id).maybeSingle();
    if (!arende) return null;

    const [punkter, voteringar, amnen, sammanfattning, relaterade] = await Promise.all([
      db.from("beslutspunkter").select("*").eq("arende_id", data.id).order("punkt"),
      db.from("voteringar").select(VOTERING_KOLUMNER).eq("arende_id", data.id).order("punkt"),
      db.from("arende_sakfragor").select("sakfraga, kalla, sakfragor(namn)").eq("arende_id", data.id),
      db.from("ai_sammanfattningar").select("*").eq("arende_id", data.id).maybeSingle(),
      db
        .from("arenden")
        .select("id, titel, beteckning, rm, datum")
        .eq("organ", (arende as { organ: string | null }).organ ?? "")
        .neq("id", data.id)
        .order("datum", { ascending: false })
        .limit(6),
    ]);

    return {
      arende: arende as {
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
      },
      punkter: (punkter.data ?? []) as {
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
      voteringar: (voteringar.data ?? []) as unknown as Votering[],
      amnen: (amnen.data ?? []) as unknown as {
        sakfraga: string;
        kalla: string;
        sakfragor: { namn: string } | null;
      }[],
      sammanfattning: sammanfattning.data as
        | {
            sammanfattning: string;
            modell: string;
            underlag_url: string | null;
            tillrackligt_underlag: boolean;
            granskad: boolean;
            skapad: string;
          }
        | null,
      relaterade: (relaterade.data ?? []) as {
        id: string;
        titel: string | null;
        beteckning: string | null;
        rm: string | null;
        datum: string | null;
      }[],
    };
  });

/* ------------------------------------------------------------------ */
/* Sakfrågor                                                          */
/* ------------------------------------------------------------------ */

export const listSakfragor = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicDb();
  const { data } = await db.from("sakfragor").select("*").order("ordning");
  return (data ?? []) as {
    slug: string;
    namn: string;
    beskrivning: string | null;
    utskott: string[];
    nyckelord: string[];
  }[];
});

export const getSakfraga = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const db = publicDb();
    const { data: sakfraga } = await db
      .from("sakfragor")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!sakfraga) return null;

    const { data: kopplingar } = await db
      .from("arende_sakfragor")
      .select("arende_id")
      .eq("sakfraga", data.slug)
      .limit(2000);
    const ids = (kopplingar ?? []).map((k) => k.arende_id);

    if (ids.length === 0)
      return { sakfraga: sakfraga as { slug: string; namn: string; beskrivning: string | null; utskott: string[] }, arenden: [], voteringar: [], utskott: [] };

    const [arenden, voteringar] = await Promise.all([
      db
        .from("arenden")
        .select("id, titel, beteckning, organ, rm, datum")
        .in("id", ids)
        .order("datum", { ascending: false })
        .limit(50),
      db
        .from("voteringar")
        .select(`${VOTERING_KOLUMNER}, arenden(id, titel)`)
        .in("arende_id", ids)
        .order("datum", { ascending: false, nullsFirst: false })
        .limit(20),
    ]);

    return {
      sakfraga: sakfraga as {
        slug: string;
        namn: string;
        beskrivning: string | null;
        utskott: string[];
      },
      arenden: (arenden.data ?? []) as {
        id: string;
        titel: string | null;
        beteckning: string | null;
        organ: string | null;
        rm: string | null;
        datum: string | null;
      }[],
      voteringar: (voteringar.data ?? []) as unknown as (Votering & {
        arenden: { id: string; titel: string | null } | null;
      })[],
      utskott: [
        ...new Set(
          (arenden.data ?? []).map((a) => a.organ).filter((v): v is string => !!v),
        ),
      ],
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
    const db = publicDb();

    const [ledamoter, partier, arenden] = await Promise.all([
      db
        .from("ledamoter")
        .select(LEDAMOT_KOLUMNER)
        .or(`fornamn.ilike.%${q}%,efternamn.ilike.%${q}%,sorteringsnamn.ilike.%${q}%`)
        .order("status")
        .limit(12),
      db.from("partier").select("*").or(`namn.ilike.%${q}%,kod.ilike.${q}`).order("ordning").limit(9),
      db
        .from("arenden")
        .select("id, titel, beteckning, organ, rm, datum")
        .or(`titel.ilike.%${q}%,beteckning.ilike.%${q}%,id.ilike.%${q}%`)
        .order("datum", { ascending: false, nullsFirst: false })
        .limit(15),
    ]);

    return {
      ledamoter: (ledamoter.data ?? []) as unknown as Ledamot[],
      partier: (partier.data ?? []) as Parti[],
      arenden: (arenden.data ?? []) as {
        id: string;
        titel: string | null;
        beteckning: string | null;
        organ: string | null;
        rm: string | null;
        datum: string | null;
      }[],
    };
  });

/* ------------------------------------------------------------------ */
/* Jämförelser                                                        */
/* ------------------------------------------------------------------ */

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
    const db = publicDb();
    const [a, b, rader] = await Promise.all([
      db.from("ledamoter").select(LEDAMOT_KOLUMNER).eq("id", data.a).maybeSingle(),
      db.from("ledamoter").select(LEDAMOT_KOLUMNER).eq("id", data.b).maybeSingle(),
      db.rpc("jamfor_ledamoter", {
        _a: data.a,
        _b: data.b,
        _fran: data.fran || null,
        _till: data.till || null,
        _sakfraga: data.sakfraga || null,
      }),
    ]);
    if (rader.error) throw new Error(rader.error.message);
    const lista = (rader.data ?? []) as {
      votering_id: string;
      titel: string | null;
      beteckning: string | null;
      punkt: string | null;
      datum: string | null;
      rost_a: string;
      rost_b: string;
      jamforbar: boolean;
      lika: boolean;
    }[];
    return {
      a: a.data as unknown as Ledamot | null,
      b: b.data as unknown as Ledamot | null,
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
    const db = publicDb();
    const { data: rader, error } = await db.rpc("jamfor_partier", {
      _a: data.a,
      _b: data.b,
      _fran: data.fran || null,
      _till: data.till || null,
      _sakfraga: data.sakfraga || null,
    });
    if (error) throw new Error(error.message);
    const lista = (rader ?? []) as {
      votering_id: string;
      titel: string | null;
      beteckning: string | null;
      punkt: string | null;
      datum: string | null;
      majoritet_a: string | null;
      majoritet_b: string | null;
      jamforbar: boolean;
      lika: boolean;
    }[];
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
    const db = publicDb();

    const [ledamoter, arenden, voteringar] = await Promise.all([
      data.ledamoter.length
        ? db.from("ledamoter").select(LEDAMOT_KOLUMNER).in("id", data.ledamoter)
        : Promise.resolve({ data: [] }),
      data.arenden.length
        ? db.from("arenden").select("id, titel, beteckning, organ, rm, datum").in("id", data.arenden)
        : Promise.resolve({ data: [] }),
      data.voteringar.length
        ? db
            .from("voteringar")
            .select(`${VOTERING_KOLUMNER}, arenden(id, titel)`)
            .in("id", data.voteringar)
        : Promise.resolve({ data: [] }),
    ]);

    // Flöde: nya voteringar som rör det användaren följer
    let flode: (Votering & { arenden: { id: string; titel: string | null } | null; anledning: string })[] =
      [];

    if (data.sakfragor.length > 0 || data.partier.length > 0 || data.ledamoter.length > 0) {
      const arendeIds = new Set<string>();
      if (data.sakfragor.length > 0) {
        const { data: kopplingar } = await db
          .from("arende_sakfragor")
          .select("arende_id, sakfraga")
          .in("sakfraga", data.sakfragor)
          .limit(3000);
        for (const k of kopplingar ?? []) arendeIds.add(k.arende_id);
      }
      const { data: senaste } = await db
        .from("voteringar")
        .select(`${VOTERING_KOLUMNER}, arenden(id, titel)`)
        .order("datum", { ascending: false, nullsFirst: false })
        .limit(60);
      flode = ((senaste ?? []) as unknown as (Votering & {
        arenden: { id: string; titel: string | null } | null;
      })[])
        .filter((v) => (arendeIds.size === 0 ? true : v.arende_id && arendeIds.has(v.arende_id)))
        .slice(0, 25)
        .map((v) => ({
          ...v,
          anledning:
            v.arende_id && arendeIds.has(v.arende_id)
              ? "Rör en sakfråga du följer"
              : "Ny votering i riksdagen",
        }));
    }

    return {
      ledamoter: (ledamoter.data ?? []) as unknown as Ledamot[],
      arenden: (arenden.data ?? []) as {
        id: string;
        titel: string | null;
        beteckning: string | null;
        organ: string | null;
        rm: string | null;
        datum: string | null;
      }[],
      voteringar: (voteringar.data ?? []) as unknown as (Votering & {
        arenden: { id: string; titel: string | null } | null;
      })[],
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
    const db = publicDb();
    const { error } = await db.from("felrapporter").insert({
      sida: data.sida || null,
      beskrivning: data.beskrivning,
      epost: data.epost || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Administration                                                     */
/* ------------------------------------------------------------------ */

export const getAdminData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [inlasningar, felrapporter, sammanfattningar] = await Promise.all([
    supabaseAdmin.from("inlasningar").select("*").order("startad", { ascending: false }).limit(30),
    supabaseAdmin.from("felrapporter").select("*").order("skapad", { ascending: false }).limit(50),
    supabaseAdmin
      .from("ai_sammanfattningar")
      .select("*, arenden(id, titel, beteckning)")
      .order("skapad", { ascending: false })
      .limit(50),
  ]);

  return {
    inlasningar: inlasningar.data ?? [],
    felrapporter: felrapporter.data ?? [],
    sammanfattningar: sammanfattningar.data ?? [],
  };
});

export const uppdateraFelrapport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        status: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("felrapporter")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const granskaAiSammanfattning = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        granskad: z.boolean(),
        text: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updatePayload: { granskad: boolean; sammanfattning?: string } = {
      granskad: data.granskad,
    };
    if (data.text !== undefined) updatePayload.sammanfattning = data.text;
    const { error } = await supabaseAdmin
      .from("ai_sammanfattningar")
      .update(updatePayload)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const korInlasning = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        typ: z.enum(["ledamoter", "voteringar"]),
        rm: z.string().default("2025/26"),
        max: z.number().default(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
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
  const p = RM_PREFIX[m[1]];
  if (!p) return null;
  return `${p}02${m[2]}`;
}

const motionCache = new Map<string, MotionInfo>();

export const getMotion = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ beteckning: z.string() }).parse(input),
  )
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
            dokId = (firstDok as Record<string, unknown>)["dok_id"] as string || (firstDok as Record<string, unknown>)["id"] as string;
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
          motivering = clean.slice(motIdx, motIdx + 1500).replace(/^motivering\s*/i, "").trim();
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


