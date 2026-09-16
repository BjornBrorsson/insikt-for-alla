import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Vote,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  UserCheck,
  ExternalLink,
} from "lucide-react";

import { useProfil } from "@/lib/profil";
import {
  getValkretsMatchningsunderlag,
  type Ledamot,
  type ValkretsRostPost,
} from "@/lib/insikt.functions";
import { ledamotsnamn, datum } from "@/lib/format";
import { PartiMarke } from "@/components/insikt/delar";
import { Laddar } from "@/components/insikt/tillstand";

type MatchResultat = {
  ledamot: Ledamot;
  lika: number;
  olika: number;
  jamforbara: number;
  franvarande: number;
  procent: number;
  detaljer: {
    voteringId: string;
    minRost: "Ja" | "Nej" | "Avstår";
    ledamotRost: string;
    lika: boolean;
    titel: string;
    beteckning: string;
    datum: string;
  }[];
};

export function ValkretsMatchning({
  valkrets,
  ledamoter,
}: {
  valkrets: string;
  ledamoter: Ledamot[];
}) {
  const { skuggroster, antalSkuggroster, laddad: profilLaddad } = useProfil();
  const [expanderadLedamotId, setExpanderadLedamotId] = useState<string | null>(null);
  const [filterParti, setFilterParti] = useState<string>("alla");

  const voteringIds = useMemo(() => Object.keys(skuggroster), [skuggroster]);

  const hamtaUnderlag = useServerFn(getValkretsMatchningsunderlag);
  const { data, isPending, isError } = useQuery({
    queryKey: ["valkrets-matchning", valkrets, voteringIds.sort().join(",")],
    queryFn: () => hamtaUnderlag({ data: { valkrets, voteringIds } }),
    enabled: profilLaddad && voteringIds.length > 0,
  });

  const resultat: MatchResultat[] = useMemo(() => {
    if (!data?.underlag) return [];
    const res: MatchResultat[] = [];

    for (const l of ledamoter) {
      const poster = data.underlag[l.id] ?? {};
      let lika = 0;
      let olika = 0;
      let franvarande = 0;
      const detaljer: MatchResultat["detaljer"] = [];

      for (const [vid, minRost] of Object.entries(skuggroster)) {
        const post: ValkretsRostPost | undefined = poster[vid];
        const ledamotRost = post?.rost ?? "Ingen uppgift";

        if (ledamotRost === "Frånvarande") {
          franvarande++;
        } else if (["Ja", "Nej", "Avstår"].includes(ledamotRost)) {
          const arLika = ledamotRost === minRost;
          if (arLika) lika++;
          else olika++;

          detaljer.push({
            voteringId: vid,
            minRost,
            ledamotRost,
            lika: arLika,
            titel: post?.titel ?? "Votering",
            beteckning: post?.beteckning ?? "Omröstning",
            datum: post?.datum ?? "",
          });
        }
      }

      const jamforbara = lika + olika;
      const procent = jamforbara > 0 ? Math.round((lika / jamforbara) * 100) : 0;

      res.push({
        ledamot: l,
        lika,
        olika,
        jamforbara,
        franvarande,
        procent,
        detaljer: detaljer.sort((a, b) => (b.datum || "").localeCompare(a.datum || "")),
      });
    }

    return res.sort((a, b) => b.procent - a.procent || b.jamforbara - a.jamforbara);
  }, [data, ledamoter, skuggroster]);

  const unikaPartier = useMemo(() => {
    const s = new Set<string>();
    for (const l of ledamoter) if (l.parti) s.add(l.parti);
    return Array.from(s).sort();
  }, [ledamoter]);

  const filtreradeResultat = useMemo(() => {
    if (filterParti === "alla") return resultat;
    return resultat.filter((r) => r.ledamot.parti === filterParti);
  }, [resultat, filterParti]);

  const toppMatch = resultat[0];

  return (
    <section className="mb-12 rounded-2xl border border-border bg-card p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-medium tracking-tight">Vem röstar som du i {valkrets}?</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Matcha dina skuggröster mot hur valkretsens riksdagsledamöter faktiskt har röstat i
            kammaren.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] text-muted-foreground">100 % anonymt i webbläsaren</span>
        </div>
      </div>

      {antalSkuggroster === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-[var(--yta)] p-8 text-center space-y-3">
          <Vote className="mx-auto h-8 w-8 text-muted-foreground/70" />
          <p className="font-medium text-foreground">
            Du har inte skuggröstat i några voteringar än
          </p>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto">
            När du granskar riksdagens voteringar kan du ange hur du själv skulle ha röstat (Ja, Nej
            eller Avstår). Då räknas din personliga matchningsgrad ut automatiskt mot alla ledamöter
            från {valkrets}.
          </p>
          <div className="pt-2">
            <Link
              to="/voteringar"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
            >
              Utforska voteringar & börja skuggrösta →
            </Link>
          </div>
        </div>
      ) : isPending ? (
        <div className="py-8">
          <Laddar
            text={`Matchar dina ${antalSkuggroster} skuggröster mot ledamöternas röstmatriser …`}
          />
        </div>
      ) : isError ? (
        <p className="py-6 text-xs text-destructive text-center">
          Kunde inte ladda röstningsunderlaget för ledamöterna. Försök ladda om sidan.
        </p>
      ) : resultat.length === 0 ? (
        <p className="py-6 text-xs text-muted-foreground text-center">
          Inga ledamöter kunde matchas mot dina skuggröster i denna valkrets.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Toppmatchnings-kort */}
          {toppMatch && toppMatch.jamforbara > 0 ? (
            <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {toppMatch.ledamot.bild_url_liten ? (
                    <img
                      src={toppMatch.ledamot.bild_url_liten}
                      alt={ledamotsnamn(toppMatch.ledamot)}
                      className="h-14 w-11 rounded-md object-cover border border-border"
                    />
                  ) : (
                    <div className="h-14 w-11 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      Bild
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                      Högst överensstämmelse
                    </span>
                    <h3 className="text-base font-semibold text-foreground">
                      {ledamotsnamn(toppMatch.ledamot)}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-2">
                      <PartiMarke kod={toppMatch.ledamot.parti} />
                      <span className="text-xs text-muted-foreground">
                        {toppMatch.lika} av {toppMatch.jamforbara} gemensamma voteringar
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                      {toppMatch.procent} %
                    </span>
                    <span className="block text-[10px] text-muted-foreground">enighet</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Partifilter & Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-xs text-muted-foreground">
              Jämförelse baserad på dina <strong>{antalSkuggroster}</strong> skuggröster
            </span>

            {unikaPartier.length > 1 ? (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground mr-1">Filtrera parti:</span>
                <button
                  type="button"
                  onClick={() => setFilterParti("alla")}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    filterParti === "alla"
                      ? "bg-primary text-primary-foreground"
                      : "border border-input bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Alla ({resultat.length})
                </button>
                {unikaPartier.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilterParti(p)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      filterParti === p
                        ? "bg-primary text-primary-foreground"
                        : "border border-input bg-card text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Ledamotslista med matchningsgrad */}
          <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
            {filtreradeResultat.map((res) => {
              const expanderad = expanderadLedamotId === res.ledamot.id;
              const fargKlass =
                res.procent >= 70
                  ? "bg-emerald-500 text-emerald-950 dark:text-emerald-100"
                  : res.procent >= 40
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground text-card";

              return (
                <div key={res.ledamot.id} className="p-4 transition-colors hover:bg-accent/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {res.ledamot.bild_url_liten ? (
                        <img
                          src={res.ledamot.bild_url_liten}
                          alt={ledamotsnamn(res.ledamot)}
                          className="h-11 w-9 rounded object-cover border border-border flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-11 w-9 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground flex-shrink-0">
                          –
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          to="/ledamoter/$id"
                          params={{ id: res.ledamot.id }}
                          className="font-medium hover:underline text-foreground text-sm truncate block"
                        >
                          {ledamotsnamn(res.ledamot)}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <PartiMarke kod={res.ledamot.parti} />
                          <span className="text-xs text-muted-foreground">
                            {res.jamforbara > 0
                              ? `${res.lika} av ${res.jamforbara} voteringar lika`
                              : "Inga gemensamma voteringar"}
                            {res.franvarande > 0 ? ` · ${res.franvarande} frånvarande` : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                      {res.jamforbara > 0 ? (
                        <div className="flex items-center gap-3">
                          <div className="w-24 sm:w-28 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${res.procent}%` }}
                            />
                          </div>
                          <span className={`rounded px-2 py-0.5 text-xs font-bold ${fargKlass}`}>
                            {res.procent} %
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Ej deltagit</span>
                      )}

                      {res.detaljer.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setExpanderadLedamotId(expanderad ? null : res.ledamot.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                          aria-expanded={expanderad}
                        >
                          <span>{expanderad ? "Dölj" : "Detaljer"}</span>
                          {expanderad ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Utfälld detaljgranskning per omröstning */}
                  {expanderad ? (
                    <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Omröstningar som du och {res.ledamot.fornamn} har tagit ställning till:
                      </p>
                      <div className="grid gap-2">
                        {res.detaljer.map((det) => (
                          <div
                            key={det.voteringId}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-[var(--yta)] p-2.5 text-xs border border-border/50"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                {det.lika ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                )}
                                <Link
                                  to="/voteringar/$id"
                                  params={{ id: det.voteringId }}
                                  className="font-medium hover:underline text-foreground truncate inline-flex items-center gap-1"
                                >
                                  <span>{det.titel}</span>
                                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                </Link>
                              </div>
                              <p className="text-[11px] text-muted-foreground pl-5">
                                {det.beteckning} {det.datum ? `· ${datum(det.datum)}` : ""}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center pl-5 sm:pl-0 flex-shrink-0">
                              <span className="text-[11px] text-muted-foreground">
                                Du: <strong className="text-foreground">{det.minRost}</strong>
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-[11px] text-muted-foreground">
                                {res.ledamot.fornamn}:{" "}
                                <strong
                                  className={
                                    det.lika
                                      ? "text-emerald-700 dark:text-emerald-300"
                                      : "text-rose-700 dark:text-rose-300"
                                  }
                                >
                                  {det.ledamotRost}
                                </strong>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>
              <strong>Metod & Neutralitet:</strong> Beräkningen baseras uteslutande på de voteringar
              där du har skuggröstat och där ledamoten har avlagt en giltig röst i riksdagen (Ja,
              Nej eller Avstår). Frånvaro räknas inte som enighet eller oenighet. Denna
              sammanställning är ett matematiskt faktum över riksdagens protokoll, inte ett
              partipolitiskt ställningstagande.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
