import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { z } from "zod";

import { listVoteringar, getVoteringsfilter } from "@/lib/insikt.functions";
import { datum, laddaNerCsv, csv, rensaHtml } from "@/lib/format";
import { Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { RostDiagram } from "@/components/insikt/delar";

const filterSchema = z.object({
  q: z.string().optional().default(""),
  rm: z.string().optional().default(""),
  organ: z.string().optional().default(""),
  sakfraga: z.string().optional().default(""),
  fran: z.string().optional().default(""),
  till: z.string().optional().default(""),
  sida: z.coerce.number().optional().default(1),
});

export const Route = createFileRoute("/voteringar/")({
  validateSearch: filterSchema,
  head: () => ({
    meta: [
      { title: "Voteringar & beslut — Insikt" },
      {
        name: "description",
        content:
          "Sök och granska riksdagens voteringar och beslut. Se vad omröstningarna gällde och hur partierna röstade.",
      },
    ],
  }),
  component: VoteringarLista,
});

function VoteringarLista() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [sokText, setSokText] = useState(search.q || "");

  useEffect(() => {
    setSokText(search.q || "");
  }, [search.q]);

  const hamtaVoteringar = useServerFn(listVoteringar);
  const hamtaFilter = useServerFn(getVoteringsfilter);

  const filterQuery = useQuery({
    queryKey: ["voteringsfilter"],
    queryFn: () => hamtaFilter(),
  });

  const query = useQuery({
    queryKey: [
      "voteringar",
      search.q,
      search.rm,
      search.organ,
      search.sakfraga,
      search.fran,
      search.till,
      search.sida,
    ],
    queryFn: () =>
      hamtaVoteringar({
        data: {
          q: search.q || "",
          rm: search.rm || "",
          organ: search.organ || "",
          sakfraga: search.sakfraga || "",
          fran: search.fran || "",
          till: search.till || "",
          sida: search.sida || 1,
        },
      }),
  });

  function uppdatera(andringar: Partial<z.infer<typeof filterSchema>>) {
    navigate({
      to: "/voteringar",
      search: (gammal) => ({ ...gammal, ...andringar, sida: andringar.sida ?? 1 }),
    });
  }

  function aterstall() {
    setSokText("");
    navigate({
      to: "/voteringar",
      search: {
        q: "",
        rm: "",
        organ: "",
        sakfraga: "",
        fran: "",
        till: "",
        sida: 1,
      },
    });
  }

  function exporteraCsv() {
    if (!query.data) return;
    const rubriker = [
      "ID",
      "Datum",
      "Beteckning",
      "Punkt",
      "Titel",
      "Vad det gällde",
      "Ja",
      "Nej",
      "Avstår",
      "Frånvarande",
      "Utfall",
    ];
    const rader = query.data.voteringar.map((v) => [
      v.id,
      v.datum ?? "",
      v.beteckning ?? "",
      v.punkt ?? "",
      rensaHtml(v.arenden?.titel ?? v.rubrik),
      rensaHtml(v.gallde),
      v.ja,
      v.nej,
      v.avstar,
      v.franvarande,
      v.vinnare ?? "",
    ]);
    laddaNerCsv(
      `voteringar_${new Date().toISOString().slice(0, 10)}.csv`,
      csv([rubriker, ...rader]),
    );
  }

  const perSida = query.data?.perSida || 25;
  const totalaSidor = query.data ? Math.ceil(query.data.totalt / perSida) : 1;
  const nuvarandeSida = search.sida || 1;

  const aktivaFilter =
    (search.q ? 1 : 0) +
    (search.rm ? 1 : 0) +
    (search.organ ? 1 : 0) +
    (search.sakfraga ? 1 : 0) +
    (search.fran ? 1 : 0) +
    (search.till ? 1 : 0);

  return (
    <div>
      <Sidhuvud
        rubrik="Voteringar och beslut"
        lead="Sök bland riksdagens tusentals registrerade omröstningar. Förstå vad besluten handlade om, vad en Ja- eller Nej-röst innebar och hur utgången blev."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Filter */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Textsökning */}
            <div>
              <label htmlFor="vot-sok" className="block text-xs font-medium text-muted-foreground">
                Sök i rubrik eller beteckning
              </label>
              <input
                id="vot-sok"
                type="search"
                value={sokText}
                onChange={(e) => setSokText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") uppdatera({ q: sokText.trim() });
                }}
                onBlur={() => uppdatera({ q: sokText.trim() })}
                placeholder="T.ex. FiU1, miljö, skatter …"
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Riksmöte */}
            <div>
              <label
                htmlFor="filter-rm"
                className="block text-xs font-medium text-muted-foreground"
              >
                Riksmöte (arbetsår)
              </label>
              <select
                id="filter-rm"
                value={search.rm || ""}
                onChange={(e) => uppdatera({ rm: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Alla riksmöten</option>
                {filterQuery.data?.riksmoten.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Utskott */}
            <div>
              <label
                htmlFor="filter-organ"
                className="block text-xs font-medium text-muted-foreground"
              >
                Utskott
              </label>
              <select
                id="filter-organ"
                value={search.organ || ""}
                onChange={(e) => uppdatera({ organ: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Alla utskott</option>
                {filterQuery.data?.utskott.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Sakfråga */}
            <div>
              <label
                htmlFor="filter-sakfraga"
                className="block text-xs font-medium text-muted-foreground"
              >
                Sakfråga (Insikts ämne)
              </label>
              <select
                id="filter-sakfraga"
                value={search.sakfraga || ""}
                onChange={(e) => uppdatera({ sakfraga: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Alla sakfrågor</option>
                {filterQuery.data?.sakfragor.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.namn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="flex items-center gap-3 text-xs">
              {aktivaFilter > 0 ? (
                <button
                  type="button"
                  onClick={aterstall}
                  className="text-[var(--accent-insikt)] hover:underline"
                >
                  Återställ filter ({aktivaFilter})
                </button>
              ) : (
                <span className="text-muted-foreground">Inga aktiva filter</span>
              )}
            </div>

            <button
              type="button"
              onClick={exporteraCsv}
              className="rounded border border-input px-2.5 py-1 text-xs hover:bg-accent"
            >
              Exportera visade till CSV ↗
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="mt-8">
          {query.isPending ? (
            <Laddar text="Hämtar voteringar …" />
          ) : query.isError ? (
            <Fel fel={query.error} forsokIgen={() => query.refetch()} />
          ) : query.data.totalt === 0 ? (
            <Tomt
              rubrik="Inga voteringar matchade sökningen"
              text="Prova att välja ett annat riksmöte eller nollställ filtren."
              barn={
                <button
                  type="button"
                  onClick={aterstall}
                  className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Återställ filter
                </button>
              }
            />
          ) : (
            <div>
              <div className="mb-4 flex items-baseline justify-between text-xs text-muted-foreground">
                <span>
                  Totalt {query.data.totalt} voteringar (sida {nuvarandeSida} av {totalaSidor})
                </span>
                <span>Klicka för att granska alla enskilda röster</span>
              </div>

              <div className="space-y-3">
                {query.data.voteringar.map((v) => (
                  <article
                    key={v.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-2xs transition-shadow hover:shadow-xs"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-foreground">
                          {v.beteckning ?? "Beteckning saknas"}
                        </span>
                        <span>· punkt {v.punkt ?? "–"}</span>
                        <span>· {v.arenden?.organ ?? "Utskott"}</span>
                        <span>· {datum(v.datum)}</span>
                      </div>

                      <span className="font-medium text-foreground">
                        Utfall: {v.vinnare ? `${v.vinnare} vann` : "Utfall saknas"}
                      </span>
                    </div>

                    <h2 className="mt-2 text-lg font-medium">
                      <Link
                        to="/voteringar/$id"
                        params={{ id: v.id }}
                        className="hover:underline text-foreground"
                      >
                        {rensaHtml(v.arenden?.titel ?? v.rubrik) || "Votering"}
                      </Link>
                    </h2>

                    {v.gallde ? (
                      <p className="mt-1.5 text-sm text-foreground/90">{rensaHtml(v.gallde)}</p>
                    ) : null}

                    <div className="mt-4">
                      <RostDiagram
                        ja={v.ja}
                        nej={v.nej}
                        avstar={v.avstar}
                        franvarande={v.franvarande}
                        kompakt
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between border-t border-border/60 pt-3 text-xs">
                      {v.arende_id ? (
                        <Link
                          to="/arenden/$id"
                          params={{ id: v.arende_id }}
                          className="text-muted-foreground hover:underline"
                        >
                          Se hela betänkandet ({v.beteckning}) →
                        </Link>
                      ) : (
                        <span />
                      )}

                      <Link
                        to="/voteringar/$id"
                        params={{ id: v.id }}
                        className="font-medium text-[var(--accent-insikt)] hover:underline"
                      >
                        Granska alla enskilda ledamotsröster →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {/* Paginering */}
              {totalaSidor > 1 ? (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={nuvarandeSida <= 1}
                    onClick={() => uppdatera({ sida: nuvarandeSida - 1 })}
                    className="rounded border border-input px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-40"
                  >
                    ← Föregående
                  </button>
                  <span className="text-xs text-muted-foreground px-2">
                    Sida {nuvarandeSida} av {totalaSidor}
                  </span>
                  <button
                    type="button"
                    disabled={nuvarandeSida >= totalaSidor}
                    onClick={() => uppdatera({ sida: nuvarandeSida + 1 })}
                    className="rounded border border-input px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-40"
                  >
                    Nästa →
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
