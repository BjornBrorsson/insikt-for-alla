import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { antal as fmtAntal, ledamotsnamn, procent, rostStil, ROSTER } from "@/lib/format";
import { useBevakningar, type BevakningsTyp } from "@/lib/bevakningar";
import type { Ledamot } from "@/lib/insikt.functions";

/** Partibeteckning. Färg används enbart som orientering, aldrig som enda signal. */
export function PartiMarke({ kod, farg }: { kod: string | null; farg?: string | null }) {
  if (!kod) return <span className="text-xs text-muted-foreground">Partilös</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-full border border-border"
        style={farg ? { backgroundColor: farg } : undefined}
      />
      {kod === "-" ? "Partilös" : kod}
    </span>
  );
}

export function Bevaka({ typ, id, etikett }: { typ: BevakningsTyp; id: string; etikett: string }) {
  const { foljer, vaxla, laddad } = useBevakningar();
  const aktiv = foljer(typ, id);
  return (
    <button
      type="button"
      disabled={!laddad}
      onClick={() => {
        const nu = vaxla(typ, id);
        toast(nu ? `Följer ${etikett}` : `Slutade följa ${etikett}`, {
          description: "Bevakningen sparas bara i den här webbläsaren.",
        });
      }}
      aria-pressed={aktiv}
      aria-label={aktiv ? `Sluta bevaka ${etikett}` : `Bevaka ${etikett}`}
      className={`rounded-md border px-3 py-2 text-sm ${
        aktiv
          ? "border-[var(--accent-insikt)] bg-[var(--accent-insikt-svag)]"
          : "border-input hover:bg-accent"
      }`}
    >
      {aktiv ? "★ Följer" : "☆ Följ"}
    </button>
  );
}

/**
 * Röstfördelning. Varje del har färg, mönstertecken och siffra så att diagrammet
 * går att läsa utan färgseende.
 */
export function RostDiagram({
  ja,
  nej,
  avstar,
  franvarande,
  kompakt = false,
}: {
  ja: number;
  nej: number;
  avstar: number;
  franvarande: number;
  kompakt?: boolean;
}) {
  const varden: Record<string, number> = {
    Ja: ja,
    Nej: nej,
    Avstår: avstar,
    Frånvarande: franvarande,
  };
  const summa = ja + nej + avstar + franvarande;
  if (summa === 0) {
    return <p className="text-xs text-muted-foreground">Inga registrerade röster.</p>;
  }
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full border border-border"
        role="img"
        aria-label={ROSTER.map((r) => `${r}: ${varden[r]}`).join(", ")}
      >
        {ROSTER.map((r) =>
          varden[r] ? (
            <span
              key={r}
              className={rostStil[r]!.klass}
              style={{ width: `${(varden[r]! / summa) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 ${kompakt ? "text-xs" : "text-sm"}`}>
        {ROSTER.map((r) => (
          <li key={r} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`inline-block h-2.5 w-2.5 rounded-sm ${rostStil[r]!.klass}`}
            />
            <span aria-hidden className="text-muted-foreground">
              {rostStil[r]!.tecken}
            </span>
            <span>
              {r} {fmtAntal(varden[r] ?? 0)}
            </span>
            <span className="text-muted-foreground">({procent(varden[r] ?? 0, summa)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RostMarke({ rost }: { rost: string }) {
  const stil = rostStil[rost];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        aria-hidden
        className={`inline-block h-2.5 w-2.5 rounded-sm ${stil?.klass ?? "bg-muted"}`}
      />
      <span aria-hidden>{stil?.tecken ?? "?"}</span>
      {rost}
    </span>
  );
}

export function LedamotKort({ ledamot }: { ledamot: Ledamot }) {
  return (
    <Link
      to="/ledamoter/$id"
      params={{ id: ledamot.id }}
      className="flex gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent"
    >
      {ledamot.bild_url_liten ? (
        <img
          src={ledamot.bild_url_liten}
          alt={`Porträtt av ${ledamotsnamn(ledamot)}`}
          loading="lazy"
          className="h-16 w-12 rounded object-cover"
        />
      ) : (
        <div className="flex h-16 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
          Ingen bild
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium">{ledamotsnamn(ledamot)}</p>
        <div className="mt-0.5">
          <PartiMarke kod={ledamot.parti} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {ledamot.valkrets ?? "Valkrets saknas"}
        </p>
        {ledamot.status !== "Tjänstgörande riksdagsledamot" ? (
          <p className="text-xs text-muted-foreground">{ledamot.status ?? "Status saknas"}</p>
        ) : null}
      </div>
    </Link>
  );
}
