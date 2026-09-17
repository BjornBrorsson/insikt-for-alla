import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, ExternalLink } from "lucide-react";

import { getMotion, type MotionInfo } from "@/lib/insikt.functions";
import { datum, rensaHtml } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Laddar } from "@/components/insikt/tillstand";
import { PartiMarke } from "@/components/insikt/delar";
import { hittaTerm, skapaTermRegex, type Term } from "@/lib/ordlista";
import { OrdlistaTerm } from "@/components/insikt/ordlista-term";

type MatchDel =
  | { type: "motion"; start: number; end: number; beteckning: string }
  | { type: "term"; start: number; end: number; term: Term; text: string };

/**
 * TextMedMotioner
 *
 * 1. Rensar råa HTML-taggar (<BR/>, <br>, etc.) till ren text.
 * 2. Hittar alla motionsbeteckningar (t.ex. 2025/26:4215 eller 2024/25:123).
 * 3. Känner av riksdagstermer och renderar interaktiva förklaringsrutor vid hover/fokus/tap.
 * 4. Gör motionsbeteckningar klickbara för att öppna modal med motionens yrkanden.
 */
export function TextMedMotioner({
  text,
  className = "",
  inkluderaOrdlista = true,
}: {
  text: string | null | undefined;
  className?: string;
  inkluderaOrdlista?: boolean;
}) {
  const [valdMotion, setValdMotion] = useState<string | null>(null);

  if (!text) return null;

  // Rensa HTML-taggar (<BR/>) och HTML-entiteter (&ouml;, &#160; osv.)
  const renText = rensaHtml(text);

  const matches: MatchDel[] = [];

  // 1. Regex för att matcha motionsbeteckningar som t.ex. 2025/26:4215 eller 2024/25:12
  const motionRegex = /\b(\d{4}\/\d{2}:\d+)\b/g;
  let m: RegExpExecArray | null;

  while ((m = motionRegex.exec(renText)) !== null) {
    matches.push({
      type: "motion",
      start: m.index,
      end: m.index + m[0].length,
      beteckning: m[1] ?? m[0],
    });
  }

  // 2. Regex för att matcha ordlistetermer
  if (inkluderaOrdlista) {
    const termRegex = skapaTermRegex();
    const seddaTermer = new Set<string>();

    while ((m = termRegex.exec(renText)) !== null) {
      const matchStart = m.index;
      const matchEnd = m.index + m[0].length;
      const matchText = m[1] ?? m[0];
      const hittad = hittaTerm(matchText);
      if (!hittad) continue;

      // Visa bara första förekomsten av samma term i detta stycke så att texten inte blir plottrig
      if (seddaTermer.has(hittad.slug)) continue;

      // Undvik överlapp med motionslänkar eller tidigare matchningar
      const krockar = matches.some(
        (mat) =>
          (matchStart >= mat.start && matchStart < mat.end) ||
          (matchEnd > mat.start && matchEnd <= mat.end),
      );
      if (krockar) continue;

      seddaTermer.add(hittad.slug);
      matches.push({
        type: "term",
        start: matchStart,
        end: matchEnd,
        term: hittad,
        text: matchText,
      });
    }
  }

  // Sortera i kronologisk ordning
  matches.sort((a, b) => a.start - b.start);

  const segment: (string | MatchDel)[] = [];
  let sistaIndex = 0;

  for (const match of matches) {
    if (match.start > sistaIndex) {
      segment.push(renText.slice(sistaIndex, match.start));
    }
    segment.push(match);
    sistaIndex = match.end;
  }

  if (sistaIndex < renText.length) {
    segment.push(renText.slice(sistaIndex));
  }

  return (
    <span className={className}>
      {segment.map((del, i) => {
        if (typeof del === "string") {
          return <span key={i}>{del}</span>;
        }

        if (del.type === "motion") {
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setValdMotion(del.beteckning);
              }}
              className="inline-flex items-center gap-1 rounded bg-[var(--accent-insikt-svag)] px-1.5 py-0.5 font-mono text-xs font-medium text-[var(--accent-insikt)] hover:bg-[var(--accent-insikt)] hover:text-white transition-colors cursor-pointer mx-1 align-baseline shadow-2xs"
              title={`Klicka för att läsa motion ${del.beteckning} och dess förslag`}
            >
              <FileText className="h-3 w-3 inline" />
              <span className="underline underline-offset-2">{del.beteckning}</span>
            </button>
          );
        }

        if (del.type === "term") {
          return <OrdlistaTerm key={i} term={del.term} matchadText={del.text} />;
        }

        return null;
      })}

      {valdMotion ? (
        <MotionModal
          beteckning={valdMotion}
          open={!!valdMotion}
          onOpenChange={(open) => {
            if (!open) setValdMotion(null);
          }}
        />
      ) : null}
    </span>
  );
}

