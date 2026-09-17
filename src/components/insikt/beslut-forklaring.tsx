import { BeslutsAnalys } from "@/lib/beslut-analys";

interface RostGuideProps {
  analys: BeslutsAnalys;
}

/**
 * Pedagogisk guide som förklarar vad en Ja- respektive Nej-röst
 * faktiskt innebar i praktiken för denna specifika omröstning.
 */
export function RostGuideKlartext({ analys }: RostGuideProps) {
  return (
    <div className="rounded-xl border border-border bg-[var(--yta)] p-4 sm:p-5 text-sm space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3">
        <div className="space-y-0.5">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <span>Så fungerade röstningen</span>
            <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
              I klartext
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            I riksdagen ställs alltid utskottets förslag mot ett motförslag (oftast en reservation).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* JA-röst */}
        <div className="rounded-lg border border-border/90 bg-background p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-white bg-[var(--rost-ja)]">
              <span>▲ JA-röst</span>
            </span>
            <span className="text-xs text-muted-foreground font-medium">Utskottets förslag</span>
          </div>
          <p className="font-medium text-foreground text-sm">{analys.ja.rubrik}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{analys.ja.beskrivning}</p>
        </div>

        {/* NEJ-röst */}
        <div className="rounded-lg border border-border/90 bg-background p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-white bg-[var(--rost-nej)]">
              <span>▼ NEJ-röst</span>
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {analys.motPartier ? `Reservation (${analys.motPartier})` : "Motförslaget"}
            </span>
          </div>
          <p className="font-medium text-foreground text-sm">{analys.nej.rubrik}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{analys.nej.beskrivning}</p>
        </div>
      </div>
    </div>
  );
}

interface UtfallKlartextProps {
  analys: BeslutsAnalys;
}

/**
 * Förklarar kammarens slutgiltiga beslut i vardagsspråk,
 * och reder ut vanliga missuppfattningar om "Ja"- och "Nej"-segrar.
 */
export function BeslutsUtfallKlartext({ analys }: UtfallKlartextProps) {
  if (!analys.utfall) return null;

  const { etikett, statusTyp, forklaring, tips } = analys.utfall;

  const fargKlass =
    statusTyp === "avslag"
      ? "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200"
      : statusTyp === "bifall"
        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200"
        : "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-200";

  const badgeKlass =
    statusTyp === "avslag"
      ? "bg-amber-600/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
      : statusTyp === "bifall"
        ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
        : "bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30";

  return (
    <div className={`rounded-xl border p-4 sm:p-5 space-y-3 ${fargKlass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Beslutets innebörd i klartext
        </span>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${badgeKlass}`}
        >
          {statusTyp === "avslag" ? "✕ " : statusTyp === "bifall" ? "✓ " : ""}
          {etikett}
        </span>
      </div>

      <p className="text-sm font-medium text-foreground leading-relaxed">{forklaring}</p>

      {tips ? (
        <div className="rounded-lg bg-background/80 border border-border/70 p-3 text-xs text-muted-foreground leading-relaxed space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <span>💡 Hur ska man förstå resultatet?</span>
          </p>
          <p>{tips}</p>
        </div>
      ) : null}
    </div>
  );
}
