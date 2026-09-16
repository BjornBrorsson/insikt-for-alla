import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  CheckCircle2,
  Lock,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useProfil, type SkuggRostTyp } from "@/lib/profil";
import { PartiMarke } from "@/components/insikt/delar";
import { cn } from "@/lib/utils";

interface SkuggRostaKortProps {
  voteringId: string;
  voteringResultat?: {
    ja: number;
    nej: number;
    avstar: number;
    franvarande: number;
    vinnare?: string | null;
  };
  partitotaler?: {
    parti: string;
    ja: number;
    nej: number;
    avstar: number;
  }[];
  className?: string;
}

export function SkuggRostaKort({
  voteringId,
  voteringResultat,
  partitotaler = [],
  className = "",
}: SkuggRostaKortProps) {
  const { minSkuggrost, skuggrosta, taBortSkuggrost, laddad } = useProfil();
  const valdRost = minSkuggrost(voteringId);
  const [bekraftad, setBekraftad] = useState(false);

  if (!laddad) return null;

  const hanteraRost = (rost: SkuggRostTyp) => {
    if (valdRost === rost) {
      taBortSkuggrost(voteringId);
      setBekraftad(false);
    } else {
      skuggrosta(voteringId, rost);
      setBekraftad(true);
      setTimeout(() => setBekraftad(false), 2500);
    }
  };

  // Beräkna kammarens vinnande alternativ
  const kammarensBeslut: "Ja" | "Nej" | "Avstår" =
    voteringResultat && voteringResultat.ja > voteringResultat.nej
      ? "Ja"
      : voteringResultat && voteringResultat.nej > voteringResultat.ja
        ? "Nej"
        : "Avstår";

  const stammerMedKammaren = valdRost && valdRost === kammarensBeslut;

  // Analysera vilka partier som röstade som användaren
  const partierSomRostadeLikt: string[] = [];
  const partierSomRostadeOlikt: string[] = [];

  if (valdRost && partitotaler.length > 0) {
    for (const p of partitotaler) {
      const partiVinnare =
        p.ja > p.nej && p.ja > p.avstar
          ? "Ja"
          : p.nej > p.ja && p.nej > p.avstar
            ? "Nej"
            : "Avstår";

      if (partiVinnare === valdRost) {
        partierSomRostadeLikt.push(p.parti);
      } else {
        partierSomRostadeOlikt.push(p.parti);
      }
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-5 relative overflow-hidden",
        valdRost ? "border-primary/40 bg-primary/[0.02]" : "",
        className,
      )}
      aria-label="Skuggrösta i denna omröstning"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-foreground">
              Hur skulle du rösta? (Skuggrösta)
            </h3>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Ta ställning och se hur ditt val matchar riksdagen och de olika partierna.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>100 % anonymt i din webbläsare</span>
        </div>
      </div>

      {/* Röstknappar */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {/* JA */}
          <button
            type="button"
            onClick={() => hanteraRost("Ja")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border p-3 sm:p-4 text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              valdRost === "Ja"
                ? "border-emerald-600 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs ring-2 ring-emerald-500/30"
                : "border-border bg-background hover:bg-emerald-500/5 text-foreground hover:border-emerald-500/40",
            )}
            aria-pressed={valdRost === "Ja"}
          >
            <ThumbsUp
              className={cn(
                "h-5 w-5",
                valdRost === "Ja" ? "text-emerald-600" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <span className="text-sm">Ja</span>
          </button>

          {/* NEJ */}
          <button
            type="button"
            onClick={() => hanteraRost("Nej")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border p-3 sm:p-4 text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              valdRost === "Nej"
                ? "border-rose-600 bg-rose-500/15 text-rose-900 dark:text-rose-100 font-semibold shadow-xs ring-2 ring-rose-500/30"
                : "border-border bg-background hover:bg-rose-500/5 text-foreground hover:border-rose-500/40",
            )}
            aria-pressed={valdRost === "Nej"}
          >
            <ThumbsDown
              className={cn(
                "h-5 w-5",
                valdRost === "Nej" ? "text-rose-600" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <span className="text-sm">Nej</span>
          </button>

          {/* AVSTÅR */}
          <button
            type="button"
            onClick={() => hanteraRost("Avstår")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border p-3 sm:p-4 text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              valdRost === "Avstår"
                ? "border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-100 font-semibold shadow-xs ring-2 ring-amber-500/30"
                : "border-border bg-background hover:bg-amber-500/5 text-foreground hover:border-amber-500/40",
            )}
            aria-pressed={valdRost === "Avstår"}
          >
            <MinusCircle
              className={cn(
                "h-5 w-5",
                valdRost === "Avstår" ? "text-amber-600" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <span className="text-sm">Avstår</span>
          </button>
        </div>

        {bekraftad ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1 animate-in fade-in duration-150">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Din skuggröst sparades lokalt!
          </p>
        ) : null}
      </div>

      {/* Resultat & Matchning om användaren har röstat */}
      {valdRost ? (
        <div className="rounded-xl border border-border bg-background p-4 sm:p-5 space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Du har röstat:</span>
              <span className="rounded px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {valdRost}
              </span>
            </div>
            <button
              type="button"
              onClick={() => taBortSkuggrost(voteringId)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Ta bort röst
            </button>
          </div>

          {/* Jämförelse med kammarens beslut */}
          {voteringResultat ? (
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5 border border-border/50">
              <p className="font-medium text-foreground flex items-center gap-1.5">
                {stammerMedKammaren ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Du röstade med riksdagens majoritet!
                  </>
                ) : (
                  <>
                    <MinusCircle className="h-4 w-4 text-amber-600" />
                    Du röstade mot riksdagens majoritet.
                  </>
                )}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Riksdagens beslut blev <strong>{kammarensBeslut}</strong> med {voteringResultat.ja}{" "}
                Ja, {voteringResultat.nej} Nej och {voteringResultat.avstar} Avstår.
              </p>
            </div>
          ) : null}

          {/* Partimatchning */}
          {partitotaler.length > 0 ? (
            <div className="space-y-2 text-xs">
              <p className="font-medium text-foreground">Partier som röstade som du:</p>
              <div className="flex flex-wrap gap-2 items-center">
                {partierSomRostadeLikt.length > 0 ? (
                  partierSomRostadeLikt.map((parti) => <PartiMarke key={parti} kod={parti} />)
                ) : (
                  <span className="text-muted-foreground italic">
                    Inget riksdagsparti hade {valdRost} som majoritetsröst i denna votering.
                  </span>
                )}
              </div>

              {partierSomRostadeOlikt.length > 0 ? (
                <div className="pt-2 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground block mb-1.5">
                    Övriga partier röstade annorlunda:
                  </span>
                  <div className="flex flex-wrap gap-1.5 opacity-75">
                    {partierSomRostadeOlikt.map((parti) => (
                      <PartiMarke key={parti} kod={parti} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Se alla dina sparade skuggröster och bevakningar
            </span>
            <Link
              to="/bevakningar"
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              Mina bevakningar &amp; röster
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
