import { analyseraBeslut } from "./beslut-analys";
import { rensaHtml } from "./format";
import { geminiJson, geminiModell } from "./gemini.server";

export interface VoteringsUnderlag {
  id: string;
  titel: string | null;
  beteckning: string | null;
  punkt: string | null;
  rubrik: string | null;
  gallde: string | null;
  datum: string | null;
  organ: string | null;
  ja: number;
  nej: number;
  avstar: number;
  franvarande: number;
  vinnare: string | null;
  beslutspunkt: {
    rubrik: string | null;
    forslag: string | null;
    motforslag_partier: string | null;
    motforslag_nummer: string | null;
  } | null;
  partier: {
    parti: string;
    ja: number;
    nej: number;
    avstar: number;
    franvarande: number;
    majoritetsrost: string | null;
  }[];
}

export interface GenereradSammanfattning {
  sammanfattning: string;
  bakgrund?: string | undefined;
  utfall?: string | undefined;
  betydelse?: string | undefined;
  tillrackligt_underlag: boolean;
  modell: string;
}

export function extraheraFrageBakgrund(text: string): string {
  if (!text) return "";
  const stycken = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (stycken.length <= 1) return text;
  // Det första stycket i Insikts voteringssammanfattningar beskriver vad frågan handlar om i sak.
  // Resterande stycken beskriver utfall, partiernas röster och vinnare.
  return stycken[0] || text;
}

const SYSTEM_INSTRUKTION = `Du är en neutral redaktör på Insikt, en svensk tjänst som gör riksdagens beslut begripliga för vanliga medborgare utan förkunskaper.

Din uppgift är att skriva en kort sammanfattning i klartext av en enskild votering (omröstning) i Sveriges riksdag.

Regler:
- Skriv på enkel, vardaglig svenska. Undvik byråkratiska termer; om du måste använda ord som "proposition", "motion", "reservation", "utskott" eller "tillkännagivande" ska du förklara dem kort i löptexten.
- Var strikt neutral och saklig. Inga värderingar, inga spekulationer om motiv, ingen partipolitisk vinkling.
- Använd ENBART uppgifterna i underlaget. Hitta inte på sakinnehåll, siffror, namn eller konsekvenser som inte finns i underlaget.
- Viktigt att förstå: i riksdagen ställs utskottets förslag alltid som Ja-alternativ. Om utskottet föreslog att avslå ett förslag innebär en Ja-seger att förslaget stoppades. Underlaget anger vad Ja respektive Nej innebar – följ det.
- Struktur (3 korta stycken, utan rubriker, utan markdown, utan punktlistor):
  1. bakgrund: Vad handlade omröstningen om i sak? (1–2 meningar). NÄMN INTE hur omröstningen gick, vem som vann eller röstsiffror i detta stycke.
  2. utfall: Hur gick det? Vem ville vad? Nämn utfallet i siffror (Ja mot Nej) och grovt vilka partier som stod på vilken sida, baserat på partiernas majoritetsröst.
  3. betydelse: Vad betyder beslutet i praktiken? Håll dig till vad underlaget faktiskt säger. Om det inte går att säga något säkert, skriv det.
- Max cirka 120 ord totalt.
- Om underlaget är för tunt för att förstå vad frågan gällde (t.ex. saknar beskrivning av vad som röstades om) ska du ändå skriva det som går att säga och sätta tillrackligt_underlag till false.`;

const SVARSSCHEMA = {
  type: "object",
  properties: {
    bakgrund: {
      type: "string",
      description:
        "Vad omröstningen handlade om i sak (1–2 meningar). NÄMN INTE hur omröstningen gick, vem som vann eller röstsiffror här.",
    },
    utfall: {
      type: "string",
      description:
        "Hur omröstningen gick, röstsiffror (Ja mot Nej) och vilka partier som röstade på vilken sida (1–2 meningar).",
    },
    betydelse: {
      type: "string",
      description:
        "Vad beslutet innebär i praktiken för samhälle och medborgare utifrån utfallet (1–2 meningar).",
    },
    sammanfattning: {
      type: "string",
      description:
        "Hela sammanfattningen i klartext (bakgrund, utfall och betydelse separerade med blankrad).",
    },
    tillrackligt_underlag: {
      type: "boolean",
      description: "false om underlaget var för tunt för en tillförlitlig sammanfattning.",
    },
  },
  required: ["sammanfattning", "tillrackligt_underlag"],
};

