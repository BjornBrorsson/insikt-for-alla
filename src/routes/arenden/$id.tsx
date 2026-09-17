import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getArende } from "@/lib/insikt.functions";
import { datum, rensaHtml } from "@/lib/format";
import { EgenBerakning, Fel, Kalla, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { Bevaka, RostDiagram } from "@/components/insikt/delar";
import { TextMedMotioner } from "@/components/insikt/motion-modal";
import { analyseraBeslut, vinnareEtikett } from "@/lib/beslut-analys";
import { ForslagetsResa } from "@/components/insikt/forslagets-resa";

export const Route = createFileRoute("/arenden/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Ärende & betänkande — Insikt` },
      {
        name: "description",
        content: `Granska riksdagsärendet, beslutspunkter, voteringar och tidslinje.`,
      },
    ],
  }),
  component: ArendeDetalj,
});

function ArendeDetalj() {
  const { id } = Route.useParams();
  const hamtaArende = useServerFn(getArende);

  const query = useQuery({
    queryKey: ["arende", id],
    queryFn: () => hamtaArende({ data: { id } }),
  });

  if (query.isPending) return <Laddar text="Hämtar ärende och betänkande …" />;
  if (query.isError) return <Fel fel={query.error} forsokIgen={() => query.refetch()} />;
  if (!query.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Tomt
          rubrik="Ärendet hittades inte"
          text={`Inget riksdagsärende med id ”${id}” finns i databasen.`}
          barn={
            <Link to="/voteringar" className="text-sm underline">
              Tillbaka till voteringar
            </Link>
          }
        />
      </div>
    );
  }

  const { arende, punkter, voteringar, amnen, sammanfattning, anforanden, relaterade } = query.data;

  return (
    <div>
      <Sidhuvud
        rubrik={rensaHtml(arende.titel) || arende.beteckning || "Ärende"}
        lead={`${arende.beteckning ?? arende.id} · ${arende.organ ?? "Utskott"} · Riksmöte ${arende.rm ?? "–"} · ${datum(arende.datum)}`}
        barn={
          <div className="flex flex-wrap items-center gap-3">
            <Bevaka typ="arenden" id={arende.id} etikett={arende.beteckning ?? arende.id} />
            <Kalla url={arende.kalla_url_html} text="Öppna betänkandet hos Riksdagen (HTML)" />
            {arende.kalla_url_text ? (
              <Kalla url={arende.kalla_url_text} text="Ladda ner fulltext" />
            ) : null}
            {arende.debatt_url ? (
              <Kalla url={arende.debatt_url} text="Se debatten i webb-tv" />
            ) : null}
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
        {/* Sakfrågor / Ämnestaggar */}
        {amnen.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Ämnen (Insikts kategorisering):</span>
            {amnen.map((a) => (
              <Link
                key={a.sakfraga}
                to="/sakfragor/$slug"
                params={{ slug: a.sakfraga }}
                className="rounded-full border border-border bg-[var(--yta)] px-3 py-1 text-xs font-medium text-foreground hover:bg-accent"
              >
                {a.sakfragor?.namn ?? a.sakfraga}
              </Link>
            ))}
          </div>
        ) : null}

        {/* Förslagets resa: Visuell tidslinje */}
        <ForslagetsResa arende={arende} punkter={punkter} voteringar={voteringar} />

        {/* Sammanfattning */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-normal">Vad handlar ärendet om?</h2>

            {sammanfattning ? (
              <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                AI-genererad sammanfattning
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Officiellt underlag
              </span>
            )}
          </div>

          {sammanfattning ? (
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground">
              <div className="whitespace-pre-line">
                <TextMedMotioner text={sammanfattning.sammanfattning} />
              </div>

              {!sammanfattning.tillrackligt_underlag ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  Varning: Underlaget var begränsat, så sammanfattningen kan vara ofullständig.
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>
                  Modell: {sammanfattning.modell} ·{" "}
                  {sammanfattning.granskad ? "Granskad av redaktion" : "Automatgenererad"}
                </span>
                {sammanfattning.underlag_url ? (
                  <a
                    href={sammanfattning.underlag_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[var(--accent-insikt)] underline"
                  >
                    Källunderlag ↗
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {arende.undertitel ? (
                <p className="font-medium text-foreground">
                  <TextMedMotioner text={arende.undertitel} />
                </p>
              ) : (
                <p>
                  Officiell beskrivning saknas i källdata. Se betänkandets fulltext hos Riksdagen.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Debatt om ärendet */}
        {anforanden.length > 0 ? (
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-normal">
                Debatt i kammaren ({anforanden.length} anföranden)
              </h2>
              {arende.debatt_url ? (
                <a
                  href={arende.debatt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent-insikt)] underline"
                >
                  Hela debatten i webb-tv ↗
                </a>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Vem som talade i debatten om ärendet, i talarordning. Länkarna startar Riksdagens
              webb-tv vid respektive inlägg när startpositionen är känd.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {anforanden.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/60 pb-2 last:border-0"
                >
                  <span className="w-8 text-xs text-muted-foreground">{a.nummer ?? "–"}</span>
                  {a.ledamot_id ? (
                    <Link
                      to="/ledamoter/$id"
                      params={{ id: a.ledamot_id }}
                      className="font-medium hover:underline"
                    >
                      {a.talare ?? a.ledamot_id}
                    </Link>
                  ) : (
                    <span className="font-medium">{a.talare ?? "Okänd talare"}</span>
                  )}
                  {a.parti ? (
                    <span className="text-xs text-muted-foreground">({a.parti})</span>
                  ) : null}
                  {a.replik ? <span className="text-xs text-muted-foreground">replik</span> : null}
                  <span className="ml-auto flex gap-3 text-xs">
                    {a.video_url ? (
                      <a
                        href={a.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Se inlägget i webb-tv ↗
                      </a>
                    ) : null}
                    {a.protokoll_url_www ? (
                      <a
                        href={a.protokoll_url_www}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground underline hover:text-foreground"
                      >
                        Protokoll ↗
                      </a>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground italic">
              Källa: Sveriges riksdag. Ett anförande visar vad som sades i debatten – det visar inte
              orsaken till hur ledamoten röstade.
            </p>
          </section>
        ) : null}

        {/* Beslutspunkter och tillhörande voteringar */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h2 className="text-xl font-normal">Beslutspunkter ({punkter.length})</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Riksdagens kammare tar ställning till varje beslutspunkt separat. Vissa avgörs med
            acklamation, andra med votering.
          </p>

          {punkter.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Inga separata beslutspunkter registrerade.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {punkter.map((p) => {
                const koppladVotering = voteringar.find(
                  (v) => v.id === p.votering_id || v.punkt === p.punkt,
                );

                const punktAnalys = analyseraBeslut({
                  forslag: p.forslag,
                  rubrik: p.rubrik,
                  motforslag_partier: p.motforslag_partier,
                  motforslag_nummer: p.motforslag_nummer,
                  vinnare: p.vinnare,
                  ja: koppladVotering?.ja,
                  nej: koppladVotering?.nej,
                });

                const badgeFarg =
                  punktAnalys.utfall?.statusTyp === "avslag"
                    ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20"
                    : punktAnalys.utfall?.statusTyp === "bifall"
                      ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20"
                      : "bg-muted text-foreground border-border";

                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border/80 bg-background p-4 text-sm space-y-2"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-medium text-foreground">
                        Punkt {p.punkt}: {rensaHtml(p.rubrik) || "Beslutspunkt"}
                      </h3>
                      {p.vinnare ? (
                        <span
                          className={`rounded px-2.5 py-0.5 text-xs font-medium border ${badgeFarg}`}
                        >
                          {punktAnalys.utfall?.etikett ?? vinnareEtikett(p.vinnare)}
                        </span>
                      ) : null}
                    </div>

                    {p.forslag ? (
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Utskottets förslag:</strong>{" "}
                        <TextMedMotioner text={p.forslag} />
                      </div>
                    ) : null}

                    {p.motforslag_partier ? (
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Motförslag från:</strong>{" "}
                        <TextMedMotioner text={p.motforslag_partier} />
                        {p.motforslag_nummer ? ` (reservation ${p.motforslag_nummer})` : ""}
                      </p>
                    ) : null}

                    {p.reservationer?.map((r, i) => (
                      <div
                        key={r.nummer ?? i}
                        className="rounded-md border border-border/70 bg-[var(--yta)] p-3 text-xs space-y-1.5"
                      >
                        <p className="font-medium text-foreground">
                          {r.typ === "motförslag" ? "Motförslag" : "Reservation"}{" "}
                          {r.nummer ?? i + 1}
                          {r.partier ? ` (${r.partier})` : ""}
                          {r.rubrik ? ` – ${r.rubrik}` : ""}
                        </p>
                        {r.reserverande ? (
                          <p className="text-muted-foreground">
                            <strong className="text-foreground">Reserverade:</strong>{" "}
                            {r.reserverande}
                          </p>
                        ) : null}
                        {r.forslag ? (
                          <p className="text-muted-foreground">
                            <strong className="text-foreground">
                              Reservationens förslag till riksdagsbeslut:
                            </strong>{" "}
                            <TextMedMotioner text={r.forslag} />
                          </p>
                        ) : null}
                        {r.motivering ? (
                          <details className="text-muted-foreground">
                            <summary className="cursor-pointer font-medium text-foreground">
                              Reservationens motivering
                            </summary>
                            <p className="mt-1 whitespace-pre-line">
                              <TextMedMotioner text={r.motivering} />
                            </p>
                          </details>
                        ) : null}
                      </div>
                    ))}

                    {koppladVotering ? (
                      <div className="mt-3 border-t border-border/60 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">
                          Votering genomförd: Ja {koppladVotering.ja}, Nej {koppladVotering.nej},
                          Avstår {koppladVotering.avstar}
                        </span>
                        <Link
                          to="/voteringar/$id"
                          params={{ id: koppladVotering.id }}
                          className="font-medium text-[var(--accent-insikt)] hover:underline"
                        >
                          Öppna omröstningen och granska röster →
                        </Link>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        Beslutades utan registrerad votering (med acklamation).
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Voteringar i ärendet */}
        {voteringar.length > 0 ? (
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-xl font-normal">Genomförda voteringar ({voteringar.length})</h2>
            <div className="mt-4 space-y-3">
              {voteringar.map((v) => (
                <div
                  key={v.id}
                  className="rounded-lg border border-border/80 bg-background p-4 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Punkt {v.punkt} · {datum(v.datum)}
                    </span>
                    <span className="font-medium text-foreground">{vinnareEtikett(v.vinnare)}</span>
                  </div>

                  <p className="mt-1 font-medium text-foreground">
                    <Link to="/voteringar/$id" params={{ id: v.id }} className="hover:underline">
                      {rensaHtml(v.rubrik) || "Votering"}
                    </Link>
                  </p>

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
                      Granska enskilda röster →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Relaterade ärenden */}
        {relaterade.length > 0 ? (
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-xl font-normal">Fler ärenden från {arende.organ}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relaterade.map((r) => (
                <Link
                  key={r.id}
                  to="/arenden/$id"
                  params={{ id: r.id }}
                  className="rounded-lg border border-border/80 bg-background p-3.5 text-xs transition-colors hover:bg-accent/40"
                >
                  <span className="font-mono font-medium text-foreground">
                    {r.beteckning ?? r.id}
                  </span>
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{r.titel ?? "Ärende"}</p>
                  <span className="mt-2 block text-muted-foreground/80">{datum(r.datum)}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
