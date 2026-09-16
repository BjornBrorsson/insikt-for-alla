import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  Compass,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  Share2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import { useProfil, type SkuggRostTyp } from "@/lib/profil";
import {
  getKompassFragor,
  getVoteringsSammanfattning,
  listPartier,
  listSakfragor,
  type KompassFraga,
} from "@/lib/insikt.functions";
import { datum, procent } from "@/lib/format";
import { PartiMarke } from "@/components/insikt/delar";
import { Laddar, Sidhuvud } from "@/components/insikt/tillstand";

const kompassSearchSchema = z.object({
  lage: z.enum(["snabb", "stor", "amne"]).optional().default("snabb"),
  sakfraga: z.string().optional().default(""),
});

export const Route = createFileRoute("/kompass")({
  validateSearch: kompassSearchSchema,
  head: () => ({
    meta: [
      { title: "Riksdagskompassen – faktisk handling i kammaren | Insikt" },
      {
        name: "description",
        content:
          "En verklig valkompass baserad på hur partierna faktiskt har röstat i riksdagens omröstningar, inte vad de säger i opinionsenkäter. Helt anonym och körs lokalt.",
      },
    ],
  }),
  component: KompassSida,
});

type SvarRecord = Record<string, SkuggRostTyp | "HoppaOver">;

function KompassFragaSammanfattning({
  voteringId,
  initialSammanfattning,
  bakgrund,
  tillrackligtUnderlag = true,
  visaUtfall = false,
}: {
  voteringId: string;
  initialSammanfattning?: string | null | undefined;
  bakgrund?: string | null | undefined;
  tillrackligtUnderlag?: boolean | undefined;
  visaUtfall?: boolean | undefined;
}) {
  const hamtaSammanfattning = useServerFn(getVoteringsSammanfattning);

  const query = useQuery({
    queryKey: ["voteringssammanfattning", voteringId],
    queryFn: () => hamtaSammanfattning({ data: { id: voteringId } }),
    enabled: !initialSammanfattning && !bakgrund && Boolean(voteringId),
    staleTime: Infinity,
    retry: 1,
  });

  const fullText =
    initialSammanfattning ||
    (query.data?.status === "klar" ? query.data.sammanfattning.sammanfattning : null);

  const cleanBakgrund =
    bakgrund ||
    (query.data?.status === "klar" ? query.data.sammanfattning.bakgrund : null) ||
    (fullText
      ? fullText
          .split(/\n\s*\n/)
          .map((s) => s.trim())
          .filter(Boolean)[0]
      : null);

  const visadText = visaUtfall ? fullText : cleanBakgrund;

  const underlagOkej =
    initialSammanfattning !== null && initialSammanfattning !== undefined
      ? tillrackligtUnderlag
      : query.data?.status === "klar"
        ? query.data.sammanfattning.tillrackligt_underlag
        : true;

  if (query.isPending && !initialSammanfattning && !bakgrund) {
    return (
      <div
        className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2 animate-pulse"
        aria-live="polite"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-spin" />
          <span>Hämtar AI-sammanfattning i klartext …</span>
        </div>
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-11/12 rounded bg-purple-500/15" />
          <div className="h-3 w-full rounded bg-purple-500/15" />
          <div className="h-3 w-4/5 rounded bg-purple-500/15" />
        </div>
      </div>
    );
  }

  if (!visadText) {
    return null;
  }

  return (
    <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-4 sm:p-5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          {visaUtfall
            ? "Omröstningen i korthet & resultat"
            : "Vad frågan handlar om (AI-sammanfattning)"}
        </span>
        <Link
          to="/voteringar/$id"
          params={{ id: voteringId }}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-purple-700 dark:text-purple-300 hover:underline inline-flex items-center gap-1"
        >
          <span>Läs hela voteringen</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="text-xs sm:text-sm leading-relaxed text-foreground space-y-2">
        {visadText.split("\n\n").map((stycke, i) => (
          <p key={i} className="text-foreground/90 leading-relaxed">
            {stycke}
          </p>
        ))}
      </div>

      {!underlagOkej ? (
        <p className="pt-1 text-[11px] text-amber-700 dark:text-amber-300 italic">
          Obs: Underlaget i riksdagsdatan var begränsat för denna punkt.
        </p>
      ) : null}
    </div>
  );
}

