import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sidhuvud } from "@/components/insikt/tillstand";
import { TERMER, type Term } from "@/lib/ordlista";

export const Route = createFileRoute("/ordlista")({
  head: () => ({
    meta: [
      { title: "Ordlista — Riksdagstermer förklarade | Insikt" },
      {
        name: "description",
        content:
          "Sökbar ordlista med begripliga förklaringar av riksdagens begrepp: motioner, propositioner, betänkanden, reservationer, voteringar, utskott och kvittning.",
      },
    ],
  }),
  component: Ordlista,
});

function Ordlista() {
  const [sok, setSok] = useState("");
  const [valdKategori, setValdKategori] = useState<string>("alla");

  const kategorier = ["alla", ...new Set(TERMER.map((t) => t.kategori))];

  const filtrerade = TERMER.filter((t) => {
    const matchSok =
      !sok ||
      t.term.toLowerCase().includes(sok.toLowerCase()) ||
      t.forklaring.toLowerCase().includes(sok.toLowerCase());
    const matchKategori = valdKategori === "alla" || t.kategori === valdKategori;
    return matchSok && matchKategori;
  });

  return (
    <div>
      <Sidhuvud
        rubrik="Ordlista"
        lead="Riksdagens arbete är fyllt av fackuttryck och procedurtermer. Här förklarar vi de viktigaste begreppen i klart och tydligt språk."
      />

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Sök och filter */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 max-w-md">
            <label htmlFor="ordlista-sok" className="sr-only">
              Sök i ordlistan
            </label>
            <input
              id="ordlista-sok"
              type="search"
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              placeholder="Sök begrepp eller förklaring …"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrera på kategori">
            {kategorier.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setValdKategori(k)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  valdKategori === k
                    ? "bg-primary text-primary-foreground"
                    : "border border-input bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                {k === "alla" ? "Alla begrepp" : k}
              </button>
            ))}
          </div>
        </div>

        {/* Träfflista */}
        {filtrerade.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-[var(--yta)] p-8 text-center">
            <p className="font-medium">Inga begrepp matchade sökningen</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Prova att söka på ett annat ord eller välj ”Alla begrepp”.
            </p>
            <button
              type="button"
              onClick={() => {
                setSok("");
                setValdKategori("alla");
              }}
              className="mt-3 text-sm text-[var(--accent-insikt)] underline"
            >
              Återställ sökning
            </button>
          </div>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            {filtrerade.map((item) => (
              <div
                key={item.slug}
                id={`term-${item.slug}`}
                className="scroll-mt-24 flex flex-col rounded-xl border border-border bg-card p-5 shadow-2xs transition-all target:ring-2 target:ring-primary target:bg-primary/5 hover:shadow-xs"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-lg font-medium text-foreground">{item.term}</dt>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {item.kategori}
                  </span>
                </div>
                <dd className="mt-2.5 flex-1 text-sm text-muted-foreground leading-relaxed">
                  {item.forklaring}
                  {item.exempel ? (
                    <span className="mt-2 block italic text-xs text-muted-foreground/80">
                      {item.exempel}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
