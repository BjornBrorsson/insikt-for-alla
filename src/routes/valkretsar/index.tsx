import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { listValkretsar } from "@/lib/insikt.functions";
import { Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";

export const Route = createFileRoute("/valkretsar/")({
  head: () => ({
    meta: [
      { title: "Valkretsar — Sveriges 29 valkretsar | Insikt" },
      {
        name: "description",
        content:
          "Hitta dina folkvalda representanter i riksdagen genom att välja din valkrets.",
      },
    ],
  }),
  component: ValkretsLista,
});

function ValkretsLista() {
  const hamtaValkretsar = useServerFn(listValkretsar);
  const query = useQuery({ queryKey: ["valkretsar"], queryFn: () => hamtaValkretsar() });
  const [filter, setFilter] = useState("");

  const filtrerade = (query.data ?? []).filter((v) =>
    v.valkrets.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <Sidhuvud
        rubrik="Valkretsar"
        lead="Sverige är indelat i 29 valkretsar. Välj din valkrets för att se vilka ledamöter som representerar dig och hur mandaten fördelar sig mellan partierna."
        barn={
          <div className="max-w-md">
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrera på valkretsnamn (t.ex. Stockholm, Skåne, Västra Götaland) …"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {query.isPending ? (
          <Laddar text="Hämtar valkretsar …" />
        ) : query.isError ? (
          <Fel fel={query.error} forsokIgen={() => query.refetch()} />
        ) : filtrerade.length === 0 ? (
          <Tomt
            rubrik="Inga valkretsar matchar filtret"
            text="Kontrollera stavningen eller töm sökfältet för att se alla 29 valkretsar."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtrerade.map((v) => (
              <Link
                key={v.valkrets}
                to="/valkretsar/$namn"
                params={{ namn: v.valkrets }}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-2xs transition-all hover:bg-accent/40 hover:shadow-xs"
              >
                <div>
                  <h2 className="text-lg font-medium text-foreground group-hover:text-[var(--accent-insikt)]">
                    {v.valkrets}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Riksdagsvalkrets i Sverige
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="font-medium text-foreground">
                    {v.ledamoter} tjänstgörande ledamöter
                  </span>
                  <span className="text-[var(--accent-insikt)] group-hover:translate-x-0.5 transition-transform">
                    Visa representanter →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
