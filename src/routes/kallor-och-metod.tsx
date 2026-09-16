import { createFileRoute, Link } from "@tanstack/react-router";
import { Sidhuvud } from "@/components/insikt/tillstand";

export const Route = createFileRoute("/kallor-och-metod")({
  head: () => ({
    meta: [
      { title: "Källor & metod — Insikt" },
      {
        name: "description",
        content:
          "Genomgång av Insikts datakällor från Riksdagens öppna data, definitioner av beräknade mått som röstlikhet, och principer för saklighet och transparens.",
      },
    ],
  }),
  component: KallorOchMetod,
});

function KallorOchMetod() {
  return (
    <div>
      <Sidhuvud
        rubrik="Källor & metod"
        lead="Transparens är kärnan i Insikt. Här redogör vi för var uppgifterna kommer ifrån, hur beräkningar genomförs och vilka principer vi följer för att garantera saklighet."
      />

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-10 text-foreground">
          {/* Datakällor */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-2xl font-normal">Datakällor</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Insikt hämtar data från Sveriges riksdags officiella gränssnitt för öppna data på{" "}
              <a
                href="https://data.riksdagen.se"
                target="_blank"
                rel="noreferrer noopener"
                className="text-[var(--accent-insikt)] underline underline-offset-2"
              >
                data.riksdagen.se
              </a>
              . Följande datamängder används:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5 text-sm text-muted-foreground">
              <li>
                <strong>Personlistan:</strong> Samtliga ledamöter, person-ID, partitillhörighet,
                valkrets, status, födelseår, kön, bild-URL och officiella uppdrag.
              </li>
              <li>
                <strong>Dokumentlistan &amp; betänkanden:</strong> Ärenden, propositioner, motioner,
                utskottsbetänkanden, beslutspunkter och tidslinjer för riksdagsbehandlingen.
              </li>
              <li>
                <strong>Voteringsarkivet:</strong> Samtliga voteringsresultat, både aggregerade
                partitotaler och varje enskild ledamots individuella röst (Ja, Nej, Avstår,
                Frånvarande).
              </li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Insikt ändrar aldrig i källdata från riksdagen. Om en uppgift saknas i källan visas
              den som ”Uppgift saknas” i Insikt.
            </p>
          </section>

          {/* Definitioner av beräknade mått */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-2xl font-normal">Definitioner av beräknade mått</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              För att göra riksdagsarbetet begripligt gör Insikt vissa matematiska och statistiska
              sammanställningar. Dessa är tydligt märkta som Insikts egna beräkningar och följer
              strikt definierade regler:
            </p>

            <div className="mt-6 space-y-6">
              <div className="border-l-2 border-[var(--accent-insikt)] pl-4">
                <h3 className="font-medium text-foreground">1. Partiets majoritetsröst</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  I en omröstning definieras partiets majoritetsröst som det röstalternativ (Ja, Nej
                  eller Avstår) som fick flest röster bland partiets närvarande ledamöter.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <em>Viktig notering:</em> Detta är en rent matematisk observation av hur
                  ledamöterna faktiskt röstade, inte nödvändigtvis partiets formella partilinje
                  eller partipiska. Om två alternativ får exakt lika många röster saknar partiet
                  entydig majoritetsröst i den voteringen.
                </p>
              </div>

              <div className="border-l-2 border-[var(--accent-insikt)] pl-4">
                <h3 className="font-medium text-foreground">2. Röstlikhet (procent)</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Röstlikhet mellan två aktörer (två partier eller två ledamöter) beräknas som:
                </p>
                <p className="my-2 rounded bg-muted/50 p-2 font-mono text-xs">
                  Röstlikhet = (Antal omröstningar med samma röst) / (Antal jämförbara omröstningar)
                  × 100
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Som standard räknas en omröstning som <strong>jämförbar</strong> enbart när båda
                  aktörerna avgav en aktiv röst (Ja, Nej eller Avstår). Frånvaro och voteringar där
                  ett parti saknade entydig majoritetsröst exkluderas ur beräkningen och redovisas
                  separat.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <em>Tolkning:</em> Röstlikhet visar rent faktiskt hur ofta ledamöterna tryckt på
                  samma knapp. Det är inte ett bevis på ideologisk gemenskap, dolt samarbete eller
                  gemensamma politiska motiv.
                </p>
              </div>

              <div className="border-l-2 border-[var(--accent-insikt)] pl-4">
                <h3 className="font-medium text-foreground">3. Partisammanhållning</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Mäter hur enhetligt ett parti agerar i kammaren:
                </p>
                <p className="my-2 rounded bg-muted/50 p-2 font-mono text-xs">
                  Sammanhållning = (Avgivna röster i linje med majoritetsrösten) / (Totalt avgivna
                  röster i partiet) × 100
                </p>
                <p className="text-xs text-muted-foreground">
                  Endast Ja, Nej och Avstår räknas som avgivna röster. Frånvarande ledamöter
                  påverkar inte sammanhållningsmåttet.
                </p>
              </div>

              <div className="border-l-2 border-[var(--accent-insikt)] pl-4">
                <h3 className="font-medium text-foreground">4. Frånvaro och kvittning</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Frånvaro i voteringar får <strong>aldrig</strong> tolkas som ett generellt mått på
                  arbetsinsats, engagemang eller närvaro i riksdagsarbetet.
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Riksdagen tillämpar ett väletablerat <em>kvittningssystem</em> där partierna
                  överenskommer att ledamöter avstår från att rösta så att styrkeförhållandena i
                  kammaren inte rubbas när ledamöter är sjuka, föräldralediga eller deltar i
                  internationella delegationer. En ledamot som är frånvarande i kammarens voteringar
                  kan vara fullt upptagen med utredningsarbete, utskottsmöten eller ministeruppdrag.
                </p>
              </div>
            </div>
          </section>

          {/* Ämnesindelning & Sakfrågor */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-2xl font-normal">Sakfrågor &amp; ämneskategorisering</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Riksdagens egen ärendedatabas saknar en enhetlig konsumentanpassad ämnestaggning.
              Insikt har därför tagit fram 10 centrala sakfrågeområden (t.ex. Klimat och miljö,
              Energi, Skola, Sjukvård, Rättspolitik m.fl.).
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Ärenden kopplas till dessa sakfrågor baserat på ansvarigt riksdagsutskott och
              specifika nyckelord i betänkandenas titlar. Varje sådan koppling märks i gränssnittet
              som <em>”Insikts kategorisering”</em> för att inte förväxlas med en officiell
              klassificering från riksdagen.
            </p>
          </section>

          {/* AI och sammanfattningar */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-2xl font-normal">AI-sammanfattningar</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Där riksdagens betänkanden är omfattande och tekniska kan Insikt erbjuda en kortfattad
              sammanfattning. För dessa tillämpas följande strikta regler:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5 text-sm text-muted-foreground">
              <li>
                Sammanfattningen baseras uteslutande på det officiella betänkandets faktiska text.
              </li>
              <li>
                Märks alltid tydligt med etiketten <em>”AI-genererad sammanfattning”</em>, använd
                modell samt länk till det fullständiga underlaget.
              </li>
              <li>
                AI används <strong>aldrig</strong> för att gissa partitillhörighet, röster,
                beslutsutfall eller politikers motiv.
              </li>
              <li>
                Om underlaget inte räcker för en tillförlitlig sammanfattning anges detta
                uttryckligen.
              </li>
            </ul>
          </section>

          {/* Neutralitetsdeklaration länk */}
          <section className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-foreground">Vill du veta mer om vårt oberoende?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Läs vår fullständiga neutralitetsdeklaration, hur tolkningen av Ja/Nej fungerar och
                hur du själv kan granska källkoden.
              </p>
            </div>
            <Link
              to="/neutralitet"
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
            >
              Till neutralitetssidan →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
