/**
 * Inläsning av Riksdagens öppna data (data.riksdagen.se) till Firestore.
 * Alla uppgifter lagras med stabila identifierare och länk till originalet.
 * Ingen uppgift hittas på: saknas den i källan lagras null.
 *
 * Denormalisering vid skrivning:
 * - arenden.sakfragor / sakfragor_kalla (från matchning mot sakfragor)
 * - voteringar.organ / arende_titel / sakfragor
 * - partitotaler.majoritetsrost / enligt + voteringsmeta
 * - roster.partimajoritet + voteringsmeta
 * - rostmatriser/{ledamot_id} och partimajoriteter/{parti} för aggregeringar
 */

import { fsDb, fsNyRad, fsRaderaDar, fsSkrivManga, majoritetsrost } from "./fs-db.server";

const BASE = "https://data.riksdagen.se";

export const AKTUELLT_RM = "2025/26";
export const RIKSMOTEN = ["2025/26", "2024/25", "2023/24", "2022/23", "2021/22"];

type Json = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toInt(value: unknown): number | null {
  const s = str(value);
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function toDate(value: unknown): string | null {
  const s = str(value);
  if (!s) return null;
  return s.slice(0, 10);
}

async function getJson(url: string): Promise<Json> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Riksdagens API svarade ${res.status} för ${url}`);
  const text = await res.text();
  if (!text.trim()) throw new Error(`Tomt svar från ${url}`);
  return JSON.parse(text) as Json;
}

export type IngestResult = { typ: string; antal: number; detalj: string };

async function logRun(
  typ: string,
  status: "lyckad" | "misslyckad",
  antal: number,
  detalj: string,
  rm: string | null,
  startad: string,
) {
  await fsNyRad("inlasningar", {
    typ,
    status,
    antal,
    detalj,
    rm,
    startad,
    avslutad: new Date().toISOString(),
  });
}

/* ------------------------------------------------------------------ */
/* Ledamöter                                                          */
/* ------------------------------------------------------------------ */

export async function ingestLedamoter(scope: "tjanstgorande" | "samtliga"): Promise<IngestResult> {
  const startad = new Date().toISOString();
  try {
    const partier =
      scope === "samtliga"
        ? ["S", "SD", "M", "C", "V", "KD", "MP", "L", "-"]
        : [null as string | null];
    let antal = 0;

    for (const parti of partier) {
      const url =
        `${BASE}/personlista/?utformat=json&rdlstatus=` +
        (scope === "samtliga" ? "samtliga" : "tjanstgorande") +
        (parti ? `&parti=${encodeURIComponent(parti)}` : "");
      const data = await getJson(url);
      const lista = (data["personlista"] ?? {}) as Json;
      const personer = asArray(lista["person"] as Json | Json[]);

      // Uppdrag per ledamot först – behövs för ledamotens utskottslista.
      const uppdragRader: {
        ledamot_id: string;
        organ_kod: string | null;
        organ_namn: string | null;
        roll: string | null;
        typ: string | null;
        status: string | null;
        fran: string | null;
        till: string | null;
      }[] = [];
      const utskottPerLedamot = new Map<string, Set<string>>();
      const ledamotIds: string[] = [];
      for (const p of personer) {
        const id = str(p["intressent_id"]);
        if (!id) continue;
        ledamotIds.push(id);
        const uppdragBlock = (p["personuppdrag"] ?? {}) as Json;
        for (const u of asArray(uppdragBlock["uppdrag"] as Json | Json[])) {
          const organ = str(u["organ_kod"]);
          const roll = str(u["roll_kod"]);
          if (!organ && !roll) continue;
          uppdragRader.push({
            ledamot_id: id,
            organ_kod: organ,
            organ_namn: str(u["uppgift"] as unknown) ?? null,
            roll,
            typ: str(u["typ"]),
            status: str(u["status"]),
            fran: toDate(u["from"]),
            till: toDate(u["tom"]),
          });
          if (organ && str(u["typ"]) === "uppdrag") {
            const set = utskottPerLedamot.get(id) ?? new Set<string>();
            set.add(organ);
            utskottPerLedamot.set(id, set);
          }
        }
      }

      const rader = personer
        .map((p) => {
          const id = str(p["intressent_id"]);
          if (!id) return null;
          return {
            id,
            data: {
              id,
              sourceid: str(p["sourceid"]),
              fornamn: str(p["tilltalsnamn"]) ?? str(p["fornamn"]) ?? "",
              efternamn: str(p["efternamn"]) ?? "",
              sorteringsnamn: str(p["sorteringsnamn"]),
              parti: str(p["parti"]),
              valkrets: str(p["valkrets"]),
              kon: str(p["kon"]),
              fodd_ar: toInt(p["fodd_ar"]),
              status: str(p["status"]),
              bild_url: str(p["bild_url_192"]) ?? str(p["bild_url_max"]),
              bild_url_liten: str(p["bild_url_80"]),
              kalla_url: str(p["sourceid"])
                ? `https://www.riksdagen.se/sv/ledamoter-partier/ledamot/_${str(p["sourceid"])}`
                : str(p["person_url_xml"]),
              utskott: [...(utskottPerLedamot.get(id) ?? [])].sort(),
              uppdaterad: new Date().toISOString(),
            },
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null && r.data.efternamn !== "");

      antal += await fsSkrivManga("ledamoter", rader);

      // Uppdrag: radera ledamotens gamla och skriv de nya.
      for (let i = 0; i < ledamotIds.length; i += 30) {
        await fsRaderaDar("uppdrag", "ledamot_id", ledamotIds.slice(i, i + 30));
      }
      for (const u of uppdragRader) {
        await fsNyRad("uppdrag", u);
      }
    }

    await logRun("ledamoter", "lyckad", antal, `Scope: ${scope}`, null, startad);
    return { typ: "ledamoter", antal, detalj: `${antal} ledamöter inlästa (${scope}).` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRun("ledamoter", "misslyckad", 0, msg, null, startad);
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Sakfrågor: Insikts egen kategorisering                             */
/* ------------------------------------------------------------------ */

type Sakfraga = { slug: string; nyckelord: string[]; utskott: string[] };

async function hamtaSakfragor(): Promise<Sakfraga[]> {
  const db = await fsDb();
  const snap = await db.collection("sakfragor").get();
  return snap.docs.map((d) => {
    const s = d.data();
    return {
      slug: d.id,
      nyckelord: (s["nyckelord"] as string[]) ?? [],
      utskott: (s["utskott"] as string[]) ?? [],
    };
  });
}

function matchaSakfragor(sakfragor: Sakfraga[], titel: string, organ: string | null): string[] {
  const t = titel.toLowerCase();
  const träffar = new Set<string>();
  for (const s of sakfragor) {
    if (s.nyckelord.some((k) => t.includes(k.toLowerCase()))) träffar.add(s.slug);
    if (organ && s.utskott.some((u) => u.toLowerCase() === organ.toLowerCase()))
      träffar.add(s.slug);
  }
  return [...träffar];
}

/* ------------------------------------------------------------------ */
/* Ärenden, beslutspunkter och voteringar                             */
/* ------------------------------------------------------------------ */

type PartiTotal = { parti: string; ja: number; nej: number; avstar: number; franvarande: number };

function lasPartitotaler(html: unknown): {
  gallde: string | null;
  rader: PartiTotal[];
  totalt: PartiTotal | null;
} {
  const block = (html ?? {}) as Json;
  const table = (block["table"] ?? {}) as Json;
  const caption = (table["caption"] ?? {}) as Json;
  const gallde = str(caption["#text"]) ?? str(caption["b"]);
  const tbody = (table["tbody"] ?? {}) as Json;
  const rader: PartiTotal[] = [];
  for (const tr of asArray(tbody["tr"] as Json | Json[])) {
    const parti = str(tr["th"]);
    const td = asArray(tr["td"] as string | string[]).map((v) => toInt(v) ?? 0);
    if (!parti || td.length < 4) continue;
    rader.push({ parti, ja: td[0]!, nej: td[1]!, avstar: td[2]!, franvarande: td[3]! });
  }
  const tfoot = ((table["tfooter"] ?? table["tfoot"] ?? {}) as Json)["tr"] as Json | undefined;
  let totalt: PartiTotal | null = null;
  if (tfoot) {
    const td = asArray(tfoot["td"] as string | string[]).map((v) => toInt(v) ?? 0);
    if (td.length >= 4)
      totalt = { parti: "Totalt", ja: td[0]!, nej: td[1]!, avstar: td[2]!, franvarande: td[3]! };
  }
  return { gallde, rader, totalt };
}

/** Läser in ett enskilt betänkande med beslutspunkter, voteringar och röster. */
export async function ingestArende(dokId: string): Promise<{ voteringar: number; roster: number }> {
  const db = await fsDb();
  const data = await getJson(`${BASE}/utskottsforslag/${dokId}.json`);
  const block = (data["utskottsforslag"] ?? {}) as Json;
  const dok = (block["dokument"] ?? {}) as Json;
  const rm = str(dok["rm"]);
  const bet = str(dok["beteckning"]);
  const titel = str(dok["titel"]) ?? dokId;
  const organ = str(dok["organ"]);

  const sakfragor = await hamtaSakfragor();
  const amnen = matchaSakfragor(sakfragor, titel, organ);

  await db
    .collection("arenden")
    .doc(dokId)
    .set(
      {
        id: dokId,
        rm,
        beteckning: bet,
        organ,
        doktyp: str(dok["doktyp"]),
        titel,
        undertitel: str(dok["subtitel"]),
        datum: toDate(dok["datum"]),
        publicerad: str(dok["publicerad"]),
        kalla_url_html: `https://data.riksdagen.se/dokument/${dokId}`,
        kalla_url_text: `https://data.riksdagen.se/dokument/${dokId}/text`,
        sakfragor: amnen,
        sakfragor_kalla: Object.fromEntries(amnen.map((s) => [s, "insikt"])),
        uppdaterad: new Date().toISOString(),
      },
      { merge: true },
    );

  // Beslutspunkter
  const forslag = asArray(
    ((block["dokutskottsforslag"] ?? {}) as Json)["utskottsforslag"] as Json | Json[],
  );
  const punktRader = forslag
    .map((f) => {
      const punkt = str(f["punkt"]);
      if (!punkt) return null;
      return {
        id: `${dokId}-${punkt}`,
        data: {
          id: `${dokId}-${punkt}`,
          arende_id: dokId,
          punkt,
          rubrik: str(f["rubrik"]),
          forslag: str(f["forslag"]),
          beslutstyp: str(f["beslutstyp"]),
          motforslag_nummer: str(f["motforslag_nummer"]),
          motforslag_partier: str(f["motforslag_partier"])?.replace(/"/g, "") ?? null,
          vinnare: str(f["vinnare"]),
          voteringskrav: str(f["voteringskrav"]),
          votering_id: str(f["votering_id"])?.toLowerCase() ?? null,
        },
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (punktRader.length > 0) await fsSkrivManga("beslutspunkter", punktRader);

  // Individuella röster för hela betänkandet (behövs för majoritet/enligt innan
  // partitotaler och roster skrivs med denormaliserade fält).
  let rostRader: {
    votering_id: string;
    ledamot_id: string;
    parti: string | null;
    valkrets: string | null;
    rost: string;
    avser: string | null;
  }[] = [];
  const datumPerVotering = new Map<string, string>();
  const avserPerVotering = new Map<string, string | null>();
  if (rm && bet) {
    const vdata = await getJson(
      `${BASE}/voteringlista/?rm=${encodeURIComponent(rm)}&bet=${encodeURIComponent(bet)}&utformat=json&sz=100000`,
    );
    const vlista = (vdata["voteringlista"] ?? {}) as Json;
    const rows = asArray(vlista["votering"] as Json | Json[]);
    const unika = new Map<string, (typeof rostRader)[number]>();
    for (const r of rows) {
      const vid = str(r["votering_id"])?.toLowerCase();
      const ledamot = str(r["intressent_id"]);
      const rost = str(r["rost"]);
      if (!vid || !ledamot || !rost) continue;
      const d = toDate(r["systemdatum"]);
      if (d) {
        const nuvarande = datumPerVotering.get(vid);
        if (!nuvarande || d < nuvarande) datumPerVotering.set(vid, d);
      }
      if (!avserPerVotering.has(vid)) avserPerVotering.set(vid, str(r["avser"]));
      const nyckel = `${vid}|${ledamot}`;
      if (!unika.has(nyckel)) {
        unika.set(nyckel, {
          votering_id: vid,
          ledamot_id: ledamot,
          parti: str(r["parti"]),
          valkrets: str(r["valkrets"]),
          rost,
          avser: str(r["avser"]),
        });
      }
    }
    rostRader = [...unika.values()];
  }

  // Voteringar med partitotaler
  let voteringar = 0;
  const berorddaLedamoter = new Map<string, Record<string, unknown>>();
  const berorddaPartier = new Map<string, Record<string, unknown>>();

  for (const f of forslag) {
    const voteringId = str(f["votering_id"])?.toLowerCase();
    const punkt = str(f["punkt"]);
    if (!voteringId || !punkt) continue;
    const { gallde, rader, totalt } = lasPartitotaler(f["votering_sammanfattning_html"]);
    const rubrik = str(f["rubrik"]);
    const vDatum = datumPerVotering.get(voteringId) ?? null;
    const vTitel = titel || rubrik;

    await db
      .collection("voteringar")
      .doc(voteringId)
      .set(
        {
          id: voteringId,
          arende_id: dokId,
          beslutspunkt_id: `${dokId}-${punkt}`,
          rm,
          beteckning: bet,
          punkt,
          typ: str(f["punkttyp"]),
          rubrik,
          gallde,
          ja: totalt?.ja ?? 0,
          nej: totalt?.nej ?? 0,
          avstar: totalt?.avstar ?? 0,
          franvarande: totalt?.franvarande ?? 0,
          vinnare: str(f["vinnare"]),
          datum: vDatum,
          avser: avserPerVotering.get(voteringId) ?? null,
          organ,
          arende_titel: titel,
          sakfragor: amnen,
          kalla_url: `https://data.riksdagen.se/votering/${voteringId.toUpperCase()}`,
          uppdaterad: new Date().toISOString(),
        },
        { merge: true },
      );
    voteringar += 1;

    // Röster för just den här voteringen – räkna "enligt majoritet" per parti.
    const rosterIVotering = rostRader.filter((r) => r.votering_id === voteringId);

    if (rader.length > 0) {
      const totalPoster = rader.map((r) => {
        const majoritet = majoritetsrost(r);
        const enligt = majoritet
          ? rosterIVotering.filter((x) => x.parti === r.parti && x.rost === majoritet).length
          : 0;
        const post = {
          id: `${voteringId}|${r.parti}`,
          data: {
            votering_id: voteringId,
            parti: r.parti,
            ja: r.ja,
            nej: r.nej,
            avstar: r.avstar,
            franvarande: r.franvarande,
            majoritetsrost: majoritet,
            enligt,
            datum: vDatum,
            rm,
            arende_id: dokId,
            organ,
            titel: vTitel,
            rubrik,
            beteckning: bet,
            punkt,
            sakfragor: amnen,
          },
        };
        const befintlig = berorddaPartier.get(r.parti) ?? {};
        berorddaPartier.set(r.parti, {
          ...befintlig,
          [voteringId]: {
            majoritet,
            datum: vDatum,
            sakfragor: amnen,
            titel: vTitel,
            beteckning: bet,
            punkt,
          },
        });
        return post;
      });
      await fsSkrivManga("partitotaler", totalPoster);
    }
  }

  // Skriv röster med denormaliserad voteringsmeta + partimajoritet.
  let roster = 0;
  if (rostRader.length > 0) {
    const majoritetKarta = new Map<string, string | null>();
    for (const f of forslag) {
      const vid = str(f["votering_id"])?.toLowerCase();
      if (!vid) continue;
      const { rader } = lasPartitotaler(f["votering_sammanfattning_html"]);
      for (const r of rader) majoritetKarta.set(`${vid}|${r.parti}`, majoritetsrost(r));
    }
    const voteringMeta = new Map<
      string,
      {
        datum: string | null;
        titel: string | null;
        rubrik: string | null;
        beteckning: string | null;
        punkt: string | null;
      }
    >();
    for (const f of forslag) {
      const vid = str(f["votering_id"])?.toLowerCase();
      const punkt = str(f["punkt"]);
      if (!vid || !punkt) continue;
      voteringMeta.set(vid, {
        datum: datumPerVotering.get(vid) ?? null,
        titel: titel || str(f["rubrik"]),
        rubrik: str(f["rubrik"]),
        beteckning: bet,
        punkt,
      });
    }

    const poster = rostRader.map((r) => {
      const meta = voteringMeta.get(r.votering_id);
      const majoritet = r.parti
        ? (majoritetKarta.get(`${r.votering_id}|${r.parti}`) ?? null)
        : null;
      const befintlig = berorddaLedamoter.get(r.ledamot_id) ?? {};
      berorddaLedamoter.set(r.ledamot_id, {
        ...befintlig,
        [r.votering_id]: {
          rost: r.rost,
          parti: r.parti,
          majoritet,
          datum: meta?.datum ?? null,
          sakfragor: amnen,
          titel: meta?.titel ?? null,
          beteckning: meta?.beteckning ?? null,
          punkt: meta?.punkt ?? null,
        },
      });
      return {
        id: `${r.votering_id}|${r.ledamot_id}`,
        data: {
          ...r,
          datum: meta?.datum ?? null,
          arende_id: dokId,
          organ,
          titel: meta?.titel ?? null,
          rubrik: meta?.rubrik ?? null,
          beteckning: meta?.beteckning ?? null,
          punkt: meta?.punkt ?? null,
          sakfragor: amnen,
          partimajoritet: majoritet,
        },
      };
    });
    roster = await fsSkrivManga("roster", poster);
  }

  // Uppdatera röstmatriser och partimajoriteter för berörda ledamöter/partier.
  const matrisPoster: { id: string; data: Record<string, unknown> }[] = [];
  for (const [ledamot, poster] of berorddaLedamoter) {
    matrisPoster.push({ id: ledamot, data: { poster } });
  }
  if (matrisPoster.length > 0) await fsSkrivManga("rostmatriser", matrisPoster);
  const partiPoster: { id: string; data: Record<string, unknown> }[] = [];
  for (const [parti, poster] of berorddaPartier) {
    partiPoster.push({ id: parti, data: { poster } });
  }
  if (partiPoster.length > 0) await fsSkrivManga("partimajoriteter", partiPoster);

  return { voteringar, roster };
}

/** Läser in betänkanden för ett riksmöte, nyaste först. */
export async function ingestRiksmote(rm: string, max = 25): Promise<IngestResult> {
  const startad = new Date().toISOString();
  const db = await fsDb();
  try {
    const data = await getJson(
      `${BASE}/dokumentlista/?doktyp=bet&rm=${encodeURIComponent(rm)}&utformat=json&sz=200&sort=datum&sortorder=desc`,
    );
    const lista = (data["dokumentlista"] ?? {}) as Json;
    const dokument = asArray(lista["dokument"] as Json | Json[]);

    const redan = await db.collection("arenden").where("rm", "==", rm).get();
    const kanda = new Set(redan.docs.map((d) => d.id));

    const kandidater = dokument
      .map((d) => str(d["dok_id"]))
      .filter((id): id is string => !!id)
      .filter((id) => !kanda.has(id))
      .slice(0, max);

    let voteringar = 0;
    let fel = 0;
    for (const dokId of kandidater) {
      try {
        const r = await ingestArende(dokId);
        voteringar += r.voteringar;
      } catch {
        fel += 1;
      }
    }

    const detalj = `${kandidater.length} nya ärenden, ${voteringar} voteringar${fel ? `, ${fel} misslyckade ärenden` : ""}. Kvar att läsa in för ${rm}: ${Math.max(0, dokument.length - kanda.size - kandidater.length)}.`;
    if (voteringar > 0) {
      const { byggAvvikelseOchSplittring } = await import("./aggregat.server");
      await byggAvvikelseOchSplittring(db);
    }
    await logRun("arenden", "lyckad", kandidater.length, detalj, rm, startad);
    return { typ: "arenden", antal: kandidater.length, detalj };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRun("arenden", "misslyckad", 0, msg, rm, startad);
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Anföranden i debatter + länkar till Riksdagen-TV                    */
/* ------------------------------------------------------------------ */

/**
 * Hämtar debattsidan på Riksdagen webb-tv för ett ärende (rel_dok_id).
 * URL:en kan skrivas med valfri slug före "_<dokid>" – servern svarar
 * med en redirect till den kanoniska sidan. Sidan bäddar in varje
 * anförandes startposition i sekunder, ordnat efter anförandenummer.
 */
async function hamtaDebattVideo(
  relDokId: string,
): Promise<{ url: string; positioner: Map<string, number[]> } | null> {
  try {
    const res = await fetch(
      `https://www.riksdagen.se/sv/webb-tv/video/debatt-om-forslag/_${relDokId.toLowerCase()}/`,
      { redirect: "follow" },
    );
    if (!res.ok || !res.url.includes("/webb-tv/")) return null;
    const html = await res.text();
    const positioner = new Map<string, number[]>();
    const re = /stakeholderId2":"(\d+)","startPosition":(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const iid = m[1]!;
      const pos = Number.parseInt(m[2]!, 10);
      positioner.set(iid, [...(positioner.get(iid) ?? []), pos]);
    }
    return { url: res.url.split("?")[0]!, positioner };
  } catch {
    return null;
  }
}

/**
 * Läser in de senaste ärendedebatt-anförandena till samlingen `anforanden`.
 * anforandelistan saknar paginering – `sz` anger hur många av de senaste
 * som hämtas (redan inlästa hoppas över). För ärenden som finns inlästa
 * hämtas även debattsidan på webb-tv så att varje anförande får en
 * direktlänk med startposition (?pos=) när matchningen är entydig.
 */
export async function ingestAnforanden(sz = 500, rm?: string): Promise<IngestResult> {
  const startad = new Date().toISOString();
  try {
    const db = await fsDb();
    const data = await getJson(
      `${BASE}/anforandelista/?anftyp=debatt&utformat=json&sz=${sz}` +
        (rm ? `&rm=${encodeURIComponent(rm)}` : ""),
    );
    const lista = (data["anforandelista"] ?? {}) as Json;
    const rader = asArray(lista["anforande"] as Json | Json[]);

    const ids = rader.map((r) => str(r["anforande_id"])).filter((x): x is string => !!x);
    const befintligaSnaps =
      ids.length === 0
        ? []
        : await db.getAll(...ids.map((id) => db.collection("anforanden").doc(id)));
    const befintliga = new Set(befintligaSnaps.filter((s) => s.exists).map((s) => s.id));
    const nya = rader.filter((r) => {
      const id = str(r["anforande_id"]);
      return !!id && !befintliga.has(id);
    });

    // Webb-tv-sida per berört ärende (rel_dok_id = ärendets dokid). Hela
    // fönstret – inte bara nya – så att även poster som lästes in innan
    // videon publicerades kan få sin startposition i efterhand.
    const relIds = [
      ...new Set(rader.map((r) => str(r["rel_dok_id"])).filter((x): x is string => !!x)),
    ];
    const videoPerArende = new Map<string, { url: string; positioner: Map<string, number[]> }>();
    for (const relId of relIds) {
      const video = await hamtaDebattVideo(relId);
      if (video) videoPerArende.set(relId, video);
    }

    // Matcha webb-tv:s startpositioner mot anförandena per ledamot:
    // i:te inlägget för ledamoten i debatten ↔ i:te positionen för samma
    // ledamot på videosidan. Matchningen sker bara när antalen är lika –
    // annars lagras debattlänken utan startposition (heller inget än fel).
    // Matchningen utgår från hela det hämtade fönstret (rader), inte bara
    // nya poster – en debatt kan vara delvis inläst sedan tidigare körning.
    const videoUrlPerAnforande = new Map<string, string>();
    for (const [relId, video] of videoPerArende) {
      const debattens = rader
        .filter((r) => str(r["rel_dok_id"]) === relId)
        .sort((a, b) => (toInt(a["anforande_nummer"]) ?? 0) - (toInt(b["anforande_nummer"]) ?? 0));
      const perLedamot = new Map<string, Json[]>();
      for (const r of debattens) {
        const iid = str(r["intressent_id"]);
        if (!iid) continue;
        perLedamot.set(iid, [...(perLedamot.get(iid) ?? []), r]);
      }
      for (const [iid, anforanden] of perLedamot) {
        const pos = video.positioner.get(iid) ?? [];
        if (pos.length !== anforanden.length) continue;
        anforanden.forEach((r, i) => {
          const id = str(r["anforande_id"]);
          if (id && pos[i] !== undefined)
            videoUrlPerAnforande.set(id, `${video.url}?pos=${pos[i]}&autoplay=true`);
        });
      }
    }

    const nu = new Date().toISOString();
    const poster: { id: string; data: Record<string, unknown> }[] = nya.map((r) => {
      const id = str(r["anforande_id"])!;
      const relId = str(r["rel_dok_id"]);
      const video = relId ? videoPerArende.get(relId) : undefined;
      return {
        id,
        data: {
          id,
          arende_id: relId,
          ledamot_id: str(r["intressent_id"]),
          talare: str(r["talare"]),
          parti: str(r["parti"]),
          nummer: toInt(r["anforande_nummer"]),
          replik: str(r["replik"]) === "Y",
          rubrik: str(r["avsnittsrubrik"]),
          underrubrik: str(r["underrubrik"]),
          kammaraktivitet: str(r["kammaraktivitet"]),
          protokoll_dok_id: str(r["dok_id"]),
          datum: toDate(r["dok_datum"]),
          protokoll_url_www: str(r["protokoll_url_www"]),
          debatt_url: video?.url ?? null,
          video_url: videoUrlPerAnforande.get(id) ?? video?.url ?? null,
          systemdatum: str(r["systemdatum"]),
          uppdaterad: nu,
        },
      };
    });

    // Påfyllning: redan inlästa anföranden som saknar videolänk får den
    // nu om matchningen lyckats (t.ex. om videon publicerats först senare).
    const snapPerId = new Map(befintligaSnaps.map((s) => [s.id, s]));
    for (const r of rader) {
      const id = str(r["anforande_id"]);
      if (!id || !befintliga.has(id)) continue;
      const sparad = snapPerId.get(id);
      if (!sparad || sparad.data()?.["video_url"]) continue;
      const relId = str(r["rel_dok_id"]);
      const video = relId ? videoPerArende.get(relId) : undefined;
      const videoUrl = videoUrlPerAnforande.get(id) ?? video?.url ?? null;
      if (!videoUrl) continue;
      poster.push({
        id,
        data: {
          debatt_url: video?.url ?? null,
          video_url: videoUrl,
          uppdaterad: nu,
        },
      });
    }

    const skrivna = await fsSkrivManga("anforanden", poster);

    // Denormalisera debattlänk + antal anföranden till ärenden som finns inlästa.
    // debatt_url sätts även för ärenden vars anföranden lästes in tidigare.
    const antalPerArende = new Map<string, number>();
    for (const r of nya) {
      const relId = str(r["rel_dok_id"]);
      if (relId) antalPerArende.set(relId, (antalPerArende.get(relId) ?? 0) + 1);
    }
    const berordaArenden = new Set([...antalPerArende.keys(), ...videoPerArende.keys()]);
    for (const relId of berordaArenden) {
      const arende = await db.collection("arenden").doc(relId).get();
      if (!arende.exists) continue;
      const tidigare = (arende.data()?.["antal_anforanden"] as number | undefined) ?? 0;
      const video = videoPerArende.get(relId);
      await db
        .collection("arenden")
        .doc(relId)
        .set(
          {
            debatt_url: video?.url ?? arende.data()?.["debatt_url"] ?? null,
            antal_anforanden: tidigare + (antalPerArende.get(relId) ?? 0),
            uppdaterad: nu,
          },
          { merge: true },
        );
    }

    const detalj = `${skrivna} nya anföranden (${rader.length} lästa), video för ${videoPerArende.size} debatter, ${videoUrlPerAnforande.size} direktlänkar med startposition.`;
    await logRun("anforanden", "lyckad", skrivna, detalj, rm ?? null, startad);
    return { typ: "anforanden", antal: skrivna, detalj };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRun("anforanden", "misslyckad", 0, msg, rm ?? null, startad);
    throw e;
  }
}
