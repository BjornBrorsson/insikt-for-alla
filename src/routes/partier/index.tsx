import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listPartier } from "@/lib/insikt.functions";
import { Fel, Laddar, Sidhuvud } from "@/components/insikt/tillstand";
import { PartiMarke } from "@/components/insikt/delar";

export const Route = createFileRoute("/partier/")({
  head: () => ({
    meta: [
      { title: "Partier i Sveriges Riksdag — Insikt" },
      {
        name: "description",
        content:
          "Översikt över riksdagens partier, deras mandat, sammanhållning i voteringar och hur de röstar i förhållande till varandra.",
      },
    ],
  }),
  component: PartierLista,
});

function PartierLista() {
  const hamtaPartier = useServerFn(listPartier);
  const query = useQuery({ queryKey: ["partier"], queryFn: () => hamtaPartier() });

  const totaltTjanstgorande = (query.data ?? []).reduce((acc, p) => acc + p.tjanstgorande, 0);

  return (
    <div>
      <Sidhuvud
        rubrik="Partier i riksdagen"
        lead="Sveriges riksdag består av 349 ledamöter fördelade på åtta riksdagspartier samt eventuella partilösa ledamöter. Välj ett parti för att granska dess sammanhållning, voteringshistorik och röstlikhet med andra partier."
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {query.isPending ? (
          <Laddar text="Hämtar partier …" />
        ) : query.isError ? (
          <Fel fel={query.error} forsokIgen={() => query.refetch()} />
        ) : (
          <div>
            {/* Sammanställning av kammaren */}
            <section className="mb-10 rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-normal">Kammarens sammansättning</h2>
                <span className="text-xs text-muted-foreground">
                  Totalt {totaltTjanstgorande} av 349 mandat tillsatta
                </span>
              </div>

              {/* Visuell representation */}
              <div
                className="mt-4 flex h-4 w-full overflow-hidden rounded-full border border-border"
                role="img"
                aria-label="Kammarens mandatfördelning"
              >
                {query.data!.map((p) =>
                  p.tjanstgorande > 0 ? (
                    <span
                      key={p.kod}
                      style={{
                        width: `${(p.tjanstgorande / (totaltTjanstgorande || 349)) * 100}%`,
                        backgroundColor: p.farg ?? "#888888",
                      }}
                      title={`${p.namn}: ${p.tjanstgorande} mandat`}
                    />
                  ) : null,
                )}
              </div>
            </section>

            {/* Partikort */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {query.data!.map((p) => (
                <Link
                  key={p.kod}
                  to="/partier/$kod"
                  params={{ kod: p.kod }}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-2xs transition-all hover:bg-accent/40 hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <PartiMarke kod={p.kod} farg={p.farg} />
                      <span className="rounded bg-muted px-2.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                        {p.kod}
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-medium text-foreground group-hover:text-[var(--accent-insikt)]">
                      {p.namn}
                    </h2>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
                    <span className="font-medium text-foreground">
                      {p.tjanstgorande} mandat i kammaren
                    </span>
                    <span className="text-[var(--accent-insikt)] group-hover:translate-x-0.5 transition-transform">
                      Granska partiet →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
