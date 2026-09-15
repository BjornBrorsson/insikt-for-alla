import { createFileRoute, Link } from "@tanstack/react-router";
import { Sidhuvud } from "@/components/insikt/tillstand";

export const Route = createFileRoute("/om-insikt")({
  head: () => ({
    meta: [
      { title: "Om Insikt — Förstå riksdagens beslut" },
      {
        name: "description",
        content:
          "Om Insikt: ett partipolitiskt obundet initiativ för att göra Sveriges riksdag transparent, begriplig och granskningsbar för alla medborgare.",
      },
    ],
  }),
  component: OmInsikt,
});

function OmInsikt() {
  return (
    <div>
      <Sidhuvud
        rubrik="Om Insikt"
        lead="Demokrati bygger på att medborgarna kan förstå vad deras folkvalda beslutar och hur de agerar. Insikt gör riksdagens arbete begripligt, öppet och granskningsbart."
      />

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="prose prose-neutral max-w-none space-y-8 text-foreground">
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-2xl font-normal">Vårt syfte</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Sveriges riksdag fattar varje år tusentals beslut som formar samhället — från statsbudget
              och lagstiftning till infrastruktur och välfärd. Samtidigt är riksdagens formella
              dokument ofta svårgenomträngliga: betänkanden på hundratals sidor, formella
              yrkanden och snåriga voteringslistor.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Insikt har skapats för att sänka trösklarna till denna information. Vårt mål är att
              vem som helst, oavsett förkunskaper, snabbt ska kunna ta reda på:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5 text-sm text-muted-foreground">
              <li>Vilka ledamöter som representerar ens egen valkrets.</li>
              <li>Hur ett visst parti eller en viss ledamot faktiskt har röstat i kammaren.</li>
              <li>Vad ett beslut innebar i praktiken, och vilka förslag som stod mot varandra.</li>
              <li>Hur ofta två ledamöter eller två partier röstar likadant.</li>
              <li>Vad som händer inom sakfrågor man bryr sig om.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-2xl font-normal">Partipolitiskt neutralt och sakligt</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Insikt drivs inte av något parti, något intresseförbund eller någon opinionsbildande
              organisation. Vi har inga politiska ståndpunkter och tar aldrig ställning till om ett
              beslut eller ett förslag är ”bra” eller ”dåligt”.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Vårt uppdrag är uteslutande att redovisa vad som faktiskt hände i riksdagen, på ett
              så klart, sakligt och verifierbart sätt som möjligt. Vi tillskriver aldrig ledamöter
              dolda motiv eller ideologiska etiketter som inte finns i det formella beslutsunderlaget.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-2xl font-normal">100 % öppna data och full spårbarhet</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              All information om ledamöter, uppdrag, ärenden, beslutspunkter och enskilda röster hämtas
              direkt från <strong>Riksdagens öppna data</strong> (data.riksdagen.se).
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Vi skapar aldrig egna påhittade siffror. På varje sida i Insikt finns en direktlänk
              till Riksdagens officiella dokument och protokoll så att du själv kan kontrollera varje
              uppgift vid källan.
            </p>
            <div className="mt-4">
              <Link
                to="/kallor-och-metod"
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-insikt)] hover:underline"
              >
                Läs mer om våra källor, beräkningar och metoder →
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-2xl font-normal">Tillgänglighet och integritet</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Plattformen är utformad för att vara tillgänglig för alla:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5 text-sm text-muted-foreground">
              <li>
                <strong>Färgseende:</strong> Röstdiagram använder geometriska symboler (▲ Ja, ▼ Nej,
                ■ Avstår, ○ Frånvarande) och tydliga siffror utöver färger.
              </li>
              <li>
                <strong>Inget konto krävs:</strong> All offentlig data går att läsa och söka utan
                inloggning.
              </li>
              <li>
                <strong>Privat bevakning:</strong> Dina sparade ledamöter, partier och ärenden sparas
                lokalt i din egen webbläsare, utan spårning eller profilering.
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-[var(--yta)] p-6 text-center">
            <h2 className="text-xl font-normal">Hittat något som inte stämmer?</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Vi strävar efter absolut korrekthet. Om du upptäcker ett fel i en sammanfattning, en
              ämneskoppling eller visningen av en votering uppskattar vi om du rapporterar det till oss.
            </p>
            <div className="mt-5">
              <Link
                to="/rapportera-fel"
                className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Rapportera fel
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
