import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Scale,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import {
  getValkretsVsRiksdagen,
  type ValkretsVsRiksdagenData,
  type Ledamot,
} from "@/lib/insikt.functions";
import { datum } from "@/lib/format";
import { PartiMarke } from "@/components/insikt/delar";
import { Laddar } from "@/components/insikt/tillstand";

export function ValkretsVsRiksdagen({ valkrets }: { valkrets: string; ledamoter: Ledamot[] }) {
  const [valdFlik, setValdFlik] = useState<"avvikelser" | "sakfragor" | "lojalitet">("avvikelser");
  const [expanderadVoteringId, setExpanderadVoteringId] = useState<string | null>(null);

  const hamtaJamforelse = useServerFn(getValkretsVsRiksdagen);
  const { data, isPending, isError } = useQuery({
    queryKey: ["valkrets-vs-riksdagen", valkrets],
    queryFn: () => hamtaJamforelse({ data: { valkrets } }),
  });

  if (isPending) {
    return (
      <section className="mb-12 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <Laddar text={`Analyserar valkretsens röstmönster mot riksdagens kammare …`} />
      </section>
    );
  }

  if (isError || !data || data.totaltVoteringar === 0) {
    return null;
  }

  return (
    <section className="mb-12 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Scale className="h-4 w-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {valkrets} vs. Riksdagen
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Röstar valkretsens riksdagsledamöter som kammaren i stort, eller har de en egen linje?
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Analys över {data.totaltVoteringar} voteringar (2022–nu)</span>
        </div>
      </div>

      {/* Nyckeltals-kort */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-[var(--yta)] p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium block">
            Enighet med riksdagsbesluten
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {data.enighetProcent} %
            </span>
            <span className="text-xs text-muted-foreground">i linje</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            I {data.likaMedKammaren} av {data.totaltVoteringar} omröstningar röstade valkretsens
            majoritet för det vinnande förslaget.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-[var(--yta)] p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium block">
            Avvikande omröstningar
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {data.avvikandeVoteringar.length}
            </span>
            <span className="text-xs text-muted-foreground">mot kammaren</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Voteringar där majoriteten i {valkrets} röstade för ett annat utfall än
            riksdagsbeslutet.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-[var(--yta)] p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium block">
            Partilojalitet i valkretsen
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {data.partilojalitetProcent} %
            </span>
            <span className="text-xs text-muted-foreground">lojalitet</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Andel avgivna röster från valkretsens ledamöter som följt sitt partis nationella
            majoritet.
          </p>
        </div>
      </div>

      {/* Flikväljare för djupdykning */}
      <div className="flex rounded-lg border border-input bg-background p-1 text-xs font-medium w-full sm:w-auto self-start">
        <button
          type="button"
          onClick={() => setValdFlik("avvikelser")}
          className={`rounded px-3 py-1.5 transition-colors cursor-pointer ${
            valdFlik === "avvikelser"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          När valkretsen röstade mot riksdagen ({data.avvikandeVoteringar.length})
        </button>
        <button
          type="button"
          onClick={() => setValdFlik("sakfragor")}
          className={`rounded px-3 py-1.5 transition-colors cursor-pointer ${
            valdFlik === "sakfragor"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sakfrågor ({data.sakfragedata.length})
        </button>
        <button
          type="button"
          onClick={() => setValdFlik("lojalitet")}
          className={`rounded px-3 py-1.5 transition-colors cursor-pointer ${
            valdFlik === "lojalitet"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Lokala profiler ({data.lokalprofiler.length})
        </button>
      </div>

      {/* FLIK 1: Avvikande omröstningar */}
      {valdFlik === "avvikelser" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Nedan visas voteringar där ledamöterna från {valkrets} samlat röstade för ett annat
            utfall än det som vann i kammaren:
          </p>

          {data.avvikandeVoteringar.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4">
              Valkretsens majoritet har röstat i linje med kammarens beslut i samtliga undersökta
              voteringar.
            </p>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
              {data.avvikandeVoteringar.map((v) => {
                const expanderad = expanderadVoteringId === v.voteringId;
                return (
                  <div key={v.voteringId} className="p-4 transition-colors hover:bg-accent/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                            {v.beteckning}
                          </span>
                          {v.datum ? (
                            <span className="text-xs text-muted-foreground">{datum(v.datum)}</span>
                          ) : null}
                          {v.sakfragor[0] ? (
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary capitalize">
                              {v.sakfragor[0].replace(/-/g, " ")}
                            </span>
                          ) : null}
                        </div>

                        <Link
                          to="/voteringar/$id"
                          params={{ id: v.voteringId }}
                          className="font-medium hover:underline text-foreground text-sm truncate block"
                        >
                          {v.titel}
                        </Link>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded px-2 py-0.5 bg-primary/10 text-primary font-semibold border border-primary/20">
                            Valkretsen: {v.valkretsVinnare} ({v.valkretsJa} Ja, {v.valkretsNej} Nej)
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="rounded px-2 py-0.5 bg-muted text-muted-foreground font-medium">
                            Riksdagen: {v.kammareVinnare}
                          </span>
                        </div>

                        <Link
                          to="/voteringar/$id"
                          params={{ id: v.voteringId }}
                          className="text-muted-foreground hover:text-foreground"
                          title="Öppna votering"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* FLIK 2: Sakfrågor */}
      {valdFlik === "sakfragor" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Enighet med riksdagen uppdelat per sakområde (sorterat med de frågor där valkretsen
            avviker mest överst):
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.sakfragedata.map((sf) => (
              <div
                key={sf.sakfraga}
                className="rounded-xl border border-border bg-[var(--yta)] p-3.5 space-y-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm capitalize text-foreground">
                    {sf.sakfraga.replace(/-/g, " ")}
                  </span>
                  <span className="text-xs font-bold text-foreground">{sf.procent} % enighet</span>
                </div>

                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${sf.procent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {sf.lika} av {sf.totalt} voteringar lika med riksdagsbeslutet
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* FLIK 3: Lokala profiler / avvikelser */}
      {valdFlik === "lojalitet" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Ledamöter från {valkrets} och hur ofta de röstat emot sitt eget partis nationella
            riksdagsmajoritet:
          </p>

          <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
            {data.lokalprofiler.map((p) => (
              <div
                key={p.ledamotId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition-colors hover:bg-accent/20"
              >
                <div className="flex items-center gap-3">
                  {p.bild_url_liten ? (
                    <img
                      src={p.bild_url_liten}
                      alt={p.namn}
                      className="h-10 w-8 rounded object-cover border border-border"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-10 w-8 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                      –
                    </div>
                  )}
                  <div>
                    <Link
                      to="/ledamoter/$id"
                      params={{ id: p.ledamotId }}
                      className="font-medium hover:underline text-foreground text-sm"
                    >
                      {p.namn}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PartiMarke kod={p.parti} />
                      <span className="text-xs text-muted-foreground">
                        {p.totaltRoster} registrerade voteringar
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-foreground block">
                      {p.antalAvvikelser === 0
                        ? "100 % partilojal"
                        : `${p.antalAvvikelser} avvikande röster`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {p.lojalitetProcent} % lojalitet mot partilinjen
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
