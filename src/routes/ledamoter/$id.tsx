import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";

import { getLedamot } from "@/lib/insikt.functions";
import { datum, datumKort, ledamotsnamn, procent, antal } from "@/lib/format";
import { EgenBerakning, Fel, Kalla, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { Bevaka, PartiMarke, RostDiagram, RostMarke } from "@/components/insikt/delar";

const sokSchema = z.object({
  fran: z.string().optional().default(""),
  till: z.string().optional().default(""),
});

export const Route = createFileRoute("/ledamoter/$id")({
  validateSearch: sokSchema,
  head: ({ params }) => ({
    meta: [
      { title: `Ledamotsprofil — Insikt` },
      {
        name: "description",
        content: `Granska uppdrag, voteringshistorik och röstsammanfattning för riksdagsledamoten.`,
      },
    ],
  }),
  component: LedamotProfil,
});

function LedamotProfil() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const hamtaLedamot = useServerFn(getLedamot);

  const [fran, setFran] = useState(search.fran || "");
  const [till, setTill] = useState(search.till || "");

  const query = useQuery({
    queryKey: ["ledamot", id, fran, till],
    queryFn: () => hamtaLedamot({ data: { id, fran, till } }),
  });

  if (query.isPending) return <Laddar text="Hämtar ledamotsprofil …" />;
  if (query.isError) return <Fel fel={query.error} forsokIgen={() => query.refetch()} />;
  if (!query.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Tomt
          rubrik="Ledamoten hittades inte"
          text={`Ingen riksdagsledamot med id ”${id}” finns i databasen.`}
          barn={
            <Link to="/ledamoter" className="text-sm underline">
              Tillbaka till ledamotslistan
            </Link>
          }
        />
      </div>
    );
  }

  const { ledamot, uppdrag, roster, sammanfattning, franvaroKontext } = query.data;
  const namn = ledamotsnamn(ledamot);

  const totalt =
    sammanfattning.ja + sammanfattning.nej + sammanfattning.avstar + sammanfattning.franvarande;
  const hogFranvaro = totalt >= 10 && sammanfattning.franvarande / totalt >= 0.1;

  const harMajoritetsJamforelse = sammanfattning.jamforbara > 0;
  const majoritetsProcent = harMajoritetsJamforelse
    ? procent(sammanfattning.lika_med_partimajoritet, sammanfattning.jamforbara)
    : "Saknas";

  return (
    <div>
      <Sidhuvud
        rubrik={namn}
        lead={`${ledamot.status ?? "Riksdagsledamot"} · ${ledamot.valkrets ?? "Valkrets saknas"}`}
        barn={
          <div className="flex flex-wrap items-center gap-3">
            <PartiMarke kod={ledamot.parti} />
            <Bevaka typ="ledamoter" id={ledamot.id} etikett={namn} />
            <Link
              to="/jamfor"
              search={{ a: ledamot.id, typ: "ledamot" }}
              className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
            >
              Jämför med en annan ledamot →
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Vänsterkolumn: Porträtt & biografiska uppgifter */}
          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs text-center">
              {ledamot.bild_url ? (
                <img
                  src={ledamot.bild_url}
                  alt={`Porträtt av ${namn}`}
                  className="mx-auto h-52 w-40 rounded-lg object-cover shadow-xs border border-border"
                />
              ) : (
                <div className="mx-auto flex h-52 w-40 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground border border-border">
                  Inget porträtt tillgängligt
                </div>
              )}

              <h2 className="mt-4 text-xl font-medium">{namn}</h2>
              <div className="mt-1 flex justify-center">
                <PartiMarke kod={ledamot.parti} />
              </div>

              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-left text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Valkrets</dt>
                  <dd className="font-medium text-right">
                    {ledamot.valkrets ? (
                      <Link
                        to="/valkretsar/$namn"
                        params={{ namn: ledamot.valkrets }}
                        className="hover:underline text-[var(--accent-insikt)]"
                      >
                        {ledamot.valkrets}
                      </Link>
                    ) : (
                      "Saknas"
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Födelseår</dt>
                  <dd className="font-medium">{ledamot.fodd_ar ?? "–"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">{ledamot.status ?? "–"}</dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-border pt-4 text-xs">
                <Kalla url={ledamot.kalla_url} text="Öppna officiell profil hos Riksdagen" />
              </div>
            </div>

            {/* Uppdrag i riksdagen */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <h3 className="font-medium text-foreground">Riksdagsuppdrag</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Utskott och övriga förtroendeuppdrag.
              </p>

              {uppdrag.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">Inga uppdrag registrerade.</p>
              ) : (
                <ul className="mt-3 space-y-3 text-xs">
                  {uppdrag.map((u, i) => (
                    <li
                      key={i}
                      className="border-b border-border/60 pb-2.5 last:border-0 last:pb-0"
                    >
                      <p className="font-medium text-foreground">
                        {u.roll ?? "Ledamot"} {u.organ_kod ? `(${u.organ_kod})` : ""}
                      </p>
                      <p className="text-muted-foreground">
                        {datumKort(u.fran)} – {u.till ? datumKort(u.till) : "Nuvarande"}
                      </p>
                      {u.status ? (
                        <span className="mt-1 inline-block text-[11px] text-muted-foreground/80">
                          {u.status}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* Högerkolumn: Röstsammanfattning & Voteringshistorik */}
          <main className="space-y-8">
            {/* Röstsammanfattning */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <h2 className="text-xl font-normal">Röstfördelning för vald period</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Summering av hur ledamoten röstat i kammarens omröstningar.
              </p>

              <div className="mt-5">
                <RostDiagram
                  ja={sammanfattning.ja}
                  nej={sammanfattning.nej}
                  avstar={sammanfattning.avstar}
                  franvarande={sammanfattning.franvarande}
                />
              </div>

              {hogFranvaro && franvaroKontext.length > 0 ? (
                <div className="mt-5 rounded-lg border border-border/80 bg-muted/30 p-4">
                  <h3 className="text-sm font-medium text-foreground">
                    Möjliga förklaringar till frånvaron
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {franvaroKontext.map((k, i) => (
                      <li key={i} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                        <span className="text-foreground">{k.text}</span>
                        {k.fran ? (
                          <span className="text-muted-foreground">
                            {datumKort(k.fran)} – {k.till ? datumKort(k.till) : "pågående"}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    Källa: Riksdagens uppdragsregister. Orsaken till statusen ”Ledig” specificeras
                    inte (kan t.ex. vara föräldraledighet eller sjukdom). Kvittning mellan partier
                    registreras inte i riksdagens öppna data.
                  </p>
                </div>
              ) : null}

              {/* Likhet med partimajoriteten */}
              <div className="mt-8 border-t border-border pt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium text-foreground">
                    Röstade som partiets majoritetsröst
                  </h3>
                  <span className="text-2xl font-normal text-foreground">{majoritetsProcent}</span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {harMajoritetsJamforelse
                    ? `I ${antal(sammanfattning.lika_med_partimajoritet)} av ${antal(sammanfattning.jamforbara)} jämförbara voteringar röstade ${namn} likadant som flertalet av partiets ledamöter.`
                    : "Inga jämförbara voteringar hittades för perioden."}
                </p>

                <EgenBerakning>
                  Beräknas enbart när ledamoten avgett en aktiv röst (Ja, Nej eller Avstår) och
                  partiet hade en entydig majoritetsröst. Frånvaro exkluderas och får aldrig
                  beskrivas som ett mått på arbetsinsats (ledamoten kan vara kvittad enligt
                  riksdagens överenskommelser).
                </EgenBerakning>
              </div>
            </section>

            {/* Voteringshistorik */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <h2 className="text-xl font-normal">Voteringshistorik</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Visar de senaste 300 registrerade omröstningarna för ledamoten.
                  </p>
                </div>
              </div>

              {roster.length === 0 ? (
                <div className="mt-6">
                  <Tomt
                    rubrik="Inga registrerade röster för perioden"
                    text="Det finns inga enskilda röster registrerade för denna ledamot under vald period."
                  />
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {roster.map((r, i) => (
                    <article
                      key={r.voteringar?.id ?? i}
                      className="rounded-lg border border-border/80 bg-background p-4 text-sm transition-colors hover:bg-accent/30"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {r.voteringar?.beteckning ?? "Beteckning saknas"} · punkt{" "}
                          {r.voteringar?.punkt ?? "–"} · {datum(r.voteringar?.datum)}
                        </span>
                        <RostMarke rost={r.rost} />
                      </div>

                      <h3 className="mt-1.5 font-medium text-foreground">
                        <Link
                          to="/voteringar/$id"
                          params={{ id: r.voteringar?.id ?? "" }}
                          className="hover:underline"
                        >
                          {r.voteringar?.arenden?.titel ?? r.voteringar?.rubrik ?? "Votering"}
                        </Link>
                      </h3>

                      {r.voteringar?.gallde ? (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {r.voteringar.gallde}
                        </p>
                      ) : null}

                      <div className="mt-2.5 flex justify-end">
                        <Link
                          to="/voteringar/$id"
                          params={{ id: r.voteringar?.id ?? "" }}
                          className="text-xs text-[var(--accent-insikt)] hover:underline"
                        >
                          Granska hela voteringen →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
