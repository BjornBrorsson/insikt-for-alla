import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export function Laddar({
  rader = 4,
  text = "Hämtar uppgifter …",
}: {
  rader?: number;
  text?: string;
}) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">{text}</p>
      {Array.from({ length: rader }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function Tomt({ rubrik, text, barn }: { rubrik: string; text: string; barn?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-[var(--yta)] p-8 text-center">
      <p className="rubrik text-xl">{rubrik}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
      {barn ? <div className="mt-4 flex flex-wrap justify-center gap-2">{barn}</div> : null}
    </div>
  );
}

export function Fel({ fel, forsokIgen }: { fel: unknown; forsokIgen?: () => void }) {
  const meddelande = fel instanceof Error ? fel.message : "Okänt fel";
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm"
    >
      <p className="font-medium">Uppgifterna kunde inte hämtas</p>
      <p className="mt-1 text-muted-foreground">
        Inget innehåll visas hellre än felaktigt innehåll. Tekniskt meddelande: {meddelande}
      </p>
      {forsokIgen ? (
        <button
          type="button"
          onClick={forsokIgen}
          className="mt-4 rounded-md border border-input px-3 py-2 hover:bg-accent"
        >
          Försök igen
        </button>
      ) : null}
    </div>
  );
}

/** Liten notis om att en siffra är Insikts egen beräkning. */
export function EgenBerakning({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      <span className="font-medium">Insikts egen beräkning.</span> {children}
    </p>
  );
}

export function Kalla({
  url,
  text = "Öppna originalkällan hos riksdagen",
}: {
  url: string | null;
  text?: string;
}) {
  if (!url) {
    return <p className="text-xs text-muted-foreground">Källänk saknas för den här uppgiften.</p>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="text-sm text-[var(--accent-insikt)] underline underline-offset-2"
    >
      {text} <span aria-hidden="true">↗</span>
      <span className="sr-only"> (öppnas i ny flik)</span>
    </a>
  );
}

export function Sidhuvud({
  rubrik,
  lead,
  barn,
}: {
  rubrik: string;
  lead?: string;
  barn?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-[var(--yta)]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl sm:text-4xl">{rubrik}</h1>
        {lead ? <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{lead}</p> : null}
        {barn ? <div className="mt-5">{barn}</div> : null}
      </div>
    </div>
  );
}
