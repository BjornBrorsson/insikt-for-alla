import { rensaHtml } from "./format";

export interface BeslutsInnebord {
  rubrik: string;
  beskrivning: string;
  handling: "avsla" | "bifalla" | "neutral";
}

export interface BeslutsUtfall {
  etikett: string;
  statusTyp: "avslag" | "bifall" | "neutral";
  forklaring: string;
  tips?: string;
}

export interface BeslutsAnalys {
  kategori:
    | "avslag_motion"
    | "bifall_proposition"
    | "avslag_proposition"
    | "skrivelse_handlingarna"
    | "allman";
  rubrik: string;
  utskottetsForslagKort: string;
  motforslagKort: string;
  motPartier: string | null;
  motNummer: string | null;
  ja: BeslutsInnebord;
  nej: BeslutsInnebord;
  utfall: BeslutsUtfall | null;
}

interface AnalysInput {
  forslag?: string | null | undefined;
  rubrik?: string | null | undefined;
  gallde?: string | null | undefined;
  motforslag_partier?: string | null | undefined;
  motforslag_nummer?: string | null | undefined;
  vinnare?: string | null | undefined;
  ja?: number | undefined;
  nej?: number | undefined;
}

export function analyseraBeslut(input: AnalysInput): BeslutsAnalys {
  const forslagRen = rensaHtml(input.forslag ?? "").trim();
  const galldeRen = rensaHtml(input.gallde ?? "").trim();
  const fLower = forslagRen.toLowerCase();
  const gLower = galldeRen.toLowerCase();
  const rubrik = input.rubrik?.trim() ?? "Beslutspunkt";

  const motPartier = input.motforslag_partier?.trim() || "";
  const motRes = input.motforslag_nummer ? `reservation ${input.motforslag_nummer}` : "";
  const motKortText = [motPartier, motRes].filter(Boolean).join(" ");

  // 1. Avgör kategori
  let kategori: BeslutsAnalys["kategori"] = "allman";

  const arAvslagProposition =
    fLower.includes("avslår proposition") ||
    fLower.includes("godkänner inte den föreslagna ändringen") ||
    fLower.includes("godkänner inte");

  const arBifallProposition =
    (fLower.includes("antar regeringens förslag") ||
      fLower.includes("bifaller proposition") ||
      fLower.includes("godkänner proposition") ||
      fLower.includes("antar lag") ||
      fLower.includes("bifaller riksdagen proposition")) &&
    !arAvslagProposition;

  const arAvslagMotion =
    (fLower.includes("avslår motion") ||
      fLower.includes("avslår samtliga motioner") ||
      fLower.includes("avslås") ||
      gLower.includes("avslå")) &&
    !arBifallProposition &&
    !arAvslagProposition;

  const arSkrivelseHandlingarna =
    fLower.includes("lägger skrivelse") ||
    fLower.includes("lägger redogörelse") ||
    fLower.includes("till handlingarna");

  if (arAvslagMotion) {
    kategori = "avslag_motion";
  } else if (arBifallProposition) {
    kategori = "bifall_proposition";
  } else if (arAvslagProposition) {
    kategori = "avslag_proposition";
  } else if (arSkrivelseHandlingarna) {
    kategori = "skrivelse_handlingarna";
  }

  // 2. Definiera vad Ja och Nej betyder för denna kategori
  let ja: BeslutsInnebord;
  let nej: BeslutsInnebord;
  let utskottetsForslagKort = "Utskottets förslag";
  let motforslagKort = motKortText ? `Motförslag (${motKortText})` : "Reservation / Motförslag";

  if (kategori === "avslag_motion") {
    utskottetsForslagKort = "Avslå motionerna";
    motforslagKort = motKortText
      ? `Bifalla reservation (${motKortText})`
      : "Bifalla motionerna (reservation)";
    ja = {
      rubrik: "Avslå motionen (Neka förslaget)",
      beskrivning:
        "Röstar för utskottets förslag att avslå motionerna. Det föreslagna kravet eller lagändringen genomförs inte.",
      handling: "avsla",
    };
    nej = {
      rubrik: motPartier
        ? `Bifalla reservationen (${motPartier})`
        : "Bifalla reservationen (Godkänna förslaget)",
      beskrivning: motKortText
        ? `Röstar för reservationen (${motKortText}) att riksdagen ska anta motionärernas förslag.`
        : "Röstar för reservationen att riksdagen ska anta motionärernas förslag.",
      handling: "bifalla",
    };
  } else if (kategori === "bifall_proposition") {
    utskottetsForslagKort = "Anta regeringens lagförslag / proposition";
    motforslagKort = motKortText
      ? `Avslå propositionen (${motKortText})`
      : "Avslå propositionen (reservation)";
    ja = {
      rubrik: "Anta lagförslaget (Bifalla propositionen)",
      beskrivning:
        "Röstar för utskottets förslag att godkänna propositionen och genomföra lagändringen.",
      handling: "bifalla",
    };
    nej = {
      rubrik: motPartier
        ? `Avslå lagförslaget (reservation ${motPartier})`
        : "Avslå lagförslaget (Stödja reservationen)",
      beskrivning: "Röstar för reservationens motförslag att inte anta regeringens lagförslag.",
      handling: "avsla",
    };
  } else if (kategori === "avslag_proposition") {
    utskottetsForslagKort = "Avslå regeringens proposition";
    ja = {
      rubrik: "Avslå propositionen",
      beskrivning: "Röstar för utskottets förslag att stoppa regeringens proposition.",
      handling: "avsla",
    };
    nej = {
      rubrik: motPartier
        ? `Godkänna propositionen (reservation ${motPartier})`
        : "Godkänna propositionen (Reservationen)",
      beskrivning: "Röstar för reservationen att godkänna regeringens proposition.",
      handling: "bifalla",
    };
  } else if (kategori === "skrivelse_handlingarna") {
    utskottetsForslagKort = "Lägga till handlingarna utan åtgärd";
    ja = {
      rubrik: "Lägga till handlingarna",
      beskrivning:
        "Röstar för att avsluta ärendet utan att rikta något tillkännagivande till regeringen.",
      handling: "neutral",
    };
    nej = {
      rubrik: motPartier
        ? `Kräva åtgärd (reservation ${motPartier})`
        : "Kräva åtgärd (Reservationen)",
      beskrivning:
        "Röstar för reservationens förslag om krav eller tillkännagivande till regeringen.",
      handling: "bifalla",
    };
  } else {
    ja = {
      rubrik: "Utskottets förslag",
      beskrivning: "Röstar för utskottets ståndpunkt i kammaren.",
      handling: "neutral",
    };
    nej = {
      rubrik: motPartier ? `Motförslaget (${motPartier})` : "Motförslaget / Reservationen",
      beskrivning: motKortText
        ? `Röstar för reservationen (${motKortText}) i kammaren.`
        : "Röstar för motförslaget i kammaren.",
      handling: "neutral",
    };
  }

  // 3. Beräkna utfall om vinnare eller siffror är kända
  let utfall: BeslutsUtfall | null = null;
  const jaRoster = input.ja ?? 0;
  const nejRoster = input.nej ?? 0;
  const vinnareRaw = (input.vinnare ?? "").toLowerCase();

  const utskottetVann = vinnareRaw.includes("utskott") || (jaRoster > nejRoster && jaRoster > 0);
  const reservationenVann =
    vinnareRaw.includes("reservation") || (nejRoster > jaRoster && nejRoster > 0);

  if (utskottetVann) {
    if (kategori === "avslag_motion") {
      utfall = {
        etikett: "Förslaget nekades (motionerna avslogs)",
        statusTyp: "avslag",
        forklaring: `Eftersom Ja (utskottet) vann med ${jaRoster} mot ${nejRoster} röster beslutade riksdagen att avslå motionerna. Förslaget om ”${rubrik.toLowerCase()}” genomförs alltså inte.`,
        tips: "I riksdagen ställs utskottets förslag alltid som Ja-alternativ. Eftersom utskottet föreslog avslag innebar Ja-segern att förslaget stoppades – inte att det genomfördes.",
      };
    } else if (kategori === "bifall_proposition") {
      utfall = {
        etikett: "Lagförslaget antogs (bifölls)",
        statusTyp: "bifall",
        forklaring: `Eftersom Ja (utskottet) vann med ${jaRoster} mot ${nejRoster} röster antog riksdagen lagförslaget. Propositionen godkändes.`,
        tips: "Utskottet föreslog att anta regeringens lagförslag, vilket vann kammarens stöd.",
      };
    } else if (kategori === "avslag_proposition") {
      utfall = {
        etikett: "Propositionen avslogs",
        statusTyp: "avslag",
        forklaring: `Eftersom Ja (utskottet) vann med ${jaRoster} mot ${nejRoster} röster röstade riksdagen för att avslå propositionen.`,
      };
    } else if (kategori === "skrivelse_handlingarna") {
      utfall = {
        etikett: "Lades till handlingarna",
        statusTyp: "neutral",
        forklaring: `Kammaren biföll utskottets förslag med ${jaRoster} mot ${nejRoster} röster. Ärendet avslutades utan tillkännagivande.`,
      };
    } else {
      utfall = {
        etikett: "Utskottets förslag vann",
        statusTyp: "neutral",
        forklaring: `Kammaren röstade för utskottets förslag med ${jaRoster} Ja mot ${nejRoster} Nej.`,
      };
    }
  } else if (reservationenVann) {
    if (kategori === "avslag_motion") {
      utfall = {
        etikett: "Förslaget godkändes (reservationen vann)",
        statusTyp: "bifall",
        forklaring: `Eftersom Nej (reservationen) vann med ${nejRoster} mot ${jaRoster} röster röstade riksdagen emot utskottets förslag och biföll motionärernas förslag.`,
        tips: "Riksdagen gick emot utskottets majoritet och antog förslaget genom att rösta Nej till utskottets avslagsförslag.",
      };
    } else if (kategori === "bifall_proposition") {
      utfall = {
        etikett: "Lagförslaget avslogs (reservationen vann)",
        statusTyp: "avslag",
        forklaring: `Eftersom Nej (reservationen) vann med ${nejRoster} mot ${jaRoster} röster avslogs propositionen i kammaren.`,
      };
    } else {
      utfall = {
        etikett: "Reservationen vann",
        statusTyp: "neutral",
        forklaring: `Kammaren röstade för reservationen med ${nejRoster} Nej mot ${jaRoster} Ja.`,
      };
    }
  }

  return {
    kategori,
    rubrik,
    utskottetsForslagKort,
    motforslagKort,
    motPartier: motPartier || null,
    motNummer: input.motforslag_nummer?.trim() || null,
    ja,
    nej,
    utfall,
  };
}

/**
 * Översätter riksdagens `vinnare`-fält till en etikett som tydliggör
 * vilket röstalternativ som vann – inte bara vem som formulerade det.
 */
export function vinnareEtikett(vinnare: string | null | undefined): string {
  const v = (vinnare ?? "").toLowerCase();
  if (v.includes("utskott")) return "Utskottets förslag (Ja) vann";
  if (v.includes("reservation") || v.includes("motförslag") || v.includes("motforslag"))
    return "Reservationen (Nej) vann";
  return vinnare ? `${vinnare} vann` : "Utfall saknas";
}
