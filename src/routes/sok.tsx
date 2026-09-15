import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { z } from "zod";

import { sok } from "@/lib/insikt.functions";
import { datum, ledamotsnamn } from "@/lib/format";
import { Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { LedamotKort, PartiMarke } from "@/components/insikt/delar";

const sokParams = z.object({
  q: z.string().optional().default(""),
});

export const Route = createFileRoute("/sok")({
  validateSearch: sokParams,
  head: () => ({
    meta: [
      { title: "Sök ledamöter, partier och ärenden — Insikt" },
      {
        name: "description",
        content:
          "Sök i riksdagens register efter ledamöter, partier, propositioner och utskottsbetänkanden.",
      },
    ],
  }),
  component: SokSida,
});

function SokSida() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [inmatning, setInmatning] = useState(search.q || "");

  useEffect(() => {
    setInmatning(search.q || "");
  }, [search.q]);

  const sokFn = useServerFn(sok);
  const q = (search.q || "").trim();

  const query = useQuery({
    queryKey: ["sok", q],
    queryFn: () => sokFn({ data: { q } }),
    enabled: q.length >= 2,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inmatning.trim().length >= 2) {
      navigate({ to: "/sok", search: { q: inmatning.trim() } });
    }
  }

  const harTraffar =
    query.data &&
    (query.data.ledamoter.length > 0 ||
      query.data.partier.length > 0 ||
      query.data.arenden.length > 0);

  return (
    <div>
      <Sidhuvud
        rubrik="Sök i Insikt"
        lead="Hitta snabbt bland riksdagens 349 ledamöter, samtliga partier och tusentals betänkanden och beslut."
        barn={
          <form onSubmit={handleSubmit} className="flex max-w-xl gap-2">
            <input
              type="search"
              value={inmatning}
              onChange={(e) => setInmatning(e.target.value)}
              placeholder="Sök ledamot, parti, utskott eller beteckning (t.ex. FiU1) …"
              className="h-11 flex-1 rounded-md border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sök
            </button>
          </form>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {!q || q.length < 2 ? (
          <div className="rounded-xl border border-dashed border-border bg-[var(--yta)] p-10 text-center">
            <h2 className="text-xl font-normal">Skriv minst 2 tecken för att söka</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Du kan söka på förnamn, efternamn, valkrets, partinamn eller dokumentbeteckningar som
              t.ex. <em>2024/25:JuU1</em>.
            </p>
          </div>
        ) : query.isPending ? (
          <Laddar text={`Söker efter ”${q}” …`} />
        ) : query.isError ? (
          <Fel fel={query.error} forsokIgen={() => query.refetch()} />
        ) : !harTraffar ? (
          <Tomt
            rubrik={`Inga träffar för ”${q}”`}
            text="Vi hittade inga ledamöter, partier eller ärenden som matchar sökordet. Kontrollera stavningen eller prova med ett bredare ord."
          />
        ) : (
          <div className="space-y-12">
            {/* Partier */}
            {query.data!.partier.length > 0 ? (
              <section>
                <h2 className="text-2xl font-normal">
                  Partier ({query.data!.partier.length})
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {query.data!.partier.map((p) => (
                    <Link
                      key={p.kod}
                      to="/partier/$kod"
                      params={{ kod: p.kod }}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
                    >
                      <PartiMarke kod={p.kod} farg={p.farg} />
                      <span className="font-medium text-foreground">{p.namn}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Ledamöter */}
            {query.data!.ledamoter.length > 0 ? (
              <section>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-2xl font-normal">
                    Ledamöter ({query.data!.ledamoter.length})
                  </h2>
                  <Link
                    to="/ledamoter"
                    search={{ q }}
                    className="text-sm text-[var(--accent-insikt)] hover:underline"
                  >
                    Visa i ledamotskatalogen →
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {query.data!.ledamoter.map((l) => (
                    <LedamotKort key={l.id} ledamot={l} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* Ärenden och betänkanden */}
            {query.data!.arenden.length > 0 ? (
              <section>
                <h2 className="text-2xl font-normal">
                  Ärenden &amp; betänkanden ({query.data!.arenden.length})
                </h2>
                <div className="mt-4 space-y-3">
                  {query.data!.arenden.map((a) => (
                    <Link
                      key={a.id}
                      to="/arenden/$id"
                      params={{ id: a.id }}
                      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-medium">
                          {a.beteckning ?? a.id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {a.organ ?? "Utskott"} · {a.rm ?? "Riksmöte"} · {datum(a.datum)}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-foreground">{a.titel ?? "Ärende"}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
