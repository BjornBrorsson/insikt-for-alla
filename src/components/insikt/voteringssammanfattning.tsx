import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getVoteringsSammanfattning } from "@/lib/insikt.functions";
import { TextMedMotioner } from "@/components/insikt/motion-modal";

interface Props {
  voteringId: string;
}

/**
 * AI-genererad sammanfattning av en votering i klartext.
 * Genereras vid första besöket och cachas sedan i databasen.
 */
export function VoteringsSammanfattning({ voteringId }: Props) {
  const hamta = useServerFn(getVoteringsSammanfattning);
  const query = useQuery({
    queryKey: ["voteringssammanfattning", voteringId],
    queryFn: () => hamta({ data: { id: voteringId } }),
    staleTime: Infinity,
    retry: 1,
  });

  // Visa ingenting alls om funktionen inte är påslagen i miljön.
  if (query.data?.status === "ej_konfigurerad" || query.data?.status === "saknas") return null;

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-normal">Omröstningen i korthet</h2>
        <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
          AI-genererad sammanfattning
        </span>
      </div>

      {query.isPending ? (
        <div className="mt-4 space-y-2 animate-pulse" aria-live="polite" aria-busy="true">
          <div className="h-3 w-11/12 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-4/5 rounded bg-muted" />
          <p className="pt-1 text-xs text-muted-foreground">
            Skriver en sammanfattning i klartext … det kan ta några sekunder första gången.
          </p>
        </div>
      ) : query.data?.status === "for_mycket_trafik" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            {query.data.orsak === "ip"
              ? "Kunde inte generera sammanfattning. Du har begärt många sammanfattningar på kort tid – vänta en stund och försök igen."
              : "Kunde inte generera sammanfattning. För mycket trafik just nu – försök igen senare."}
          </span>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
          >
            Försök igen
          </button>
        </div>
      ) : query.isError || !query.data ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Sammanfattningen kunde inte tas fram just nu.</span>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
          >
            Försök igen
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground">
          <div className="whitespace-pre-line">
            <TextMedMotioner text={query.data.sammanfattning.sammanfattning} />
          </div>

          {!query.data.sammanfattning.tillrackligt_underlag ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              Varning: Underlaget var begränsat, så sammanfattningen kan vara ofullständig.
            </div>
          ) : null}

          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            Modell: {query.data.sammanfattning.modell} ·{" "}
            {query.data.sammanfattning.granskad ? "Granskad av redaktion" : "Automatgenererad"} ·
            Sammanfattningen är ett hjälpmedel – de exakta uppgifterna finns i avsnitten nedan och i
            riksdagens källa.
          </p>
        </div>
      )}
    </section>
  );
}
