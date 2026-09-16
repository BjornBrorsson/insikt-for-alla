import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getAvvikelser, getVoteringsfilter, listPartier } from "@/lib/insikt.functions";
import { datum, ledamotsnamn } from "@/lib/format";
import { Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { PartiMarke, RostMarke } from "@/components/insikt/delar";

const filterSchema = z.object({
  parti: z.string().optional().default(""),
  sakfraga: z.string().optional().default(""),
  sida: z.coerce.number().optional().default(1),
});

export const Route = createFileRoute("/avvikelser")({
  validateSearch: filterSchema,
  head: () => ({
    meta: [
      { title: "Avvikelser — ledamöter som röstat mot partilinjen — Insikt" },
      {
        name: "description",
        content:
          "Se när riksdagsledamöter röstat annorlunda än sitt eget partis majoritet – de så kallade vilde-röstarna.",
      },
    ],
  }),
  component: AvvikelserSida,
});

function AvvikelserSida() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const hamtaAvvikelser = useServerFn(getAvvikelser);
  const hamtaPartier = useServerFn(listPartier);
  const hamtaFilter = useServerFn(getVoteringsfilter);

  const query = useQuery({
    queryKey: ["avvikelser", search.parti, search.sakfraga, search.sida],
    queryFn: () =>
      hamtaAvvikelser({
        data: { parti: search.parti, sakfraga: search.sakfraga, sida: search.sida },
      }),
  });
  const partierQuery = useQuery({ queryKey: ["partier"], queryFn: () => hamtaPartier() });
  const filterQuery = useQuery({ queryKey: ["voteringsfilter"], queryFn: () => hamtaFilter() });

  function uppdatera(andringar: Partial<z.infer<typeof filterSchema>>) {
    navigate({
      to: "/avvikelser",
      search: (gammal) => ({ ...gammal, ...andringar, sida: andringar.sida ?? 1 }),
    });
  }

  const totalaSidor = query.data ? Math.ceil(query.data.totalt / query.data.perSida) : 1;

  return (
    <div>
      <Sidhuvud
        rubrik="Avvikelser från partilinjen"
        lead="Här listas de tillfällen då en ledamot röstat annorlunda än sin egen partis majoritet i en votering – så kallade vilde-röster. Tänk på att en avvikelse inte alltid är ett eget ställningstagande: ledamöter kan rösta på uppdrag av partiet vid till exempel kvittning, och enskilda feltryckningar förekommer."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Filter */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="avv-parti" className="block text-xs font-medium text-muted-foreground">
                Parti
              </label>
              <select
                id="avv-parti"
                value={search.parti}
                onChange={(e) => uppdatera({ parti: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Alla partier</option>
                {partierQuery.data?.map((p) => (
                  <option key={p.kod} value={p.kod}>
                    {p.namn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="avv-sakfraga"
                className="block text-xs font-medium text-muted-foreground"
              >
                Sakfråga
              </label>
              <select
                id="avv-sakfraga"
                value={search.sakfraga}
                onChange={(e) => uppdatera({ sakfraga: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Alla sakfrågor</option>
                {filterQuery.data?.sakfragor.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.namn}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {query.data ? `${query.data.totalt} avvikelser` : ""}
              </p>
              <Link
                to="/splittringar"
                className="text-sm text-[var(--accent-insikt)] hover:underline"
              >
                Se oeniga voteringar →
              </Link>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="mt-6">
          {query.isPending ? (
            <Laddar text="Hämtar avvikelser …" />
          ) : query.isError ? (
            <Fel fel={query.error} forsokIgen={() => query.refetch()} />
          ) : query.data.poster.length === 0 ? (
            <Tomt
              rubrik="Inga avvikelser hittades"
              text="Inga ledamöter har röstat mot sin partis majoritet med de valda filtren."
            />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-xs">
              {query.data.poster.map((p) => (
                <li key={`${p.votering_id}|${p.ledamot_id}`} className="px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {p.ledamot ? (
                      <Link
                        to="/ledamoter/$id"
                        params={{ id: p.ledamot_id }}
                        className="font-medium hover:underline"
                      >
                        {ledamotsnamn(p.ledamot)}
                      </Link>
                    ) : (
                      <span className="font-medium">Okänd ledamot</span>
                    )}
                    <PartiMarke kod={p.parti} />
                    <span className="text-xs text-muted-foreground">
                      {p.ledamot?.valkrets ?? ""}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {datum(p.datum)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">
                      Röstade <RostMarke rost={p.rost} />
                    </span>
                    <span className="text-muted-foreground">
                      partiets majoritet: <RostMarke rost={p.majoritet} />
                    </span>
                  </div>
                  <Link
                    to="/voteringar/$id"
                    params={{ id: p.votering_id }}
                    className="mt-1 block truncate text-sm text-[var(--accent-insikt)] hover:underline"
                  >
                    {p.beteckning ? `${p.beteckning} · ` : ""}
                    {p.titel ?? "Votering"}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Paginering */}
          {totalaSidor > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                disabled={search.sida <= 1}
                onClick={() => uppdatera({ sida: search.sida - 1 })}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Föregående
              </button>
              <span className="text-sm text-muted-foreground">
                Sida {search.sida} av {totalaSidor}
              </span>
              <button
                disabled={search.sida >= totalaSidor}
                onClick={() => uppdatera({ sida: search.sida + 1 })}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Nästa
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
