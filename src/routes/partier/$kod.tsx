import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";

import { getParti } from "@/lib/insikt.functions";
import { datum, laddaNerCsv, csv, procent, antal, rensaHtml } from "@/lib/format";
import { EgenBerakning, Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { Bevaka, LedamotKort, PartiMarke, RostDiagram } from "@/components/insikt/delar";

const filterSchema = z.object({
  fran: z.string().optional().default(""),
  till: z.string().optional().default(""),
});

export const Route = createFileRoute("/partier/$kod")({
  validateSearch: filterSchema,
  head: ({ params }) => ({
    meta: [
      { title: `${params.kod} — Partiprofil & röstmönster | Insikt` },
      {
        name: "description",
        content: `Granska ${params.kod} i Sveriges riksdag: sammanhållning, voteringshistorik, röstlikhet med andra partier och ledamöter.`,
      },
    ],
  }),
  component: PartiDetalj,
});

function PartiDetalj() {
  const { kod } = Route.useParams();
  const search = Route.useSearch();
  const hamtaParti = useServerFn(getParti);

  const [fran, setFran] = useState(search.fran || "");
  const [till, setTill] = useState(search.till || "");

  const query = useQuery({
    queryKey: ["parti", kod, fran, till],
    queryFn: () => hamtaParti({ data: { kod, fran, till } }),
  });

  if (query.isPending) return <Laddar text={`Hämtar data för ${kod} …`} />;
  if (query.isError) return <Fel fel={query.error} forsokIgen={() => query.refetch()} />;
  if (!query.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Tomt
          rubrik="Partiet hittades inte"
          text={`Inget parti med partikoden ”${kod}” finns registrerat i Insikt.`}
          barn={
            <Link to="/partier" className="text-sm underline">
              Tillbaka till partier
            </Link>
          }
        />
      </div>
    );
  }

  const { parti, ledamoter, sammanhallning, likhet, voteringar } = query.data;

  function exporteraCsv() {
    const rubriker = [
      "Votering ID",
      "Datum",
      "Beteckning",
      "Punkt",
      "Titel",
      "Parti Ja",
      "Parti Nej",
      "Parti Avstår",
      "Parti Frånvarande",
    ];
    const rader = voteringar.map((v) => [
      v.voteringar?.id ?? "",
      v.voteringar?.datum ?? "",
      v.voteringar?.beteckning ?? "",
      v.voteringar?.punkt ?? "",
      v.voteringar?.arenden?.titel ?? v.voteringar?.rubrik ?? "",
      v.ja,
      v.nej,
      v.avstar,
      v.franvarande,
    ]);
    const filinnehall = csv([rubriker, ...rader]);
    laddaNerCsv(`voteringar_${kod}_${new Date().toISOString().slice(0, 10)}.csv`, filinnehall);
  }

  return (
    <div>
      <Sidhuvud
        rubrik={parti.namn}
        lead={`${parti.forkortning} har ${ledamoter.length} tjänstgörande riksdagsledamöter i kammaren.`}
        barn={
          <div className="flex flex-wrap items-center gap-3">
            <PartiMarke kod={parti.kod} farg={parti.farg} />
            <Bevaka typ="partier" id={parti.kod} etikett={parti.namn} />
            <Link
              to="/jamfor"
              search={{ a: parti.kod, typ: "parti" }}
              className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
            >
              Jämför med ett annat parti →
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Statistik & Nyckeltal */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sammanhållning */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-xl font-normal">Sammanhållning i kammaren</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Hur ofta partiets ledamöter röstat som partiets majoritet i omröstningar.
            </p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-4xl font-normal text-foreground">
                {procent(sammanhallning.enligt_majoritet, sammanhallning.avgivna_roster)}
              </span>
              <span className="text-xs text-muted-foreground">av avgivna röster</span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Baserat på {antal(sammanhallning.enligt_majoritet)} av{" "}
              {antal(sammanhallning.avgivna_roster)} röster över {antal(sammanhallning.voteringar)}{" "}
              voteringar under perioden.
            </p>

            <EgenBerakning>
              Andel avgivna röster (Ja, Nej, Avstår) som sammanfaller med det röstalternativ som
              fick flest röster inom partiet i omröstningen. Frånvaro exkluderas.
            </EgenBerakning>
          </section>

          {/* Röstlikhet med andra partier */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-xl font-normal">Röstlikhet med andra partier</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Hur ofta {parti.namn}s och övriga partiers majoritetsröster sammanfallit.
            </p>

            <div className="mt-4 space-y-2.5">
              {likhet.map((item) => {
                const proc =
                  item.gemensamma > 0 ? Math.round((item.lika / item.gemensamma) * 100) : 0;
                return (
                  <div key={item.parti} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-24">
                      <PartiMarke kod={item.parti} />
                      <span className="font-medium">{item.parti}</span>
                    </div>

                    <div className="flex-1 max-w-xs">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-[var(--accent-insikt)] rounded-full"
                          style={{ width: `${proc}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-medium text-foreground w-12 text-right">
                        {proc} %
                      </span>
                      <Link
                        to="/jamfor"
                        search={{ a: parti.kod, b: item.parti, typ: "parti" }}
                        className="text-[var(--accent-insikt)] hover:underline"
                        title={`Jämför ${parti.kod} och ${item.parti}`}
                      >
                        Jämför
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <EgenBerakning>
              Jämför enbart voteringar där båda partierna haft en entydig majoritetsröst. Beskriver
              röstlikhet i kammaren, inte ideologiskt samarbete.
            </EgenBerakning>
          </section>
        </div>

        {/* Ledamöter */}
        <section className="mt-12">
          <h2 className="text-2xl font-normal">
            Ledamöter för {parti.namn} ({ledamoter.length})
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ledamoter.map((l) => (
              <LedamotKort key={l.id} ledamot={l} />
            ))}
          </div>
        </section>

        {/* Voteringshistorik */}
        <section className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl font-normal">Voteringshistorik</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Senaste omröstningarna med partiets röstfördelning.
              </p>
            </div>
            <button
              type="button"
              onClick={exporteraCsv}
              className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
            >
              Exportera till CSV ↗
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {voteringar.map((v) => (
              <div
                key={v.voteringar?.id}
                className="rounded-xl border border-border bg-card p-4 shadow-2xs"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {v.voteringar?.beteckning} · punkt {v.voteringar?.punkt} ·{" "}
                    {datum(v.voteringar?.datum)}
                  </span>
                  <Link
                    to="/voteringar/$id"
                    params={{ id: v.voteringar?.id ?? "" }}
                    className="text-[var(--accent-insikt)] hover:underline"
                  >
                    Öppna votering →
                  </Link>
                </div>

                <p className="mt-1.5 font-medium text-foreground">
                  <Link
                    to="/voteringar/$id"
                    params={{ id: v.voteringar?.id ?? "" }}
                    className="hover:underline"
                  >
                    {rensaHtml(v.voteringar?.arenden?.titel ?? v.voteringar?.rubrik) || "Votering"}
                  </Link>
                </p>

                {v.voteringar?.gallde ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rensaHtml(v.voteringar.gallde)}
                  </p>
                ) : null}

                <div className="mt-3">
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                    Partiets röstfördelning:
                  </p>
                  <RostDiagram
                    ja={v.ja}
                    nej={v.nej}
                    avstar={v.avstar}
                    franvarande={v.franvarande}
                    kompakt
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
