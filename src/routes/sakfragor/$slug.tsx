import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getSakfraga } from "@/lib/insikt.functions";
import { datum, rensaHtml } from "@/lib/format";
import { EgenBerakning, Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { Bevaka, RostDiagram } from "@/components/insikt/delar";

export const Route = createFileRoute("/sakfragor/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Sakfråga — Insikt` },
      {
        name: "description",
        content: `Ärenden, betänkanden och voteringar kopplade till sakfrågan i Sveriges riksdag.`,
      },
    ],
  }),
  component: SakfragaDetalj,
});

function SakfragaDetalj() {
  const { slug } = Route.useParams();
  const hamtaSakfraga = useServerFn(getSakfraga);

  const query = useQuery({
    queryKey: ["sakfraga", slug],
    queryFn: () => hamtaSakfraga({ data: { slug } }),
  });

  if (query.isPending) return <Laddar text="Hämtar uppgifter om sakfrågan …" />;
  if (query.isError) return <Fel fel={query.error} forsokIgen={() => query.refetch()} />;
  if (!query.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Tomt
          rubrik="Sakfrågan hittades inte"
          text={`Inget ämnesområde med beteckningen ”${slug}” finns i Insikt.`}
          barn={
            <Link to="/sakfragor" className="text-sm underline">
              Till alla sakfrågor
            </Link>
          }
        />
      </div>
    );
  }

  const { sakfraga, arenden, voteringar, utskott } = query.data;

  return (
    <div>
      <Sidhuvud
        rubrik={sakfraga.namn}
        lead={sakfraga.beskrivning ?? "Ämnesingång i Insikt."}
        barn={
          <div className="flex flex-wrap items-center gap-3">
            <Bevaka typ="sakfragor" id={sakfraga.slug} etikett={sakfraga.namn} />
            <Link
              to="/jamfor"
              search={{ sakfraga: sakfraga.slug, typ: "parti" }}
              className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
            >
              Jämför partier inom {sakfraga.namn} →
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
        <EgenBerakning>
          Ämnesindelningen är Insikts egen kategorisering. Ärenden kopplas hit via utskott (
          {utskott.join(", ")}) och automatiska textanalyser.
        </EgenBerakning>

        {/* Senaste voteringar */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-normal">Senaste voteringar inom {sakfraga.namn}</h2>
            <Link
              to="/voteringar"
              search={{ sakfraga: sakfraga.slug }}
              className="text-xs text-[var(--accent-insikt)] hover:underline"
            >
              Alla voteringar i ämnet →
            </Link>
          </div>

          {voteringar.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Inga voteringar registrerade inom denna sakfråga ännu.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {voteringar.map((v) => (
                <article
                  key={v.id}
                  className="rounded-lg border border-border/80 bg-background p-4 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {v.beteckning} · punkt {v.punkt} · {datum(v.datum)}
                    </span>
                    <span className="font-medium text-foreground">
                      Utfall: {v.vinnare ? `${v.vinnare} vann` : "Utfall saknas"}
                    </span>
                  </div>

                  <h3 className="mt-1.5 font-medium text-foreground">
                    <Link to="/voteringar/$id" params={{ id: v.id }} className="hover:underline">
                      {rensaHtml(v.arenden?.titel ?? v.rubrik) || "Votering"}
                    </Link>
                  </h3>

                  {v.gallde ? (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {rensaHtml(v.gallde)}
                    </p>
                  ) : null}

                  <div className="mt-3">
                    <RostDiagram
                      ja={v.ja}
                      nej={v.nej}
                      avstar={v.avstar}
                      franvarande={v.franvarande}
                      kompakt
                    />
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Link
                      to="/voteringar/$id"
                      params={{ id: v.id }}
                      className="text-xs text-[var(--accent-insikt)] hover:underline"
                    >
                      Granska röster →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Ärenden och betänkanden */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h2 className="text-xl font-normal">Ärenden och betänkanden ({arenden.length})</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Utskottsbetänkanden och förslag som behandlats i riksdagen inom {sakfraga.namn}.
          </p>

          {arenden.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">Inga ärenden kopplade hit ännu.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {arenden.map((a) => (
                <Link
                  key={a.id}
                  to="/arenden/$id"
                  params={{ id: a.id }}
                  className="rounded-lg border border-border/80 bg-background p-4 text-xs transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-foreground">
                      {a.beteckning ?? a.id}
                    </span>
                    <span className="text-muted-foreground">{a.organ}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 font-medium text-foreground">
                    {a.titel ?? "Ärende"}
                  </p>
                  <span className="mt-3 block text-muted-foreground/80">{datum(a.datum)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
