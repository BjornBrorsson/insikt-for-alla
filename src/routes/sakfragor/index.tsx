import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listSakfragor } from "@/lib/insikt.functions";
import { EgenBerakning, Fel, Laddar, Sidhuvud } from "@/components/insikt/tillstand";

export const Route = createFileRoute("/sakfragor/")({
  head: () => ({
    meta: [
      { title: "Sakfrågor & ämnesingångar — Insikt" },
      {
        name: "description",
        content:
          "Utforska riksdagens beslut och voteringar uppdelat på 10 centrala samhällsområden: klimat, skola, sjukvård, ekonomi, försvar med mera.",
      },
    ],
  }),
  component: SakfragorLista,
});

function SakfragorLista() {
  const hamtaSakfragor = useServerFn(listSakfragor);
  const query = useQuery({ queryKey: ["sakfragor"], queryFn: () => hamtaSakfragor() });

  return (
    <div>
      <Sidhuvud
        rubrik="Sakfrågor"
        lead="Riksdagens dokument är ofta ordnade efter betänkandenummer snarare än ämnen. Insikt har därför skapat 10 tematiska ingångar så att du enkelt kan följa de frågor du bryr dig mest om."
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6">
          <EgenBerakning>
            Ämneskategoriseringen är Insikts egen modell baserad på ansvarigt utskott och nyckelord
            i betänkandenas rubriker. Den utgör inte riksdagens officiella klassificering.
          </EgenBerakning>
        </div>

        {query.isPending ? (
          <Laddar text="Hämtar sakfrågor …" />
        ) : query.isError ? (
          <Fel fel={query.error} forsokIgen={() => query.refetch()} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {query.data!.map((s) => (
              <Link
                key={s.slug}
                to="/sakfragor/$slug"
                params={{ slug: s.slug }}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-2xs transition-all hover:bg-accent/40 hover:shadow-xs"
              >
                <div>
                  <h2 className="text-xl font-medium text-foreground group-hover:text-[var(--accent-insikt)]">
                    {s.namn}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {s.beskrivning}
                  </p>

                  {s.utskott.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {s.utskott.map((u) => (
                        <span
                          key={u}
                          className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                        >
                          {u}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
                  <span className="text-muted-foreground">Ärenden &amp; voteringar</span>
                  <span className="font-medium text-[var(--accent-insikt)] group-hover:translate-x-0.5 transition-transform">
                    Utforska ämnet →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
