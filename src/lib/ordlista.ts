export type TermKategori =
  "Beslut" | "Dokument" | "Procedur" | "Granskning" | "Votering" | "Organisation";

export type Term = {
  slug: string;
  term: string;
  forklaring: string;
  kategori: TermKategori;
  exempel?: string;
  varianter: string[];
};

export const TERMER: Term[] = [
  {
    slug: "acklamation",
    term: "Acklamation",
    forklaring:
      "När kammaren fattar beslut genom att talmannen ropar ut förslagen och ledamöterna svarar med 'Ja'. Om ingen begär rösträkning vinner det förslag som talmannen anser haft starkast bifall, utan att någon votering registreras.",
    kategori: "Beslut",
    varianter: ["acklamation", "acklamationen"],
  },
  {
    slug: "beslutspunkt",
    term: "Beslutspunkt",
    forklaring:
      "Ett enskilt förslag till beslut inom ett betänkande. Ett och samma betänkande kan innehålla allt från en enda beslutspunkt upp till dussintals punkter som kammaren tar ställning till separat.",
    kategori: "Beslut",
    varianter: ["beslutspunkt", "beslutspunkter", "beslutspunkten", "beslutspunkterna"],
  },
  {
    slug: "betankande",
    term: "Betänkande",
    forklaring:
      "Den skriftliga rapport som ett riksdagsutskott lämnar till kammaren med förslag på hur riksdagen ska besluta i ett ärende. Betänkandet innehåller bakgrund, utskottets ställningstagande och eventuella reservationer från minoriteten.",
    kategori: "Dokument",
    exempel: "Exempelvis 2024/25:FiU10 om statens budget.",
    varianter: ["betänkande", "betänkanden", "betänkandet", "betänkandena"],
  },
  {
    slug: "bordlaggning",
    term: "Bordläggning",
    forklaring:
      "Ett ärende måste anmälas och bordläggas (läggas på bordet) i kammaren minst en eller två gånger innan det kan debatteras och beslutas. Syftet är att ge ledamöterna tid att läsa in sig på förslagen.",
    kategori: "Procedur",
    varianter: ["bordläggning", "bordläggningen", "bordläggningar", "bordläggas", "bordlagts"],
  },
  {
    slug: "interpellation",
    term: "Interpellation",
    forklaring:
      "En mer omfattande fråga från en riksdagsledamot till en minister i regeringen. Ministern är skyldig att komma till kammaren och svara muntligt, varpå en debatt följer mellan ledamoten och ministern.",
    kategori: "Granskning",
    varianter: ["interpellation", "interpellationer", "interpellationen", "interpellationerna"],
  },
  {
    slug: "kvittning",
    term: "Kvittning",
    forklaring:
      "En frivillig överenskommelse mellan partierna där ledamöter avstår från att rösta för att styrkeförhållandena i kammaren ska behållas när ledamöter är förhindrade att delta (t.ex. vid sjukdom, föräldraledighet eller utlandsresor). Frånvaro på grund av kvittning innebär inte att ledamoten struntat i sitt arbete.",
    kategori: "Votering",
    varianter: ["kvittning", "kvittningen", "kvittad", "kvittade"],
  },
  {
    slug: "mandat",
    term: "Mandat",
    forklaring:
      "En plats i riksdagen. Sveriges riksdag har totalt 349 mandat som fördelas mellan partierna utifrån röstresultatet i det allmänna valet.",
    kategori: "Organisation",
    varianter: ["mandat", "mandaten", "mandatet"],
  },
  {
    slug: "misstroendeforklaring",
    term: "Misstroendeförklaring",
    forklaring:
      "Ett sätt för riksdagen att avsätta en minister eller hela regeringen. Om minst 175 ledamöter (mer än hälften) röstar för misstroende måste ministern eller regeringen avgå.",
    kategori: "Granskning",
    varianter: ["misstroendeförklaring", "misstroendeförklaringar", "misstroendeförklaringen"],
  },
  {
    slug: "motion",
    term: "Motion",
    forklaring:
      "Ett förslag till riksdagen som lämnas av en eller flera riksdagsledamöter (i motsats till en proposition som kommer från regeringen). Motioner kan lämnas under den allmänna motionstiden på hösten eller med anledning av en proposition.",
    kategori: "Dokument",
    varianter: ["motion", "motioner", "motionen", "motionerna"],
  },
  {
    slug: "partipiska-sammanhallning",
    term: "Partipiska / Sammanhållning",
    forklaring:
      "Det informella tryck som finns inom en riksdagsgrupp för att ledamöterna ska rösta likadant som partimajoriteten. Formellt är varje riksdagsledamot självständig och har bara sitt eget samvete att svara inför, men i praktiken röstar partigrupperna nästan alltid samlat.",
    kategori: "Votering",
    varianter: ["partipiska", "partipiskan", "partisammanhållning", "partisammanhållningen"],
  },
  {
    slug: "proposition",
    term: "Proposition",
    forklaring:
      "Ett lagförslag eller annat förslag från regeringen till riksdagen. De flesta större lagändringar och statsbudgeten har sitt ursprung i propositioner.",
    kategori: "Dokument",
    varianter: ["proposition", "propositioner", "propositionen", "propositionerna"],
  },
  {
    slug: "reservation",
    term: "Reservation",
    forklaring:
      "När en minoritet i ett utskott inte håller med utskottets majoritet lämnar de en skriftlig reservation i betänkandet. Vid voteringen i kammaren är det ofta en reservation som ställs mot utskottets förslag.",
    kategori: "Beslut",
    varianter: ["reservation", "reservationer", "reservationen", "reservationerna"],
  },
  {
    slug: "riksmote",
    term: "Riksmöte (rm)",
    forklaring:
      "Riksdagens arbetsår, som börjar i september och pågår till nästa års september. Betecknas som två årtal, t.ex. 2024/25 eller 2025/26.",
    kategori: "Organisation",
    varianter: ["riksmöte", "riksmötet", "riksmöten", "riksmötena"],
  },
  {
    slug: "skriftlig-fraga",
    term: "Skriftlig fråga",
    forklaring:
      "En kort fråga från en riksdagsledamot till ett statsråd. Statsrådet ska besvara frågan skriftligt inom en vecka. Till skillnad från interpellationer debatteras inte skriftliga frågor i kammaren.",
    kategori: "Granskning",
    varianter: ["skriftliga frågor", "skriftlig fråga", "skriftliga frågan"],
  },
  {
    slug: "sarskilt-yttrande",
    term: "Särskilt yttrande",
    forklaring:
      "Ett förtydligande eller en kommentar från ledamöter i ett utskott som instämmer i utskottets beslut men vill markera en viss synpunkt eller nyans utan att lämna en formell reservation.",
    kategori: "Beslut",
    varianter: ["särskilda yttranden", "särskilt yttrande", "särskilda yttrandet"],
  },
  {
    slug: "tillkannagivande",
    term: "Tillkännagivande",
    forklaring:
      "Ett beslut där riksdagen uppmanar regeringen att vidta en viss åtgärd, till exempel tillsätta en utredning eller återkomma med ett lagförslag.",
    kategori: "Beslut",
    varianter: ["tillkännagivande", "tillkännagivanden", "tillkännagivandet", "tillkännagivandena"],
  },
  {
    slug: "utskott",
    term: "Utskott",
    forklaring:
      "Riksdagens 15 permanenta fackorgan (t.ex. Finansutskottet FiU, Justitieutskottet JuU, Konstitutionsutskottet KU). Alla ärenden måste beredas i ett utskott innan kammaren kan fatta beslut.",
    kategori: "Organisation",
    varianter: ["utskott", "utskottet", "utskotten"],
  },
  {
    slug: "valkrets",
    term: "Valkrets",
    forklaring:
      "Ett geografiskt område som väljer ett visst antal representanter till riksdagen. Sverige är indelat i 29 valkretsar för att garantera att hela landet blir representerat i kammaren.",
    kategori: "Organisation",
    varianter: ["valkrets", "valkretsar", "valkretsen", "valkretsarna"],
  },
  {
    slug: "votering",
    term: "Votering",
    forklaring:
      "Rösträkning i kammaren med den elektroniska voteringsanläggningen. Genomförs när en ledamot begär det eller när talmannen inte säkert kan avgöra utfallet vid acklamation. Varje ledamot röstar Ja, Nej eller Avstår.",
    kategori: "Votering",
    varianter: ["votering", "voteringar", "voteringen", "voteringarna"],
  },
  {
    slug: "aterforvisning",
    term: "Återförvisning",
    forklaring:
      "Ett beslut av kammaren att skicka tillbaka ett ärende till utskottet för ytterligare beredning innan slutligt beslut fattas.",
    kategori: "Procedur",
    varianter: ["återförvisning", "återförvisningen"],
  },
];

// Mappa varje böjningsform till dess Term-objekt
const variantMap = new Map<string, Term>();
for (const t of TERMER) {
  for (const v of t.varianter) {
    variantMap.set(v.toLowerCase(), t);
  }
}

export function hittaTerm(variant: string): Term | undefined {
  return variantMap.get(variant.toLowerCase());
}

export function termSlug(termNamn: string): string {
  const hittad = TERMER.find((t) => t.term.toLowerCase() === termNamn.toLowerCase());
  if (hittad) return hittad.slug;
  return termNamn
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Samla alla varianter sorterade med längst först så att flerords-termer
 * ("särskilda yttranden", "skriftliga frågor") matchas före enskilda ord.
 */
const allaVarianterSorterade = Array.from(variantMap.keys()).sort((a, b) => b.length - a.length);

// Escape special regex chars if any (none in standard Swedish words, but safe)
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const termMonster = allaVarianterSorterade.map(escapeRegex).join("|");

/**
 * Regex som använder Unicode word boundaries för svenska bokstäver.
 */
export function skapaTermRegex(): RegExp {
  return new RegExp(`(?<=^|[^\\p{L}\\p{N}])(${termMonster})(?=$|[^\\p{L}\\p{N}])`, "giu");
}
