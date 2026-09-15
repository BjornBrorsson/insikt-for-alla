import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sidhuvud } from "@/components/insikt/tillstand";

export const Route = createFileRoute("/ordlista")({
  head: () => ({
    meta: [
      { title: "Ordlista — Riksdagstermer förklarade | Insikt" },
      {
        name: "description",
        content:
          "Sökbar ordlista med begripliga förklaringar av riksdagens begrepp: motioner, propositioner, betänkanden, reservationer, voteringar, utskott och kvittning.",
      },
    ],
  }),
  component: Ordlista,
});

type Term = {
  term: string;
  forklaring: string;
  kategori: string;
  exempel?: string;
};

const TERMER: Term[] = [
  {
    term: "Acklamation",
    forklaring:
      "När kammaren fattar beslut genom att talmannen ropar ut förslagen och ledamöterna svarar med 'Ja'. Om ingen begär rösträkning vinner det förslag som talmannen anser haft starkast bifall, utan att någon votering registreras.",
    kategori: "Beslut",
  },
  {
    term: "Beslutspunkt",
    forklaring:
      "Ett enskilt förslag till beslut inom ett betänkande. Ett och samma betänkande kan innehålla allt från en enda beslutspunkt upp till dussintals punkter som kammaren tar ställning till separat.",
    kategori: "Beslut",
  },
  {
    term: "Betänkande",
    forklaring:
      "Den skriftliga rapport som ett riksdagsutskott lämnar till kammaren med förslag på hur riksdagen ska besluta i ett ärende. Betänkandet innehåller bakgrund, utskottets ställningstagande och eventuella reservationer från minoriteten.",
    kategori: "Dokument",
    exempel: "Exempelvis 2024/25:FiU10 om statens budget.",
  },
  {
    term: "Bordläggning",
    forklaring:
      "Ett ärende måste anmälas och bordläggas (läggas på bordet) i kammaren minst en eller två gånger innan det kan debatteras och beslutas. Syftet är att ge ledamöterna tid att läsa in sig på förslagen.",
    kategori: "Procedur",
  },
  {
    term: "Interpellation",
    forklaring:
      "En mer omfattande fråga från en riksdagsledamot till en minister i regeringen. Ministern är skyldig att komma till kammaren och svara muntligt, varpå en debatt följer mellan ledamoten och ministern.",
    kategori: "Granskning",
  },
  {
    term: "Kvittning",
    forklaring:
      "En frivillig överenskommelse mellan partierna där ledamöter avstår från att rösta för att styrkeförhållandena i kammaren ska behållas när ledamöter är förhindrade att delta (t.ex. vid sjukdom, föräldraledighet eller utlandsresor). Frånvaro på grund av kvittning innebär inte att ledamoten struntat i sitt arbete.",
    kategori: "Votering",
  },
  {
    term: "Mandat",
    forklaring:
      "En plats i riksdagen. Sveriges riksdag har totalt 349 mandat som fördelas mellan partierna utifrån röstresultatet i det allmänna valet.",
    kategori: "Organisation",
  },
  {
    term: "Misstroendeförklaring",
    forklaring:
      "Ett sätt för riksdagen att avsätta en minister eller hela regeringen. Om minst 175 ledamöter (mer än hälften) röstar för misstroende måste ministern eller regeringen avgå.",
    kategori: "Granskning",
  },
  {
    term: "Motion",
    forklaring:
      "Ett förslag till riksdagen som lämnas av en eller flera riksdagsledamöter (i motsats till en proposition som kommer från regeringen). Motioner kan lämnas under den allmänna motionstiden på hösten eller med anledning av en proposition.",
    kategori: "Dokument",
  },
  {
    term: "Partipiska / Sammanhållning",
    forklaring:
      "Det informella tryck som finns inom en riksdagsgrupp för att ledamöterna ska rösta likadant som partimajoriteten. Formellt är varje riksdagsledamot självständig och har bara sitt eget samvete att svara inför, men i praktiken röstar partigrupperna nästan alltid samlat.",
    kategori: "Votering",
  },
  {
    term: "Proposition",
    forklaring:
      "Ett lagförslag eller annat förslag från regeringen till riksdagen. De flesta större lagändringar och statsbudgeten har sitt ursprung i propositioner.",
    kategori: "Dokument",
  },
  {
    term: "Reservation",
    forklaring:
      "När en minoritet i ett utskott inte håller med utskottets majoritet lämnar de en skriftlig reservation i betänkandet. Vid voteringen i kammaren är det ofta en reservation som ställs mot utskottets förslag.",
    kategori: "Beslut",
  },
  {
    term: "Riksmöte (rm)",
    forklaring:
      "Riksdagens arbetsår, som börjar i september och pågår till nästa års september. Betecknas som två årtal, t.ex. 2024/25 eller 2025/26.",
    kategori: "Organisation",
  },
  {
    term: "Skriftlig fråga",
    forklaring:
      "En kort fråga från en riksdagsledamot till ett statsråd. Statsrådet ska besvara frågan skriftligt inom en vecka. Till skillnad från interpellationer debatteras inte skriftliga frågor i kammaren.",
    kategori: "Granskning",
  },
  {
    term: "Särskilt yttrande",
    forklaring:
      "Ett förtydligande eller en kommentar från ledamöter i ett utskott som instämmer i utskottets beslut men vill markera en viss synpunkt eller nyans utan att lämna en formell reservation.",
    kategori: "Beslut",
  },
  {
    term: "Tillkännagivande",
    forklaring:
      "Ett beslut där riksdagen uppmanar regeringen att vidta en viss åtgärd, till exempel tillsätta en utredning eller återkomma med ett lagförslag.",
    kategori: "Beslut",
  },
  {
    term: "Utskott",
    forklaring:
      "Riksdagens 15 permanenta fackorgan (t.ex. Finansutskottet FiU, Justitieutskottet JuU, Konstitutionsutskottet KU). Alla ärenden måste beredas i ett utskott innan kammaren kan fatta beslut.",
    kategori: "Organisation",
  },
  {
    term: "Valkrets",
    forklaring:
      "Ett geografiskt område som väljer ett visst antal representanter till riksdagen. Sverige är indelat i 29 valkretsar för att garantera att hela landet blir representerat i kammaren.",
    kategori: "Organisation",
  },
  {
    term: "Votering",
    forklaring:
      "Rösträkning i kammaren med den elektroniska voteringsanläggningen. Genomförs när en ledamot begär det eller när talmannen inte säkert kan avgöra utfallet vid acklamation. Varje ledamot röstar Ja, Nej eller Avstår.",
    kategori: "Votering",
  },
  {
    term: "Återförvisning",
    forklaring:
      "Ett beslut av kammaren att skicka tillbaka ett ärende till utskottet för ytterligare beredning innan slutligt beslut fattas.",
    kategori: "Procedur",
  },
];