function byggPrompt(u: VoteringsUnderlag): string {
  const analys = analyseraBeslut({
    forslag: u.beslutspunkt?.forslag,
    rubrik: u.beslutspunkt?.rubrik ?? u.rubrik,
    gallde: u.gallde,
    motforslag_partier: u.beslutspunkt?.motforslag_partier,
    motforslag_nummer: u.beslutspunkt?.motforslag_nummer,
    vinnare: u.vinnare,
    ja: u.ja,
    nej: u.nej,
  });

  const partirader = u.partier
    .map(
      (p) =>
        `  - ${p.parti}: majoritet ${p.majoritetsrost ?? "ingen tydlig"} (Ja ${p.ja}, Nej ${p.nej}, Avstår ${p.avstar}, Frånvarande ${p.franvarande})`,
    )
    .join("\n");

  const rader = [
    `Ärende: ${u.titel ?? "okänd titel"}`,
    `Beteckning: ${u.beteckning ?? "saknas"}, beslutspunkt ${u.punkt ?? "–"}`,
    `Datum: ${u.datum ?? "saknas"}`,
    `Utskott: ${u.organ ?? "saknas"}`,
    ``,
    `Vad omröstningen gällde (från riksdagens data): ${rensaHtml(u.gallde) || "saknas"}`,
    `Beslutspunktens rubrik: ${u.beslutspunkt?.rubrik ?? u.rubrik ?? "saknas"}`,
    `Utskottets förslag: ${rensaHtml(u.beslutspunkt?.forslag) || "saknas"}`,
    `Motförslag från: ${u.beslutspunkt?.motforslag_partier ?? "saknas"}${u.beslutspunkt?.motforslag_nummer ? ` (reservation ${u.beslutspunkt.motforslag_nummer})` : ""}`,
    ``,
    `Tolkning av alternativen (regelbaserad, använd som stöd):`,
    `  - Ja-röst innebar: ${analys.ja.rubrik} – ${analys.ja.beskrivning}`,
    `  - Nej-röst innebar: ${analys.nej.rubrik} – ${analys.nej.beskrivning}`,
    analys.utfall
      ? `  - Utfall enligt regeltolkning: ${analys.utfall.etikett}. ${analys.utfall.forklaring}`
      : `  - Utfall enligt regeltolkning: okänt`,
    ``,
    `Resultat i kammaren: Ja ${u.ja}, Nej ${u.nej}, Avstår ${u.avstar}, Frånvarande ${u.franvarande}. Vinnare: ${u.vinnare ?? "okänt"}.`,
    `Partiernas röstning:`,
    partirader || "  (saknas)",
  ];

  return rader.join("\n");
}

export async function genereraVoteringssammanfattning(
  u: VoteringsUnderlag,
): Promise<GenereradSammanfattning> {
  const svar = await geminiJson<{
    sammanfattning: string;
    bakgrund?: string;
    utfall?: string;
    betydelse?: string;
    tillrackligt_underlag: boolean;
  }>({
    systemInstruktion: SYSTEM_INSTRUKTION,
    prompt: byggPrompt(u),
    schema: SVARSSCHEMA,
  });

  const text = svar.sammanfattning?.trim();
  if (!text) throw new Error("Modellen returnerade en tom sammanfattning.");

  const bakgrund = svar.bakgrund?.trim() || extraheraFrageBakgrund(text);
  const utfall = svar.utfall?.trim();
  const betydelse = svar.betydelse?.trim();

  return {
    sammanfattning: text,
    bakgrund,
    utfall,
    betydelse,
    tillrackligt_underlag: Boolean(svar.tillrackligt_underlag),
    modell: geminiModell(),
  };
}
