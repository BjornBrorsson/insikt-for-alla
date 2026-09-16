import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getVoteringsfilter, listPartier, listValloften } from "@/lib/insikt.functions";
import { datum } from "@/lib/format";
import { EgenBerakning, Fel, Kalla, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { PartiMarke, RostDiagram, RostMarke } from "@/components/insikt/delar";

const MANDATPERIODER = [
  { id: "2022-2026", label: "2022–2026 (Nuvarande)" },
  { id: "2018-2022", label: "2018–2022" },
  { id: "2014-2018", label: "2014–2018" },
  { id: "alla", label: "Alla perioder" },
];

const filterSchema = z.object({
  parti: z.string().optional().default(""),
  sakfraga: z.string().optional().default(""),
  mandatperiod: z.string().optional().default("2022-2026"),
});

export const Route = createFileRoute("/valloften")({
  validateSearch: filterSchema,
  head: () => ({
    meta: [
      { title: "Vallöften – löften mot röstningsbeteende — Insikt" },
      {
        name: "description",
        content:
          "Vallöften ur partiernas valmanifest ställs mot partiernas faktiska röster i riksdagen över flera mandatperioder – med källa, röstresultat och förklaringar.",
      },
    ],
  }),
  component: ValloftenSida,
});

const RELATION: Record<string, string> = {
  direkt: "Direkt koppling",
  delvis: "Delvis koppling",
  relaterad: "Relaterad votering",
};

function riktningText(
  riktning: string | null,
  majoritet: string | null | undefined,
): { text: string; enig: boolean | null } {
  if (!riktning) {
    return {
      text: "Kopplingen saknar entydig riktning – löftet och voteringen kan inte jämföras rakt av.",
      enig: null,
    };
  }
  if (!majoritet)
    return { text: `Löftet pekar mot ${riktning}. Partiets röst saknas.`, enig: null };
  const enig = riktning === majoritet;
  return {
    text: enig
      ? `Löftet pekar mot ${riktning} – partiets majoritetsröst (${majoritet}) ligger i linje.`
      : `Löftet pekar mot ${riktning} – partiets majoritetsröst var ${majoritet}.`,
    enig,
  };
}

function ValloftenSida() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const hamtaValloften = useServerFn(listValloften);
  const hamtaPartier = useServerFn(listPartier);
  const hamtaFilter = useServerFn(getVoteringsfilter);

  const valdPeriod = search.mandatperiod || "2022-2026";

  const query = useQuery({
    queryKey: ["valloften", search.parti, search.sakfraga, valdPeriod],
    queryFn: () =>
      hamtaValloften({
        data: {
          parti: search.parti,
          sakfraga: search.sakfraga,
          mandatperiod: valdPeriod,
        },
      }),
  });
  const partierQuery = useQuery({ queryKey: ["partier"], queryFn: () => hamtaPartier() });
  const filterQuery = useQuery({ queryKey: ["voteringsfilter"], queryFn: () => hamtaFilter() });

  function uppdatera(andringar: Partial<z.infer<typeof filterSchema>>) {
    navigate({ to: "/valloften", search: (gammal) => ({ ...gammal, ...andringar }) });
  }

  return (
    <div>
      <Sidhuvud
        rubrik="Vallöften mot röstningsbeteende"
        lead="Löften ur partiernas officiella valmanifest (hämtade via Svensk Nationell Datatjänsts ViVill-arkiv för mandatperioderna 2022–2026, 2018–2022 och 2014–2018) ställs mot partiernas registrerade röster i riksdagen. En röst visar bara vad som registrerades i kammaren – inte varför. Förklaringarna under varje votering är möjliga tolkningar, inte slutsatser."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          {/* Tidsmaskin: Mandatperiod väljare */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tidsmaskin:
              </span>
              {MANDATPERIODER.map((mp) => {
                const aktiv = valdPeriod === mp.id;
                return (
                  <button
                    key={mp.id}
                    type="button"
                    onClick={() => uppdatera({ mandatperiod: mp.id })}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      aktiv
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {mp.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>Automatiserad synkning aktiv</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="vl-parti" className="block text-xs font-medium text-muted-foreground">
                Parti
              </label>
              <select
                id="vl-parti"
                value={search.parti}
                onChange={(e) => uppdatera({ parti: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Alla partier</option>
                {partierQuery.data?.map((p) => (
                  <option key={p.kod} value={p.kod}>
                    {p.namn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="vl-sakfraga"
                className="block text-xs font-medium text-muted-foreground"
              >
                Sakfråga
              </label>
              <select
                id="vl-sakfraga"
                value={search.sakfraga}
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
            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                {query.data ? `${query.data.length} löften` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {query.isPending ? (
            <Laddar text="Hämtar vallöften …" />
          ) : query.isError ? (
            <Fel fel={query.error} forsokIgen={() => query.refetch()} />
          ) : query.data.length === 0 ? (
            <Tomt rubrik="Inga vallöften hittades" text="Inga löften matchar de valda filtren." />
          ) : (
            query.data.map((l) => {
              const aktivaKopplingar = (l.kopplingar ?? []).filter((k) => k.votering);
              const mandatPeriodText =
                l.mandatperiod ||
                l.kalla?.mandatperiod ||
                (l.kalla?.val_ar === 2022
                  ? "2022–2026"
                  : l.kalla?.val_ar === 2018
                    ? "2018–2022"
                    : l.kalla?.val_ar === 2014
                      ? "2014–2018"
                      : `${l.kalla?.val_ar}`);

              return (
                <article
                  key={l.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <PartiMarke kod={l.parti} />
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {mandatPeriodText}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {l.kalla.titel} · val {l.kalla.val_ar}
                    </span>
                    <a
                      href={l.kalla.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ml-auto text-xs text-[var(--accent-insikt)] underline underline-offset-2 hover:opacity-80"
                    >
                      Källa: {l.kalla.utgivare} ↗
                    </a>
                  </div>

                  <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm italic">
                    ”{l.lofte}”
                  </blockquote>

                  {aktivaKopplingar.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {aktivaKopplingar.map((k) => {
                        const v = k.votering!;
                        const rikt = riktningText(k.riktning, k.partiRost?.majoritetsrost);
                        return (
                          <div
                            key={k.votering_id}
                            className="rounded-lg border border-border bg-[var(--yta)] p-4"
                          >
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="rounded border border-border bg-card px-1.5 py-0.5 font-medium">
                                {RELATION[k.relation] ?? k.relation}
                              </span>
                              <span className="text-muted-foreground">{datum(v.datum)}</span>
                              <span className="text-muted-foreground">
                                {v.beteckning}
                                {v.punkt ? ` · punkt ${v.punkt}` : ""}
                              </span>
                            </div>

                            <Link
                              to="/voteringar/$id"
                              params={{ id: v.id }}
                              className="mt-2 block text-sm font-medium text-[var(--accent-insikt)] hover:underline"
                            >
                              {v.arende_titel ?? v.rubrik ?? "Votering"}
                              {v.rubrik && v.arende_titel ? ` – ${v.rubrik}` : ""}
                            </Link>
                            {v.gallde ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Röstningen gällde: {v.gallde}
                              </p>
                            ) : null}

                            {k.partiRost ? (
                              <div className="mt-3">
                                <p className="text-sm">
                                  <PartiMarke kod={l.parti} /> röstade:{" "}
                                  <RostMarke rost={k.partiRost.majoritetsrost ?? "Utdelad"} />
                                </p>
                                <div className="mt-2 max-w-md">
                                  <RostDiagram
                                    ja={k.partiRost.ja}
                                    nej={k.partiRost.nej}
                                    avstar={k.partiRost.avstar}
                                    franvarande={k.partiRost.franvarande}
                                    kompakt
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-muted-foreground">
                                Partiets röstfördelning saknas för den här voteringen.
                              </p>
                            )}

                            <p
                              className={`mt-3 text-sm ${
                                rikt.enig === false ? "font-medium" : "text-muted-foreground"
                              }`}
                            >
                              {rikt.text}
                            </p>

                            {k.forklaringar.length ? (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Potentiella förklaringar:
                                </p>
                                <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                                  {k.forklaringar.map((f, i) => (
                                    <li key={i}>{f}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            <div className="mt-3">
                              <Kalla url={v.kalla_url} text="Voteringen hos riksdagen" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg border border-border bg-[var(--yta)] p-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <span aria-hidden="true">📜</span>
                        <span>Dokumenterat vallöfte ({l.kalla.titel})</span>
                      </div>
                      <p className="mt-1 leading-relaxed">
                        Detta vallöfte från mandatperioden {mandatPeriodText} är hämtat ur Svensk
                        Nationell Datatjänsts (SND) ViVill-arkiv. Voteringar från denna mandatperiod
                        kopplas och synkas löpande i takt med att riksdagsarkivet kompletteras mot
                        kammarens historiska data.
                      </p>
                      <div className="mt-3">
                        <a
                          href={l.kalla.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-xs font-medium text-[var(--accent-insikt)] underline underline-offset-2 hover:opacity-80"
                        >
                          Läs originalmanifestet hos SND ViVill ↗
                        </a>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        <EgenBerakning>
          Urval och analyser är sammanställda av Insikt. Löftena är autentiska citat ur partiernas
          valmanifest (SND:s Vivill-arkiv 2014–2022) och röstdata härrör från Sveriges riksdags
          öppna data. Synkning och verifiering sker automatiserat.
        </EgenBerakning>
      </div>
    </div>
  );
}