function Ordlista() {
  const [sok, setSok] = useState("");
  const [valdKategori, setValdKategori] = useState<string>("alla");

  const kategorier = ["alla", ...new Set(TERMER.map((t) => t.kategori))];

  const filtrerade = TERMER.filter((t) => {
    const matchSok =
      !sok ||
      t.term.toLowerCase().includes(sok.toLowerCase()) ||
      t.forklaring.toLowerCase().includes(sok.toLowerCase());
    const matchKategori = valdKategori === "alla" || t.kategori === valdKategori;
    return matchSok && matchKategori;
  });

  return (
    <div>
      <Sidhuvud
        rubrik="Ordlista"
        lead="Riksdagens arbete är fyllt av fackuttryck och procedurtermer. Här förklarar vi de viktigaste begreppen i klart och tydligt språk."
      />

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Sök och filter */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 max-w-md">
            <label htmlFor="ordlista-sok" className="sr-only">
              Sök i ordlistan
            </label>
            <input
              id="ordlista-sok"
              type="search"
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              placeholder="Sök begrepp eller förklaring …"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrera på kategori">
            {kategorier.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setValdKategori(k)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  valdKategori === k
                    ? "bg-primary text-primary-foreground"
                    : "border border-input bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                {k === "alla" ? "Alla begrepp" : k}
              </button>
            ))}
          </div>
        </div>

        {/* Träfflista */}
        {filtrerade.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-[var(--yta)] p-8 text-center">
            <p className="font-medium">Inga begrepp matchade sökningen</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Prova att söka på ett annat ord eller välj ”Alla begrepp”.
            </p>
            <button
              type="button"
              onClick={() => {
                setSok("");
                setValdKategori("alla");
              }}
              className="mt-3 text-sm text-[var(--accent-insikt)] underline"
            >
              Återställ sökning
            </button>
          </div>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            {filtrerade.map((item) => (
              <div
                key={item.term}
                className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-2xs transition-shadow hover:shadow-xs"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-lg font-medium text-foreground">{item.term}</dt>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {item.kategori}
                  </span>
                </div>
                <dd className="mt-2.5 flex-1 text-sm text-muted-foreground leading-relaxed">
                  {item.forklaring}
                  {item.exempel ? (
                    <span className="mt-2 block italic text-xs text-muted-foreground/80">
                      {item.exempel}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