/**
 * TextMedOrdlista
 *
 * Alias för TextMedMotioner med ordlisteförklaringar aktiverade.
 */
export function TextMedOrdlista({
  text,
  className = "",
}: {
  text: string | null | undefined;
  className?: string;
}) {
  return <TextMedMotioner text={text} className={className} inkluderaOrdlista={true} />;
}

/**
 * MotionModal
 *
 * Visar information, yrkanden och sammanfattning av en motion hämtad från data.riksdagen.se
 */
export function MotionModal({
  beteckning,
  open,
  onOpenChange,
}: {
  beteckning: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const hamtaMotion = useServerFn(getMotion);

  const query = useQuery({
    queryKey: ["motion", beteckning],
    queryFn: () => hamtaMotion({ data: { beteckning } }),
    enabled: open && !!beteckning,
    staleTime: 1000 * 60 * 30, // 30 minuter cache
  });

  const motion = query.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5">Motion</span>
            <span>{beteckning}</span>
            {motion?.organ ? <span>· Utskott: {motion.organ}</span> : null}
          </div>

          <DialogTitle className="text-xl font-normal text-left mt-1.5 leading-snug">
            {motion?.typrubrik ?? `Motion ${beteckning}`}
          </DialogTitle>

          {motion?.titel ? (
            <p className="text-sm text-muted-foreground text-left italic">{motion.titel}</p>
          ) : null}
        </DialogHeader>

        {query.isPending ? (
          <div className="py-8">
            <Laddar text={`Hämtar motion ${beteckning} från Riksdagens öppna data …`} />
          </div>
        ) : query.isError || !motion ? (
          <div className="py-6 text-center text-sm space-y-3">
            <p className="text-muted-foreground">
              Kunde inte hämta detaljerad information om motionen från riksdagens öppna data.
            </p>
            <a
              href={`https://data.riksdagen.se/dokumentlista/?sok=${encodeURIComponent(beteckning)}&doktyp=mot`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-insikt)] underline"
            >
              Sök motionen direkt på data.riksdagen.se <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <div className="space-y-6 pt-2 text-sm text-foreground">
            {/* Undertecknare */}
            {motion.undertecknare.length > 0 ? (
              <div className="rounded-lg bg-[var(--yta)] p-3 text-xs">
                <span className="font-medium text-muted-foreground block mb-1.5">
                  Undertecknad av:
                </span>
                <div className="flex flex-wrap gap-2">
                  {motion.undertecknare.map((u, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5"
                    >
                      <PartiMarke kod={u.parti} />
                      <span className="font-medium">{u.namn}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Yrkanden / Förslag i motionen */}
            {motion.yrkanden.length > 0 ? (
              <div>
                <h3 className="text-base font-medium mb-2.5">
                  Motionens yrkanden ({motion.yrkanden.length})
                </h3>
                <div className="space-y-2.5">
                  {motion.yrkanden.map((y) => (
                    <div
                      key={y.nummer}
                      className="rounded-lg border border-border bg-card p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-[var(--accent-insikt)]">Yrkande {y.nummer}</span>
                        {y.utskottet ? (
                          <span className="text-muted-foreground">
                            Utskottets ställningstagande: <strong>{y.utskottet}</strong>
                          </span>
                        ) : null}
                      </div>
                      <p className="text-foreground leading-relaxed">{y.lydelse}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Motivering / Bakgrund */}
            {motion.motivering ? (
              <div>
                <h3 className="text-base font-medium mb-1.5">Motivering ur motionen</h3>
                <div className="rounded-lg border border-border/80 bg-background p-3.5 text-xs leading-relaxed text-muted-foreground max-h-56 overflow-y-auto whitespace-pre-line">
                  {motion.motivering}
                </div>
              </div>
            ) : null}

            {/* Footer med länk till riksdagen */}
            <div className="flex flex-wrap items-center justify-between border-t border-border pt-4 text-xs">
              <span className="text-muted-foreground">Datum: {datum(motion.datum)}</span>
              <a
                href={motion.kalla_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-medium text-[var(--accent-insikt)] hover:underline"
              >
                Öppna fulltext hos Riksdagen ↗
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
