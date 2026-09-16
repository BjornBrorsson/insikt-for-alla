import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { getValkrets } from "@/lib/insikt.functions";
import { Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { LedamotKort, PartiMarke } from "@/components/insikt/delar";
import { ValkretsMatchning } from "@/components/insikt/valkrets-matchning";

export const Route = createFileRoute("/valkretsar/$namn")({
  head: ({ params }) => ({
    meta: [
      { title: `${decodeURIComponent(params.namn)} — Ledamöter & mandat | Insikt` },
      {
        name: "description",
        content: `Riksdagsledamöter och mandatfördelning för ${decodeURIComponent(params.namn)}.`,
      },
    ],
  }),
  component: ValkretsDetalj,
});

function ValkretsDetalj() {
  const { namn } = Route.useParams();
  const avkodatNamn = decodeURIComponent(namn);

  const hamtaValkrets = useServerFn(getValkrets);
  const query = useQuery({
    queryKey: ["valkrets", avkodatNamn],
    queryFn: () => hamtaValkrets({ data: { namn: avkodatNamn } }),
  });

  const [valtParti, setValtParti] = useState<string>("alla");

  if (query.isPending) return <Laddar text={`Hämtar ledamöter för ${avkodatNamn} …`} />;
  if (query.isError) return <Fel fel={query.error} forsokIgen={() => query.refetch()} />;
  if (!query.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Tomt
          rubrik="Valkretsen hittades inte"
          text={`Det finns inga uppgifter om en valkrets med namnet ”${avkodatNamn}”.`}
          barn={
            <Link to="/valkretsar" className="text-sm underline">
              Till alla valkretsar
            </Link>
          }
        />
      </div>
    );
  }

  const { ledamoter, fordelning } = query.data;
  const totaltMandat = fordelning.reduce((acc, f) => acc + f.antal, 0);

  const filtreradeLedamoter =
    valtParti === "alla" ? ledamoter : ledamoter.filter((l) => l.parti === valtParti);

  return (
    <div>
      <Sidhuvud
        rubrik={avkodatNamn}
        lead={`Denna valkrets har ${totaltMandat} tjänstgörande riksdagsledamöter i kammaren.`}
        barn={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/valkretsar" className="hover:underline">
              ← Alla valkretsar
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Mandatfördelning i valkretsen */}
        <section className="mb-12 rounded-xl border border-border bg-card p-6 shadow-xs">
          <h2 className="text-xl font-normal">Mandatfördelning i {avkodatNamn}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Baserat på nuvarande tjänstgörande riksdagsledamöter valda för valkretsen.
          </p>

          {/* Visuell fördelningsstapel */}
          <div
            className="mt-4 flex h-4 w-full overflow-hidden rounded-full border border-border"
            role="img"
            aria-label={`Mandatfördelning: ${fordelning.map((f) => `${f.parti}: ${f.antal}`).join(", ")}`}
          >
            {fordelning.map((f) => (
              <span
                key={f.parti}
                className="h-full"
                style={{
                  width: `${(f.antal / totaltMandat) * 100}%`,
                  backgroundColor:
                    f.parti === "S"
                      ? "#E8112d"
                      : f.parti === "SD"
                        ? "#DDDD00"
                        : f.parti === "M"
                          ? "#52BDEC"
                          : f.parti === "C"
                            ? "#009933"
                            : f.parti === "V"
                              ? "#DA291C"
                              : f.parti === "KD"
                                ? "#000077"
                                : f.parti === "MP"
                                  ? "#83CF39"
                                  : f.parti === "L"
                                    ? "#006AB3"
                                    : "#888888",
                }}
                title={`${f.parti}: ${f.antal} mandat`}
              />
            ))}
          </div>

          {/* Partikort med mandatantal och snabbfiltrering */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setValtParti("alla")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                valtParti === "alla"
                  ? "bg-primary text-primary-foreground"
                  : "border border-input bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              Alla partier ({totaltMandat})
            </button>
            {fordelning.map((f) => (
              <button
                key={f.parti}
                type="button"
                onClick={() => setValtParti(f.parti)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  valtParti === f.parti
                    ? "bg-primary text-primary-foreground"
                    : "border border-input bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                <PartiMarke kod={f.parti} />
                <span>
                  {f.antal} {f.antal === 1 ? "mandat" : "mandat"}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Valkrets-matchning mot skuggröster */}
        <ValkretsMatchning valkrets={avkodatNamn} ledamoter={ledamoter} />

        {/* Ledamöter */}
        <section>
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-normal">
              Ledamöter {valtParti !== "alla" ? `för ${valtParti}` : ""} (
              {filtreradeLedamoter.length})
            </h2>
            {valtParti !== "alla" ? (
              <button
                type="button"
                onClick={() => setValtParti("alla")}
                className="text-xs text-[var(--accent-insikt)] hover:underline"
              >
                Visa alla partier
              </button>
            ) : null}
          </div>

          {filtreradeLedamoter.length === 0 ? (
            <Tomt
              rubrik="Inga ledamöter för valt filter"
              text="Inga ledamöter matchade det valda partiet i den här valkretsen."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtreradeLedamoter.map((l) => (
                <LedamotKort key={l.id} ledamot={l} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
