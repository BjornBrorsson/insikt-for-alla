/**
 * Inläsning av Riksdagens öppna data (data.riksdagen.se).
 * Alla uppgifter lagras med stabila identifierare och länk till originalet.
 * Ingen uppgift hittas på: saknas den i källan lagras null.
 */

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

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
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
  const db = await admin();
  await db.from("inlasningar").insert({
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
  const db = await admin();
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

      const rader = personer
        .map((p) => {
          const id = str(p["intressent_id"]);
          if (!id) return null;
          return {
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
            uppdaterad: new Date().toISOString(),
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null && r.efternamn !== "");

      for (let i = 0; i < rader.length; i += 200) {
        const chunk = rader.slice(i, i + 200);
        const { error } = await db.from("ledamoter").upsert(chunk);
        if (error) throw new Error(error.message);
        antal += chunk.length;
      }

      // Uppdrag
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
        }
      }
      for (let i = 0; i < ledamotIds.length; i += 200) {
        const chunk = ledamotIds.slice(i, i + 200);
        await db.from("uppdrag").delete().in("ledamot_id", chunk);
      }
      for (let i = 0; i < uppdragRader.length; i += 500) {
        const { error } = await db.from("uppdrag").insert(uppdragRader.slice(i, i + 500));
        if (error) throw new Error(error.message);
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
  const db = await admin();
  const { data } = await db.from("sakfragor").select("slug, nyckelord, utskott");
  return (data ?? []) as Sakfraga[];
}

function matchaSakfragor(
  sakfragor: Sakfraga[],
  titel: string,
  organ: string | null,
): string[] {
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

function lasPartitotaler(html: unknown): { gallde: string | null; rader: PartiTotal[]; totalt: PartiTotal | null } {
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
  const db = await admin();
  const data = await getJson(`${BASE}/utskottsforslag/${dokId}.json`);
  const block = (data["utskottsforslag"] ?? {}) as Json;
  const dok = (block["dokument"] ?? {}) as Json;
  const rm = str(dok["rm"]);
  const bet = str(dok["beteckning"]);
  const titel = str(dok["titel"]) ?? dokId;
  const organ = str(dok["organ"]);

  const sakfragor = await hamtaSakfragor();

  const { error: arendeError } = await db.from("arenden").upsert({
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
    uppdaterad: new Date().toISOString(),
  });
  if (arendeError) throw new Error(arendeError.message);

  const amnen = matchaSakfragor(sakfragor, titel, organ);
  if (amnen.length > 0) {
    await db
      .from("arende_sakfragor")
      .upsert(amnen.map((sakfraga) => ({ arende_id: dokId, sakfraga, kalla: "insikt" })));
  }

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
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (punktRader.length > 0) {
    const { error } = await db.from("beslutspunkter").upsert(punktRader);
    if (error) throw new Error(error.message);
  }

  // Voteringar med partitotaler
  let voteringar = 0;
  for (const f of forslag) {
    const voteringId = str(f["votering_id"])?.toLowerCase();
    const punkt = str(f["punkt"]);
    if (!voteringId || !punkt) continue;
    const { gallde, rader, totalt } = lasPartitotaler(f["votering_sammanfattning_html"]);

    const { error } = await db.from("voteringar").upsert({
      id: voteringId,
      arende_id: dokId,
      beslutspunkt_id: `${dokId}-${punkt}`,
      rm,
      beteckning: bet,
      punkt,
      typ: str(f["punkttyp"]),
      rubrik: str(f["rubrik"]),
      gallde,
      ja: totalt?.ja ?? 0,
      nej: totalt?.nej ?? 0,
      avstar: totalt?.avstar ?? 0,
      franvarande: totalt?.franvarande ?? 0,
      vinnare: str(f["vinnare"]),
      kalla_url: `https://data.riksdagen.se/votering/${voteringId.toUpperCase()}`,
      uppdaterad: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    voteringar += 1;

    if (rader.length > 0) {
      await db
        .from("partitotaler")
        .upsert(rader.map((r) => ({ votering_id: voteringId, ...r })));
    }
  }

  // Individuella röster för hela betänkandet
  let roster = 0;
  if (rm && bet && voteringar > 0) {
    const vdata = await getJson(
      `${BASE}/voteringlista/?rm=${encodeURIComponent(rm)}&bet=${encodeURIComponent(bet)}&utformat=json&sz=100000`,
    );
    const vlista = (vdata["voteringlista"] ?? {}) as Json;
    const rows = asArray(vlista["votering"] as Json | Json[]);
    const datumPerVotering = new Map<string, string>();
    const rostRader = rows
      .map((r) => {
        const vid = str(r["votering_id"])?.toLowerCase();
        const ledamot = str(r["intressent_id"]);
        const rost = str(r["rost"]);
        if (!vid || !ledamot || !rost) return null;
        const d = toDate(r["systemdatum"]);
        if (d) {
          const nuvarande = datumPerVotering.get(vid);
          if (!nuvarande || d < nuvarande) datumPerVotering.set(vid, d);
        }
        return {
          votering_id: vid,
          ledamot_id: ledamot,
          parti: str(r["parti"]),
          valkrets: str(r["valkrets"]),
          rost,
          avser: str(r["avser"]),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Dubbletter kan förekomma i källan (samma ledamot och votering) – behåll första.
    const unika = new Map<string, (typeof rostRader)[number]>();
    for (const r of rostRader) unika.set(`${r.votering_id}|${r.ledamot_id}`, r);
    const lista = [...unika.values()];

    for (let i = 0; i < lista.length; i += 500) {
      const { error } = await db.from("roster").upsert(lista.slice(i, i + 500));
      if (error) throw new Error(error.message);
      roster += Math.min(500, lista.length - i);
    }

    for (const [vid, datum] of datumPerVotering) {
      const avser = rows.find((r) => str(r["votering_id"])?.toLowerCase() === vid);
      await db
        .from("voteringar")
        .update({ datum, avser: str(avser?.["avser"]) })
        .eq("id", vid);
    }
  }

  return { voteringar, roster };
}

/** Läser in betänkanden för ett riksmöte, nyaste först. */
export async function ingestRiksmote(rm: string, max = 25): Promise<IngestResult> {
  const startad = new Date().toISOString();
  const db = await admin();
  try {
    const data = await getJson(
      `${BASE}/dokumentlista/?doktyp=bet&rm=${encodeURIComponent(rm)}&utformat=json&sz=200&sort=datum&sortorder=desc`,
    );
    const lista = (data["dokumentlista"] ?? {}) as Json;
    const dokument = asArray(lista["dokument"] as Json | Json[]);

    const { data: redan } = await db.from("arenden").select("id").eq("rm", rm);
    const kanda = new Set((redan ?? []).map((r) => (r as { id: string }).id));

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
    await logRun("arenden", "lyckad", kandidater.length, detalj, rm, startad);
    return { typ: "arenden", antal: kandidater.length, detalj };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRun("arenden", "misslyckad", 0, msg, rm, startad);
    throw e;
  }
}
