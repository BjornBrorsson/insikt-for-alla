import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { useBevakningar, type BevakningsTyp } from "@/lib/bevakningar";
import { getBevakadeHandelser } from "@/lib/insikt.functions";
import { datum, ledamotsnamn } from "@/lib/format";
import { Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { LedamotKort, PartiMarke, RostDiagram } from "@/components/insikt/delar";

export const Route = createFileRoute("/bevakningar")({
  head: () => ({
    meta: [
      { title: "Mina bevakningar — Insikt" },
      {
        name: "description",
        content:
          "Ditt personliga flöde med ledamöter, partier och sakfrågor du bevakar i Sveriges riksdag. Sparas tryggt och privat i din webbläsare.",
      },
    ],
  }),
  component: BevakningarSida,
});

function BevakningarSida() {
  const { bevakningar, laddad, vaxla, rensa, antal } = useBevakningar();
  const hamtaHandelser = useServerFn(getBevakadeHandelser);
  const [aktivFlik, setAktivFlik] = useState<"flode" | "sparade">("flode");

  const query = useQuery({
    queryKey: ["bevakade-handelser", bevakningar],
    queryFn: () =>
      hamtaHandelser({
        data: {
          ledamoter: bevakningar.ledamoter,
          partier: bevakningar.partier,
          sakfragor: bevakningar.sakfragor,
          arenden: bevakningar.arenden,
          voteringar: bevakningar.voteringar,
        },
      }),
    enabled: laddad && antal > 0,
  });

  return (
    <div>
      <Sidhuvud
        rubrik="Mina bevakningar"
        lead="Följ ledamöter, partier och frågor som är viktiga för dig. Allt sparas helt privat i din egen webbläsare — inget konto krävs."
        barn={
          antal > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-md border border-input bg-background p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setAktivFlik("flode")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    aktivFlik === "flode"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Händelseflöde
                </button>
                <button
                  type="button"
                  onClick={() => setAktivFlik("sparade")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    aktivFlik === "sparade"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Hantera sparade ({antal})
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm("Är du säker på att du vill ta bort alla dina sparade bevakningar?")) {
                    rensa();
                    toast("Alla bevakningar togs bort.");
                  }
                }}
                className="text-xs text-muted-foreground hover:text-destructive underline"
              >
                Rensa allt
              </button>
            </div>
          ) : null
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {!laddad ? (
          <Laddar text="Laddar dina bevakningar …" />
        ) : antal === 0 ? (
          <Tomt
            rubrik="Du har inga aktiva bevakningar"
            text="Klicka på knappen ”☆ Följ” när du besöker en ledamot, ett parti, en sakfråga eller ett ärende. Då dyker uppdateringar och omröstningar upp här i ditt personliga flöde."
            barn={
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/ledamoter"
                  className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Hitta ledamöter
                </Link>
                <Link
                  to="/partier"
                  className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Utforska partier
                </Link>
                <Link
                  to="/sakfragor"
                  className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Välj sakfrågor
                </Link>
              </div>
            }
          />
        ) : aktivFlik === "flode" ? (
          <div>
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-2xl font-normal">Aktuellt för det du följer</h2>
              <span className="text-xs text-muted-foreground">
                Baserat på {antal} bevakade objekt
              </span>
            </div>

            {query.isPending ? (
              <Laddar text="Hämtar aktuella voteringar och händelser …" />
            ) : query.isError ? (
              <Fel fel={query.error} forsokIgen={() => query.refetch()} />
            ) : query.data!.flode.length === 0 ? (
              <Tomt
                rubrik="Inga nya omröstningar just nu"
                text="Det har inte registrerats några nya voteringar för dina bevakade ämnen under den senaste perioden."
              />
            ) : (
              <div className="space-y-4">
                {query.data!.flode.map((v) => (
                  <article
                    key={v.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-2xs transition-shadow hover:shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded bg-[var(--accent-insikt-svag)] px-2 py-0.5 text-xs font-medium text-[var(--accent-insikt)]">
                        {v.anledning}
                      </span>
                      <span className="text-xs text-muted-foreground">{datum(v.datum)}</span>
                    </div>

                    <h3 className="mt-2 text-lg font-medium">
                      <Link
                        to="/voteringar/$id"
                        params={{ id: v.id }}
                        className="hover:underline text-foreground"
                      >
                        {v.arenden?.titel ?? v.rubrik ?? "Votering"}
                      </Link>
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.beteckning ?? "Beteckning saknas"} · punkt {v.punkt ?? "–"}
                    </p>

                    {v.gallde ? (
                      <p className="mt-2 text-sm text-foreground/90">{v.gallde}</p>
                    ) : null}

                    <div className="mt-4">
                      <RostDiagram
                        ja={v.ja}
                        nej={v.nej}
                        avstar={v.avstar}
                        franvarande={v.franvarande}
                        kompakt
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <span>Utfall: {v.vinnare ? `${v.vinnare} vann` : "Utfall saknas"}</span>
                      <Link
                        to="/voteringar/$id"
                        params={{ id: v.id }}
                        className="text-[var(--accent-insikt)] hover:underline"
                      >
                        Granska alla röster →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Sparade objekt */
          <div className="space-y-10">
            {/* Ledamöter */}
            {query.data && query.data.ledamoter.length > 0 ? (
              <section>
                <h3 className="text-xl font-normal">
                  Ledamöter ({query.data.ledamoter.length})
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {query.data.ledamoter.map((l) => (
                    <div key={l.id} className="relative group">
                      <LedamotKort ledamot={l} />
                      <button
                        type="button"
                        onClick={() => vaxla("ledamoter", l.id)}
                        className="mt-1 text-xs text-muted-foreground hover:text-destructive block"
                      >
                        Ta bort bevakning
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Partier */}
            {bevakningar.partier.length > 0 ? (
              <section>
                <h3 className="text-xl font-normal">
                  Partier ({bevakningar.partier.length})
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {bevakningar.partier.map((p) => (
                    <div
                      key={p}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      <Link
                        to="/partier/$kod"
                        params={{ kod: p }}
                        className="font-medium hover:underline"
                      >
                        Parti {p}
                      </Link>
                      <button
                        type="button"
                        onClick={() => vaxla("partier", p)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                        title="Sluta följa"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Sakfrågor */}
            {bevakningar.sakfragor.length > 0 ? (
              <section>
                <h3 className="text-xl font-normal">
                  Sakfrågor ({bevakningar.sakfragor.length})
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {bevakningar.sakfragor.map((s) => (
                    <div
                      key={s}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      <Link
                        to="/sakfragor/$slug"
                        params={{ slug: s }}
                        className="font-medium hover:underline capitalize"
                      >
                        {s.replace(/-/g, " ")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => vaxla("sakfragor", s)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                        title="Sluta följa"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Ärenden */}
            {query.data && query.data.arenden.length > 0 ? (
              <section>
                <h3 className="text-xl font-normal">
                  Sparade ärenden ({query.data.arenden.length})
                </h3>
                <div className="mt-3 space-y-2">
                  {query.data.arenden.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <div>
                        <Link
                          to="/arenden/$id"
                          params={{ id: a.id }}
                          className="font-medium hover:underline"
                        >
                          {a.titel ?? a.beteckning ?? a.id}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {a.organ} · {datum(a.datum)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => vaxla("arenden", a.id)}
                        className="text-xs text-muted-foreground hover:text-destructive ml-4"
                      >
                        Ta bort
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Voteringar */}
            {query.data && query.data.voteringar.length > 0 ? (
              <section>
                <h3 className="text-xl font-normal">
                  Sparade voteringar ({query.data.voteringar.length})
                </h3>
                <div className="mt-3 space-y-2">
                  {query.data.voteringar.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <div>
                        <Link
                          to="/voteringar/$id"
                          params={{ id: v.id }}
                          className="font-medium hover:underline"
                        >
                          {v.arenden?.titel ?? v.rubrik ?? "Votering"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {v.beteckning} · {datum(v.datum)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => vaxla("voteringar", v.id)}
                        className="text-xs text-muted-foreground hover:text-destructive ml-4"
                      >
                        Ta bort
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