function KompassSida() {
  const search = Route.useSearch();
  const { skuggroster, skuggrosta } = useProfil();

  // Inställningar för kompassen
  const [valdTyp, setValdTyp] = useState<"snabb" | "stor" | "amne">(search.lage ?? "snabb");
  const [valdSakfraga, setValdSakfraga] = useState<string>(search.sakfraga ?? "");
  const [arStartad, setArStartad] = useState(false);
  const [fragaIndex, setFragaIndex] = useState(0);
  const [lokalaSvar, setLokalaSvar] = useState<SvarRecord>({});
  const [visarResultat, setVisarResultat] = useState(false);
  const [granskaParti, setGranskaParti] = useState<string | null>(null);

  const antal = valdTyp === "snabb" ? 10 : 20;

  const hamtaFragor = useServerFn(getKompassFragor);
  const hamtaPartier = useServerFn(listPartier);
  const hamtaSakfragor = useServerFn(listSakfragor);

  const partierQuery = useQuery({ queryKey: ["partier"], queryFn: () => hamtaPartier() });
  const sakfragorQuery = useQuery({ queryKey: ["sakfragor"], queryFn: () => hamtaSakfragor() });

  const fragorQuery = useQuery({
    queryKey: ["kompass-fragor", antal, valdSakfraga],
    queryFn: () =>
      hamtaFragor({
        data: {
          antal,
          sakfraga: valdTyp === "amne" ? valdSakfraga : "",
          slumpa: false,
        },
      }),
  });

  const fragor = useMemo(() => fragorQuery.data?.fragor ?? [], [fragorQuery.data]);
  const aktivFraga = fragor[fragaIndex];

  function startaKompass() {
    setFragaIndex(0);
    setVisarResultat(false);
    setGranskaParti(null);
    setArStartad(true);
  }

  function svara(rost: SkuggRostTyp | "HoppaOver") {
    if (!aktivFraga) return;

    setLokalaSvar((prev) => ({ ...prev, [aktivFraga.id]: rost }));

    // Spara i den lokala skuggröstningsprofilen om inte HoppaOver
    if (rost !== "HoppaOver") {
      skuggrosta(aktivFraga.id, rost);
    }

    if (fragaIndex + 1 < fragor.length) {
      setFragaIndex((i) => i + 1);
    } else {
      setVisarResultat(true);
    }
  }

  // Beräkna matchning mot partier
  const matchResultat = useMemo(() => {
    if (!partierQuery.data || fragor.length === 0) return [];

    const allaPartier = partierQuery.data.filter((p) => p.kod !== "-");

    return allaPartier
      .map((parti) => {
        let lika = 0;
        let olika = 0;
        let obesvarade = 0;
        const jamforelser: {
          fraga: KompassFraga;
          minRost: SkuggRostTyp;
          partiRost: string;
          arLika: boolean;
        }[] = [];

        for (const f of fragor) {
          const svar = lokalaSvar[f.id] || skuggroster[f.id];
          if (!svar || svar === "HoppaOver") {
            obesvarade++;
            continue;
          }

          const partiRost = f.partiRoster[parti.kod];
          if (!partiRost) {
            obesvarade++;
            continue;
          }

          const arLika = svar === partiRost;
          if (arLika) lika++;
          else olika++;

          jamforelser.push({
            fraga: f,
            minRost: svar,
            partiRost,
            arLika,
          });
        }

        const totaltGemensamma = lika + olika;
        const procentMatch = totaltGemensamma > 0 ? Math.round((lika / totaltGemensamma) * 100) : 0;

        return {
          parti,
          lika,
          olika,
          totaltGemensamma,
          procentMatch,
          jamforelser,
        };
      })
      .sort((a, b) => b.procentMatch - a.procentMatch || b.totaltGemensamma - a.totaltGemensamma);
  }, [partierQuery.data, fragor, lokalaSvar, skuggroster]);

  const besvaradeAntal = Object.values(lokalaSvar).filter((s) => s !== "HoppaOver").length;

  return (
    <div>
      <Sidhuvud
        rubrik="Riksdagskompassen"
        lead="Vad partierna faktiskt har röstat – inte vad de påstår i enkäter. Svara på verkliga beslutspunkter i kammaren och se vilket parti som agerat mest i linje med dina åsikter. 100 % anonymt i din webbläsare."
        barn={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Noll serverspårning – dina svar lämnar aldrig din enhet.</span>
          </div>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {!arStartad ? (
          /* STARTVY */
          <div className="space-y-8">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-2.5 text-primary mb-2">
                <Compass className="h-6 w-6" />
                <span className="text-sm font-semibold tracking-wide uppercase">
                  Faktabaserad väljarguide
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-normal text-foreground">
                Handling väger tyngre än ord
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Vanliga valkompasser bygger på enkäter där partiernas pressavdelningar kryssar i vad
                de tycker låter bäst. Insikts Riksdagskompass utgår uteslutande från{" "}
                <strong>faktiska voteringar i kammaren</strong> under mandatperioden.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setValdTyp("snabb")}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    valdTyp === "snabb"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-background hover:bg-accent/40"
                  }`}
                >
                  <span className="font-semibold text-foreground text-sm">Snabbkompassen</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    10 centrala riksdagsbeslut som tydligast delar partierna.
                  </span>
                  <span className="mt-3 text-[11px] font-medium text-primary">
                    Tar ca 2 minuter
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setValdTyp("stor")}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    valdTyp === "stor"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-background hover:bg-accent/40"
                  }`}
                >
                  <span className="font-semibold text-foreground text-sm">Stora kompassen</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    20 voteringar som spänner över alla stora politikområden.
                  </span>
                  <span className="mt-3 text-[11px] font-medium text-primary">
                    Tar ca 4 minuter
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setValdTyp("amne")}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    valdTyp === "amne"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-background hover:bg-accent/40"
                  }`}
                >
                  <span className="font-semibold text-foreground text-sm">Sakfråge-kompass</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Fokusera på ett specifikt ämne du bryr dig mest om.
                  </span>
                  <span className="mt-3 text-[11px] font-medium text-primary">Välj ämne nedan</span>
                </button>
              </div>

              {valdTyp === "amne" ? (
                <div className="mt-6 pt-6 border-t border-border">
                  <label
                    htmlFor="sakfraga-val"
                    className="block text-xs font-medium text-muted-foreground mb-2"
                  >
                    Välj ämnesområde att testa dig mot:
                  </label>
                  <select
                    id="sakfraga-val"
                    value={valdSakfraga}
                    onChange={(e) => setValdSakfraga(e.target.value)}
                    className="h-10 w-full sm:w-80 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Alla sakfrågor</option>
                    {sakfragorQuery.data?.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.namn}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>
                    {fragorQuery.isPending
                      ? "Hämtar aktuella voteringar …"
                      : `${fragor.length} skarpa riksdagsbeslut redo`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={startaKompass}
                  disabled={fragorQuery.isPending || fragor.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <span>Starta kompassen</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : visarResultat ? (
          /* RESULTATVY */
          <div className="space-y-8">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/60 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 p-1 text-primary">
                      <Compass className="h-5 w-5" />
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      Ditt kompassresultat
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Baserat på dina <strong>{besvaradeAntal}</strong> ställningstaganden i verkliga
                    riksdagsomröstningar.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setArStartad(false);
                      setVisarResultat(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Gör om kompassen</span>
                  </button>
                </div>
              </div>

              {/* Toppmatchnings-banner */}
              {matchResultat[0] && matchResultat[0].totaltGemensamma > 0 ? (
                <div className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Störst överensstämmelse i kammaren
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                      {matchResultat[0].parti.namn} ({matchResultat[0].parti.kod})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Partiet har röstat i linje med dina val i {matchResultat[0].lika} av{" "}
                      {matchResultat[0].totaltGemensamma} omröstningar.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl sm:text-4xl font-extrabold text-primary">
                      {matchResultat[0].procentMatch} %
                    </span>
                    <span className="block text-[11px] text-muted-foreground">röstlikhet</span>
                  </div>
                </div>
              ) : null}

              {/* Partiernas rangordning */}
              <div className="mt-8 space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Alla partiers matchningsgrad
                </h3>

                <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
                  {matchResultat.map((res) => {
                    const vald = granskaParti === res.parti.kod;
                    return (
                      <div key={res.parti.kod} className="p-4 transition-colors hover:bg-accent/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <PartiMarke kod={res.parti.kod} farg={res.parti.farg} />
                            <div className="min-w-0">
                              <span className="font-semibold text-sm text-foreground">
                                {res.parti.namn}
                              </span>
                              <span className="text-xs text-muted-foreground block sm:inline sm:ml-2">
                                {res.lika} av {res.totaltGemensamma} voteringar lika
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="w-28 sm:w-36 bg-muted rounded-full h-2.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${res.procentMatch}%`,
                                  backgroundColor: res.parti.farg ?? "var(--color-primary)",
                                }}
                              />
                            </div>
                            <span className="w-12 text-right font-bold text-sm text-foreground">
                              {res.procentMatch} %
                            </span>

                            <button
                              type="button"
                              onClick={() => setGranskaParti(vald ? null : res.parti.kod)}
                              className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer ml-1"
                            >
                              <span>{vald ? "Dölj" : "Granska"}</span>
                              {vald ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Utfälld granskning fråga för fråga */}
                        {vald ? (
                          <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Jämförelse votering för votering mot {res.parti.namn}:
                            </p>
                            <div className="grid gap-2">
                              {res.jamforelser.map((j) => (
                                <div
                                  key={j.fraga.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-[var(--yta)] p-3 text-xs border border-border/50"
                                >
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      {j.arLika ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                      )}
                                      <Link
                                        to="/voteringar/$id"
                                        params={{ id: j.fraga.id }}
                                        className="font-medium hover:underline text-foreground truncate inline-flex items-center gap-1"
                                      >
                                        <span>{j.fraga.rubrik}</span>
                                        <ExternalLink className="h-3 w-3 opacity-60" />
                                      </Link>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground pl-5.5">
                                      {j.fraga.beteckning}{" "}
                                      {j.fraga.datum ? `· ${datum(j.fraga.datum)}` : ""}
                                    </p>
                                    {j.fraga.sammanfattning ? (
                                      <details className="mt-1.5 pl-5.5 text-xs text-muted-foreground">
                                        <summary className="cursor-pointer text-[11px] font-medium text-purple-700 dark:text-purple-300 hover:underline inline-flex items-center gap-1">
                                          <span>
                                            Visa hur omröstningen gick (AI-sammanfattning)
                                          </span>
                                        </summary>
                                        <div className="mt-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-[11px] leading-relaxed text-foreground space-y-1.5">
                                          {j.fraga.sammanfattning.split("\n\n").map((s, idx) => (
                                            <p key={idx}>{s}</p>
                                          ))}
                                        </div>
                                      </details>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-3 self-start sm:self-center pl-5.5 sm:pl-0 flex-shrink-0">
                                    <span className="text-[11px] text-muted-foreground">
                                      Du: <strong className="text-foreground">{j.minRost}</strong>
                                    </span>
                                    <span className="text-muted-foreground">·</span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {res.parti.kod}:{" "}
                                      <strong
                                        className={
                                          j.arLika
                                            ? "text-emerald-700 dark:text-emerald-300"
                                            : "text-rose-700 dark:text-rose-300"
                                        }
                                      >
                                        {j.partiRost}
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
              </div>

              {/* Korslänkning till valkrets och bevakningar */}
              <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Dina röster finns sparade i webbläsaren. Se dina resultat mot ledamöter i din
                    valkrets:
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/valkretsar"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
                  >
                    <span>Matcha mot min valkrets →</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STEG-FÖR-STEG FRÅGEVY */
          <div className="space-y-6">
            {/* Progressindikator */}
            <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  if (fragaIndex > 0) setFragaIndex((i) => i - 1);
                  else setArStartad(false);
                }}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{fragaIndex === 0 ? "Avbryt" : "Föregående fråga"}</span>
              </button>

              <span className="font-medium">
                Fråga {fragaIndex + 1} av {fragor.length}
              </span>

              <button
                type="button"
                onClick={() => setVisarResultat(true)}
                className="hover:text-foreground underline transition-colors cursor-pointer"
              >
                Avsluta & se resultat
              </button>
            </div>

            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((fragaIndex + 1) / fragor.length) * 100}%` }}
              />
            </div>

            {/* Frågekort */}
            {aktivFraga ? (
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                      {aktivFraga.beteckning}
                    </span>
                    {aktivFraga.sakfragor[0] ? (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                        {aktivFraga.sakfragor[0].replace(/-/g, " ")}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">{datum(aktivFraga.datum)}</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground">
                    {aktivFraga.rubrik}
                  </h3>

                  {aktivFraga.gallde ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {aktivFraga.gallde}
                    </p>
                  ) : null}
                </div>

                {/* AI-sammanfattning i klartext (endast sakfrågebakgrund under frågestadiet så att utfall inte avslöjas) */}
                <KompassFragaSammanfattning
                  voteringId={aktivFraga.id}
                  initialSammanfattning={aktivFraga.sammanfattning}
                  bakgrund={aktivFraga.bakgrund}
                  tillrackligtUnderlag={aktivFraga.tillrackligtUnderlag}
                  visaUtfall={false}
                />

                {/* Förklaringsboxar vad JA och NEJ innebär */}
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      JA innebär:
                    </span>
                    <p className="text-xs font-medium text-foreground">
                      {aktivFraga.jaInnebord.rubrik}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {aktivFraga.jaInnebord.beskrivning}
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                      <ThumbsDown className="h-3.5 w-3.5" />
                      NEJ innebär:
                    </span>
                    <p className="text-xs font-medium text-foreground">
                      {aktivFraga.nejInnebord.rubrik}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {aktivFraga.nejInnebord.beskrivning}
                    </p>
                  </div>
                </div>

                {/* Svarsknappar */}
                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-xs font-medium text-muted-foreground text-center">
                    Hur skulle du ha röstat i riksdagens kammare?
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => svara("Ja")}
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 active:scale-98 transition-all cursor-pointer shadow-2xs"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>Ja</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => svara("Nej")}
                      className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 active:scale-98 transition-all cursor-pointer shadow-2xs"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      <span>Nej</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => svara("Avstår")}
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 active:scale-98 transition-all cursor-pointer shadow-2xs"
                    >
                      <MinusCircle className="h-4 w-4" />
                      <span>Avstår</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => svara("HoppaOver")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-4 py-3 text-xs font-medium text-muted-foreground hover:bg-accent active:scale-98 transition-all cursor-pointer"
                    >
                      <span>Hoppa över</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Laddar text="Laddar frågan …" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
