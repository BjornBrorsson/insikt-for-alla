import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { z } from "zod";

import { listLedamoter, getFilterval } from "@/lib/insikt.functions";
import { ledamotsnamn, laddaNerCsv, csv } from "@/lib/format";
import { Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { LedamotKort, PartiMarke } from "@/components/insikt/delar";

const sokParams = z.object({
  q: z.string().optional().default(""),
  parti: z.string().optional().default(""),
  valkrets: z.string().optional().default(""),
  utskott: z.string().optional().default(""),
  tjanstgoring: z.string().optional().default("aktuella"),
  sortering: z.string().optional().default("namn"),
  vy: z.enum(["kort", "tabell"]).optional().default("kort"),
});

export const Route = createFileRoute("/ledamoter/")({
  validateSearch: sokParams,
  head: () => ({
    meta: [
      { title: "Ledamöter i Sveriges Riksdag — Insikt" },
      {
        name: "description",
        content:
          "Sök och filtrera bland riksdagens tjänstgörande och historiska ledamöter efter parti, valkrets och utskott.",
      },
    ],
  }),
  component: LedamoterLista,
});

function LedamoterLista() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [namnSok, setNamnSok] = useState(search.q || "");

  useEffect(() => {
    setNamnSok(search.q || "");
  }, [search.q]);

  const hamtaLedamoter = useServerFn(listLedamoter);
  const hamtaFilterval = useServerFn(getFilterval);

  const filtervalQuery = useQuery({
    queryKey: ["filterval"],
    queryFn: () => hamtaFilterval(),
  });

  const query = useQuery({
    queryKey: [
      "ledamoter",
      search.q,
      search.parti,
      search.valkrets,
      search.utskott,
      search.tjanstgoring,
      search.sortering,
    ],
    queryFn: () =>
      hamtaLedamoter({
        data: {
          q: search.q || "",
          parti: search.parti || "",
          valkrets: search.valkrets || "",
          utskott: search.utskott || "",
          tjanstgoring: search.tjanstgoring || "aktuella",
          sortering: search.sortering || "namn",
        },
      }),
  });

  function uppdateraFilter(andringar: Partial<z.infer<typeof sokParams>>) {
    navigate({
      to: "/ledamoter",
      search: (gammal) => ({ ...gammal, ...andringar }),
    });
  }

  function aterstallFilter() {
    setNamnSok("");
    navigate({
      to: "/ledamoter",
      search: {
        q: "",
        parti: "",
        valkrets: "",
        utskott: "",
        tjanstgoring: "aktuella",
        sortering: "namn",
        vy: search.vy || "kort",
      },
    });
  }

  function exporteraCsv() {
    if (!query.data) return;
    const rubriker = [
      "ID",
      "Förnamn",
      "Efternamn",
      "Parti",
      "Valkrets",
      "Status",
      "Födelseår",
      "Kön",
    ];
    const rader = query.data.ledamoter.map((l) => [
      l.id,
      l.fornamn,
      l.efternamn,
      l.parti ?? "",
      l.valkrets ?? "",
      l.status ?? "",
      l.fodd_ar ?? "",
      l.kon ?? "",
    ]);
    const fil = csv([rubriker, ...rader]);
    laddaNerCsv(`ledamoter_${new Date().toISOString().slice(0, 10)}.csv`, fil);
  }

  const aktivaFilterAntal =
    (search.q ? 1 : 0) +
    (search.parti ? 1 : 0) +
    (search.valkrets ? 1 : 0) +
    (search.utskott ? 1 : 0) +
    (search.tjanstgoring !== "aktuella" ? 1 : 0);

  return (
    <div>
      <Sidhuvud
        rubrik="Riksdagens ledamöter"
        lead="Sök och filtrera bland riksdagens 349 folkvalda ledamöter samt tidigare ledamöter. Granska deras uppdrag, valkretsar och rösthistorik."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Filterpanel */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Namnsökning */}
            <div>
              <label
                htmlFor="ledamot-sok"
                className="block text-xs font-medium text-muted-foreground"
              >
                Sök namn
              </label>
              <input
                id="ledamot-sok"
                type="search"
                value={namnSok}
                onChange={(e) => setNamnSok(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") uppdateraFilter({ q: namnSok.trim() });
                }}
                onBlur={() => uppdateraFilter({ q: namnSok.trim() })}
                placeholder="Förnamn eller efternamn …"
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Parti */}
            <div>
              <label
                htmlFor="filter-parti"
                className="block text-xs font-medium text-muted-foreground"
              >
                Parti
              </label>
              <select
                id="filter-parti"
                value={search.parti || ""}
                onChange={(e) => uppdateraFilter({ parti: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Alla partier</option>
                {filtervalQuery.data?.partier.map((p) => (
                  <option key={p.kod} value={p.kod}>
                    {p.namn} ({p.kod})
                  </option>
                ))}
              </select>
            </div>

            {/* Valkrets */}
            <div>
              <label
                htmlFor="filter-valkrets"
                className="block text-xs font-medium text-muted-foreground"
              >
                Valkrets
              </label>
              <select
                id="filter-valkrets"
                value={search.valkrets || ""}
                onChange={(e) => uppdateraFilter({ valkrets: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Alla valkretsar</option>
                {filtervalQuery.data?.valkretsar.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Tjänstgöringsstatus */}
            <div>
              <label
                htmlFor="filter-status"
                className="block text-xs font-medium text-muted-foreground"
              >
                Tjänstgöring
              </label>
              <select
                id="filter-status"
                value={search.tjanstgoring || "aktuella"}
                onChange={(e) => uppdateraFilter({ tjanstgoring: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="aktuella">Tjänstgörande (nuvarande)</option>
                <option value="historiska">Tidigare ledamöter</option>
                <option value="alla">Samtliga (historiska &amp; aktuella)</option>
              </select>
            </div>
          </div>

          {/* Utskott, sortering och återställning */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Utskottsfilter */}
              <div className="flex items-center gap-2">
                <label htmlFor="filter-utskott" className="text-xs text-muted-foreground">
                  Utskott:
                </label>
                <select
                  id="filter-utskott"
                  value={search.utskott || ""}
                  onChange={(e) => uppdateraFilter({ utskott: e.target.value })}
                  className="h-8 rounded border border-input bg-background px-2 text-xs"
                >
                  <option value="">Alla utskott</option>
                  {filtervalQuery.data?.utskott.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sortering */}
              <div className="flex items-center gap-2">
                <label htmlFor="filter-sortering" className="text-xs text-muted-foreground">
                  Sortera:
                </label>
                <select
                  id="filter-sortering"
                  value={search.sortering || "namn"}
                  onChange={(e) => uppdateraFilter({ sortering: e.target.value })}
                  className="h-8 rounded border border-input bg-background px-2 text-xs"
                >
                  <option value="namn">Efternamn</option>
                  <option value="parti">Parti, därefter efternamn</option>
                </select>
              </div>

              {aktivaFilterAntal > 0 ? (
                <button
                  type="button"
                  onClick={aterstallFilter}
                  className="text-xs text-[var(--accent-insikt)] hover:underline"
                >
                  Återställ alla filter ({aktivaFilterAntal})
                </button>
              ) : null}
            </div>

            {/* Vy och export */}
            <div className="flex items-center gap-2">
              <div className="flex rounded border border-input p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => uppdateraFilter({ vy: "kort" })}
                  aria-pressed={(search.vy || "kort") === "kort"}
                  className={`rounded px-2.5 py-1 ${
                    (search.vy || "kort") === "kort"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Kortvy
                </button>
                <button
                  type="button"
                  onClick={() => uppdateraFilter({ vy: "tabell" })}
                  aria-pressed={search.vy === "tabell"}
                  className={`rounded px-2.5 py-1 ${
                    search.vy === "tabell"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tabellvy
                </button>
              </div>

              <button
                type="button"
                onClick={exporteraCsv}
                className="rounded border border-input px-2.5 py-1 text-xs hover:bg-accent"
                title="Ladda ner visade ledamöter som CSV"
              >
                CSV ↗
              </button>
            </div>
          </div>
        </div>

        {/* Resultatsektion */}
        <div className="mt-8">
          {query.isPending ? (
            <Laddar text="Laddar ledamöter …" />
          ) : query.isError ? (
            <Fel fel={query.error} forsokIgen={() => query.refetch()} />
          ) : query.data.totalt === 0 ? (
            <Tomt
              rubrik="Inga ledamöter matchade sökningen"
              text="Prova att bredda filtren eller tömma sökordet."
              barn={
                <button
                  type="button"
                  onClick={aterstallFilter}
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
                  Visar {query.data.ledamoter.length} av {query.data.totalt} ledamöter
                </span>
                <span>Klicka på en ledamot för detaljer och rösthistorik</span>
              </div>

              {search.vy === "tabell" ? (
                /* Tabellvy */
                <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
                  <table aria-label="Riksdagens ledamöter" className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-[var(--yta)] text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Namn
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Parti
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Valkrets
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium text-right">
                          Åtgärd
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {query.data.ledamoter.map((l) => (
                        <tr key={l.id} className="hover:bg-accent/40">
                          <td className="px-4 py-3 font-medium">
                            <Link
                              to="/ledamoter/$id"
                              params={{ id: l.id }}
                              className="hover:underline flex items-center gap-2"
                            >
                              {l.bild_url_liten ? (
                                <img
                                  src={l.bild_url_liten}
                                  alt={`Porträtt av ${ledamotsnamn(l)}`}
                                  className="h-7 w-6 rounded object-cover"
                                />
                              ) : null}
                              <span>{ledamotsnamn(l)}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <PartiMarke kod={l.parti} />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {l.valkrets ?? "–"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {l.status ?? "–"}
                          </td>
                          <td className="px-4 py-3 text-right text-xs">
                            <Link
                              to="/ledamoter/$id"
                              params={{ id: l.id }}
                              className="text-[var(--accent-insikt)] hover:underline"
                            >
                              Granska →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Kortvy */
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {query.data.ledamoter.map((l) => (
                    <LedamotKort key={l.id} ledamot={l} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
