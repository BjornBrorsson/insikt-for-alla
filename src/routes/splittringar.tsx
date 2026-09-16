import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSplittringar, getVoteringsfilter, listPartier } from "@/lib/insikt.functions";
import { datum, procent } from "@/lib/format";
import { Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { PartiMarke, RostMarke } from "@/components/insikt/delar";

const filterSchema = z.object({
  parti: z.string().optional().default(""),
  sakfraga: z.string().optional().default(""),
  sida: z.coerce.number().optional().default(1),
});

export const Route = createFileRoute("/splittringar")({
  validateSearch: filterSchema,
  head: () => ({
    meta: [
      { title: "Partisplittringar — voteringar där partier röstade oenigt — Insikt" },
      {
        name: "description",
        content:
          "De voteringar där ett riksdagsparti inte röstade enigt – rankade efter hur splittrat partiet var.",
      },
    ],
  }),
  component: SplittringarSida,
});

function SplittringarSida() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const hamtaSplittringar = useServerFn(getSplittringar);
  const hamtaPartier = useServerFn(listPartier);
  const hamtaFilter = useServerFn(getVoteringsfilter);

  const query = useQuery({
    queryKey: ["splittringar", search.parti, search.sakfraga, search.sida],
    queryFn: () =>
      hamtaSplittringar({
        data: { parti: search.parti, sakfraga: search.sakfraga, sida: search.sida },
      }),
  });
  const partierQuery = useQuery({ queryKey: ["partier"], queryFn: () => hamtaPartier() });
  const filterQuery = useQuery({ queryKey: ["voteringsfilter"], queryFn: () => hamtaFilter() });

  function uppdatera(andringar: Partial<z.infer<typeof filterSchema>>) {
    navigate({
      to: "/splittringar",
      search: (gammal) => ({ ...gammal, ...andringar, sida: andringar.sida ?? 1 }),
    });
  }

  const totalaSidor = query.data ? Math.ceil(query.data.totalt / query.data.perSida) : 1;

  return (
    <div>
      <Sidhuvud
        rubrik="Partisplittringar"
        lead="De flesta voteringar i riksdagen är förutsägbara – partierna röstar enigt. Här lyfts de voteringar fram där ett parti faktiskt sprack, rankade efter hur stor minoriteten var i förhållande till partiets storlek. Minst två avvikande röster krävs för att räknas som en splittring."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Filter */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="spl-parti" className="block text-xs font-medium text-muted-foreground">
                Parti
              </label>
              <select
                id="spl-parti"
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
                htmlFor="spl-sakfraga"
                className="block text-xs font-medium text-muted-foreground"
              >
                Sakfråga
              </label>
              <select
                id="spl-sakfraga"
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
                {query.data ? `${query.data.totalt} oeniga voteringar` : ""}
              </p>
              <Link to="/avvikelser" className="text-sm text-[var(--accent-insikt)] hover:underline">
                Se enskilda avvikelser →
              </Link>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="mt-6">
          {query.isPending ? (
            <Laddar text="Hämtar oeniga voteringar …" />
          ) : query.isError ? (
            <Fel fel={query.error} forsokIgen={() => query.refetch()} />
          ) : query.data.poster.length === 0 ? (
            <Tomt
              rubrik="Inga oeniga voteringar"
              text="Inga partier röstade oenigt med de valda filtren."
            />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-xs">
              {query.data.poster.map((p, i) => (
                <li key={`${p.votering_id}|${p.parti}`} className="px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="w-7 text-sm font-mono text-muted-foreground">
                      {(search.sida - 1) * query.data.perSida + i + 1}.
                    </span>
                    <PartiMarke kod={p.parti} />
                    <span className="text-sm font-medium">
                      {procent(Math.min(p.ja, p.nej, p.avstar) === 0 ? 0 : p.splittring, 1)} oeniga
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {datum(p.datum)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 pl-10 text-sm">
                    <span className="text-muted-foreground">
                      Fördelning: <RostMarke rost="Ja" /> {p.ja} · <RostMarke rost="Nej" /> {p.nej} ·{" "}
                      <RostMarke rost="Avstår" /> {p.avstar}
                    </span>
                    {p.majoritetsrost ? (
                      <span className="text-muted-foreground">
                        majoritet: <RostMarke rost={p.majoritetsrost} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">ingen majoritet (ojämnt)</span>
                    )}
                  </div>
                  <Link
                    to="/voteringar/$id"
                    params={{ id: p.votering_id }}
                    className="mt-1 block truncate pl-10 text-sm text-[var(--accent-insikt)] hover:underline"
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
