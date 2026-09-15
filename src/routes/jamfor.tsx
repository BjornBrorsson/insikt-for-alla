import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";

import {
  jamforLedamoter,
  jamforPartier,
  listPartier,
  listLedamoter,
  listSakfragor,
} from "@/lib/insikt.functions";
import { datum, datumKort, laddaNerCsv, csv, procent, ledamotsnamn, antal } from "@/lib/format";
import { EgenBerakning, Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { PartiMarke, RostMarke } from "@/components/insikt/delar";

const jamforParams = z.object({
  typ: z.enum(["parti", "ledamot"]).optional().default("parti"),
  a: z.string().optional().default(""),
  b: z.string().optional().default(""),
  fran: z.string().optional().default(""),
  till: z.string().optional().default(""),
  sakfraga: z.string().optional().default(""),
});

export const Route = createFileRoute("/jamfor")({
  validateSearch: jamforParams,
  head: () => ({
    meta: [
      { title: "Jämför partier och ledamöter — Insikt" },
      {
        name: "description",
        content:
          "Jämför hur lika två partier eller två riksdagsledamöter röstar i kammaren. Se procentuell röstlikhet och granska hela underlaget votering för votering.",
      },
    ],
  }),
  component: JamforSida,
});

function JamforSida() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const typ = search.typ || "parti";
  const a = search.a || (typ === "parti" ? "S" : "");
  const b = search.b || (typ === "parti" ? "M" : "");
  const fran = search.fran || "";
  const till = search.till || "";
  const sakfraga = search.sakfraga || "";

  const hamtaPartier = useServerFn(listPartier);
  const hamtaLedamoter = useServerFn(listLedamoter);
  const hamtaSakfragor = useServerFn(listSakfragor);
  const hamtaJamforPartier = useServerFn(jamforPartier);
  const hamtaJamforLedamoter = useServerFn(jamforLedamoter);

  const partierQuery = useQuery({ queryKey: ["partier"], queryFn: () => hamtaPartier() });
  const ledamoterQuery = useQuery({
    queryKey: ["ledamoter-val"],
    queryFn: () => hamtaLedamoter({ data: { tjanstgoring: "aktuella", sortering: "namn" } }),
  });
  const sakfragorQuery = useQuery({ queryKey: ["sakfragor"], queryFn: () => hamtaSakfragor() });

  // Jämförelseanrop
  const partiJamforelse = useQuery({
    queryKey: ["jamfor-partier", a, b, fran, till, sakfraga],
    queryFn: () => hamtaJamforPartier({ data: { a, b, fran, till, sakfraga } }),
    enabled: typ === "parti" && !!a && !!b && a !== b,
  });

  const ledamotJamforelse = useQuery({
    queryKey: ["jamfor-ledamoter", a, b, fran, till, sakfraga],
    queryFn: () => hamtaJamforLedamoter({ data: { a, b, fran, till, sakfraga } }),
    enabled: typ === "ledamot" && !!a && !!b && a !== b,
  });

  function uppdatera(andringar: Partial<z.infer<typeof jamforParams>>) {
    navigate({
      to: "/jamfor",
      search: (gammal) => ({ ...gammal, ...andringar }),
    });
  }

  function exporteraCsv() {
    if (typ === "parti" && partiJamforelse.data) {
      const rubriker = ["Votering ID", "Datum", "Beteckning", "Titel", `${a} majoritet`, `${b} majoritet`, "Jämförbar", "Lika"];
      const rader = partiJamforelse.data.rader.map((r) => [
        r.votering_id,
        r.datum ?? "",
        r.beteckning ?? "",
        r.titel ?? "",
        r.majoritet_a ?? "",
        r.majoritet_b ?? "",
        r.jamforbar ? "Ja" : "Nej",
        r.lika ? "Ja" : "Nej",
      ]);
      laddaNerCsv(`jamforelse_${a}_${b}.csv`, csv([rubriker, ...rader]));
    } else if (typ === "ledamot" && ledamotJamforelse.data) {
      const namnA = ledamotJamforelse.data.a ? ledamotsnamn(ledamotJamforelse.data.a) : a;
      const namnB = ledamotJamforelse.data.b ? ledamotsnamn(ledamotJamforelse.data.b) : b;
      const rubriker = ["Votering ID", "Datum", "Beteckning", "Titel", namnA, namnB, "Jämförbar", "Lika"];
      const rader = ledamotJamforelse.data.rader.map((r) => [
        r.votering_id,
        r.datum ?? "",
        r.beteckning ?? "",
        r.titel ?? "",
        r.rost_a,
        r.rost_b,
        r.jamforbar ? "Ja" : "Nej",
        r.lika ? "Ja" : "Nej",
      ]);
      laddaNerCsv(`jamforelse_ledamoter_${a}_${b}.csv`, csv([rubriker, ...rader]));
    }
  }

  return (
    <div>
      <Sidhuvud
        rubrik="Jämför partier eller ledamöter"
        lead="Se hur ofta två partier eller två ledamöter tryckt på samma knapp i riksdagens voteringar — med hela underlaget öppet rad för rad."
        barn={
          <div className="flex rounded-md border border-input bg-background p-1 text-sm max-w-fit">
            <button
              type="button"
              onClick={() =>
                uppdatera({
                  typ: "parti",
                  a: a || "S",
                  b: b || "M",
                })
              }
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                typ === "parti"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Parti mot parti
            </button>
            <button
              type="button"
              onClick={() =>
                uppdatera({
                  typ: "ledamot",
                  a: "",
                  b: "",
                })
              }
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                typ === "ledamot"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ledamot mot ledamot
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Väljarpanel */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Väljare A */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {typ === "parti" ? "Välj första partiet (A)" : "Välj första ledamoten (A)"}
              </label>
              {typ === "parti" ? (
                <select
                  value={a}
                  onChange={(e) => uppdatera({ a: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Välj parti …</option>
                  {partierQuery.data?.map((p) => (
                    <option key={p.kod} value={p.kod} disabled={p.kod === b}>
                      {p.namn} ({p.kod})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={a}
                  onChange={(e) => uppdatera({ a: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Välj ledamot …</option>
                  {ledamoterQuery.data?.ledamoter.map((l) => (
                    <option key={l.id} value={l.id} disabled={l.id === b}>
                      {ledamotsnamn(l)} ({l.parti ?? "–"}, {l.valkrets ?? "–"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Väljare B */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {typ === "parti" ? "Välj andra partiet (B)" : "Välj andra ledamoten (B)"}
              </label>
              {typ === "parti" ? (
                <select
                  value={b}
                  onChange={(e) => uppdatera({ b: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Välj parti …</option>
                  {partierQuery.data?.map((p) => (
                    <option key={p.kod} value={p.kod} disabled={p.kod === a}>
                      {p.namn} ({p.kod})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={b}
                  onChange={(e) => uppdatera({ b: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Välj ledamot …</option>
                  {ledamoterQuery.data?.ledamoter.map((l) => (
                    <option key={l.id} value={l.id} disabled={l.id === a}>
                      {ledamotsnamn(l)} ({l.parti ?? "–"}, {l.valkrets ?? "–"})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Filter för sakfråga och datum */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4 text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="jamfor-sakfraga" className="text-muted-foreground">
                Begränsa till sakfråga:
              </label>
              <select
                id="jamfor-sakfraga"
                value={sakfraga}
                onChange={(e) => uppdatera({ sakfraga: e.target.value })}
                className="h-8 rounded border border-input bg-background px-2 text-xs"
              >
                <option value="">Alla sakfrågor</option>
                {sakfragorQuery.data?.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.namn}
                  </option>
                ))}
              </select>
            </div>

            {sakfraga ? (
              <button
                type="button"
                onClick={() => uppdatera({ sakfraga: "" })}
                className="text-[var(--accent-insikt)] hover:underline"
              >
                Rensa sakfrågefilter
              </button>
            ) : null}
          </div>
        </div>

        {/* Resultat */}
        {!a || !b || a === b ? (
          <Tomt
            rubrik="Välj två olika parter att jämföra"
            text="Välj två partier eller två ledamöter i menyerna ovan för att beräkna deras röstlikhet."
          />
        ) : typ === "parti" ? (
          /* Parti mot parti */
          partiJamforelse.isPending ? (
            <Laddar text={`Jämför ${a} och ${b} …`} />
          ) : partiJamforelse.isError ? (
            <Fel fel={partiJamforelse.error} forsokIgen={() => partiJamforelse.refetch()} />
          ) : (
            <div className="space-y-8">
              {/* Likhetskort */}
              <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-normal">
                      Röstlikhet mellan {a} och {b}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Baserat på partiernas respektive majoritetsröst i varje omröstning.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-4xl font-normal text-foreground">
                      {procent(partiJamforelse.data.lika, partiJamforelse.data.jamforbara)}
                    </span>
                    <p className="text-xs text-muted-foreground">likhet i jämförbara voteringar</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 rounded-lg bg-[var(--yta)] p-4 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground block">Gemensamma voteringar</span>
                    <strong className="text-sm font-medium">{antal(partiJamforelse.data.totalt)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Jämförbara (båda hade majoritetsröst)</span>
                    <strong className="text-sm font-medium">{antal(partiJamforelse.data.jamforbara)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Röstade likadant</span>
                    <strong className="text-sm font-medium">{antal(partiJamforelse.data.lika)}</strong>
                  </div>
                </div>

                <div className="mt-4">
                  <EgenBerakning>
                    Röstlikhet beräknas som andelen voteringar där båda partier haft en entydig majoritetsröst
                    och båda majoritetsrösterna varit identiska (båda Ja, båda Nej eller båda Avstår).
                    Måttet beskriver formell röstlikhet, inte politiska motiv eller ideologiskt samarbete.
                  </EgenBerakning>
                </div>
              </section>

              {/* Underlagstabell */}
              <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-normal">Underlag votering för votering</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Visar upp till 300 senaste voteringar med respektive partis majoritetsröst.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={exporteraCsv}
                    className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Exportera jämförelse till CSV ↗
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-[var(--yta)] text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Datum</th>
                        <th className="px-4 py-3 font-medium">Beteckning &amp; titel</th>
                        <th className="px-4 py-3 font-medium">{a}</th>
                        <th className="px-4 py-3 font-medium">{b}</th>
                        <th className="px-4 py-3 font-medium text-right">Resultat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {partiJamforelse.data.rader.map((r) => (
                        <tr key={r.votering_id} className="hover:bg-accent/40 text-xs">
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {datumKort(r.datum)}
                          </td>
                          <td className="px-4 py-2.5 max-w-xs">
                            <Link
                              to="/voteringar/$id"
                              params={{ id: r.votering_id }}
                              className="font-medium hover:underline block truncate text-foreground"
                            >
                              {r.beteckning ? `${r.beteckning} p.${r.punkt}: ` : ""}{r.titel ?? "Votering"}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5">
                            {r.majoritet_a ? (
                              <RostMarke rost={r.majoritet_a} />
                            ) : (
                              <span className="text-muted-foreground/60">–</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {r.majoritet_b ? (
                              <RostMarke rost={r.majoritet_b} />
                            ) : (
                              <span className="text-muted-foreground/60">–</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {!r.jamforbar ? (
                              <span className="text-muted-foreground/60">Ej jämförbar</span>
                            ) : r.lika ? (
                              <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                                Lika
                              </span>
                            ) : (
                              <span className="rounded bg-rose-500/10 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
                                Olika
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )
        ) : (
          /* Ledamot mot ledamot */
          ledamotJamforelse.isPending ? (
            <Laddar text="Jämför ledamöterna …" />
          ) : ledamotJamforelse.isError ? (
            <Fel fel={ledamotJamforelse.error} forsokIgen={() => ledamotJamforelse.refetch()} />
          ) : (
            <div className="space-y-8">
              {/* Likhetskort */}
              <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-normal">
                      Röstlikhet mellan{" "}
                      {ledamotJamforelse.data.a ? ledamotsnamn(ledamotJamforelse.data.a) : "A"}{" "}
                      och{" "}
                      {ledamotJamforelse.data.b ? ledamotsnamn(ledamotJamforelse.data.b) : "B"}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Baserat på hur respektive ledamot faktiskt röstade i kammaren.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-4xl font-normal text-foreground">
                      {procent(ledamotJamforelse.data.lika, ledamotJamforelse.data.jamforbara)}
                    </span>
                    <p className="text-xs text-muted-foreground">likhet i jämförbara voteringar</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 rounded-lg bg-[var(--yta)] p-4 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground block">Gemensamma voteringar</span>
                    <strong className="text-sm font-medium">{antal(ledamotJamforelse.data.totalt)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Jämförbara (båda röstade Ja/Nej/Avstår)</span>
                    <strong className="text-sm font-medium">{antal(ledamotJamforelse.data.jamforbara)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Röstade likadant</span>
                    <strong className="text-sm font-medium">{antal(ledamotJamforelse.data.lika)}</strong>
                  </div>
                </div>

                <div className="mt-4">
                  <EgenBerakning>
                    Frånvaro i omröstningar exkluderas ur likhetsberäkningen (ledamoten kan vara kvittad
                    eller upptagen med officiella uppdrag).
                  </EgenBerakning>
                </div>
              </section>

              {/* Underlagstabell */}
              <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-normal">Underlag votering för votering</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Granska hur respektive ledamot röstade i varje enskild omröstning.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={exporteraCsv}
                    className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Exportera jämförelse till CSV ↗
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-[var(--yta)] text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Datum</th>
                        <th className="px-4 py-3 font-medium">Beteckning &amp; titel</th>
                        <th className="px-4 py-3 font-medium">
                          {ledamotJamforelse.data.a ? ledamotsnamn(ledamotJamforelse.data.a) : "A"}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {ledamotJamforelse.data.b ? ledamotsnamn(ledamotJamforelse.data.b) : "B"}
                        </th>
                        <th className="px-4 py-3 font-medium text-right">Resultat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ledamotJamforelse.data.rader.map((r) => (
                        <tr key={r.votering_id} className="hover:bg-accent/40 text-xs">
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {datumKort(r.datum)}
                          </td>
                          <td className="px-4 py-2.5 max-w-xs">
                            <Link
                              to="/voteringar/$id"
                              params={{ id: r.votering_id }}
                              className="font-medium hover:underline block truncate text-foreground"
                            >
                              {r.beteckning ? `${r.beteckning} p.${r.punkt}: ` : ""}{r.titel ?? "Votering"}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5">
                            <RostMarke rost={r.rost_a} />
                          </td>
                          <td className="px-4 py-2.5">
                            <RostMarke rost={r.rost_b} />
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {!r.jamforbar ? (
                              <span className="text-muted-foreground/60">Ej jämförbar</span>
                            ) : r.lika ? (
                              <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                                Lika
                              </span>
                            ) : (
                              <span className="rounded bg-rose-500/10 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
                                Olika
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )
        )}
      </div>
    </div>
  );
}
