import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { getStartsida, getDatastatus } from "@/lib/insikt.functions";
import { antal, datum, datumKort, rensaHtml } from "@/lib/format";
import { vinnareEtikett } from "@/lib/beslut-analys";
import { Fel, Laddar, Tomt } from "@/components/insikt/tillstand";
import { PartiMarke, RostDiagram } from "@/components/insikt/delar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Insikt — förstå besluten, granska dina folkvalda" },
      {
        name: "description",
        content:
          "Sök bland riksdagens ledamöter, partier, ärenden och voteringar. Alla uppgifter kommer från Riksdagens öppna data med länk till originalet.",
      },
      { property: "og:title", content: "Insikt — förstå besluten, granska dina folkvalda" },
      {
        property: "og:description",
        content:
          "Riksdagens beslut, voteringar och ledamöter förklarade på svenska, med länk till originalkällan.",
      },
    ],
  }),
  component: Start,
});

function Start() {
  const navigate = useNavigate();
  const [fraga, setFraga] = useState("");
  const hamtaStart = useServerFn(getStartsida);
  const hamtaStatus = useServerFn(getDatastatus);

  const start = useQuery({ queryKey: ["startsida"], queryFn: () => hamtaStart() });
  const status = useQuery({ queryKey: ["datastatus"], queryFn: () => hamtaStatus() });

  return (
    <div>
      <section className="border-b border-border bg-[var(--yta)]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="max-w-2xl text-4xl leading-tight sm:text-5xl">
            Förstå besluten. Granska dina folkvalda.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Insikt samlar riksdagens ledamöter, partier, ärenden och voteringar på ett ställe. Varje
            uppgift kommer från Riksdagens öppna data och länkar till originalet.
          </p>

          <form
            className="mt-7 flex max-w-xl gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (fraga.trim().length >= 2) navigate({ to: "/sok", search: { q: fraga.trim() } });
            }}
          >
            <label className="sr-only" htmlFor="global-sok">
              Sök ledamot, parti eller ärende
            </label>
            <input
              id="global-sok"
              value={fraga}
              onChange={(e) => setFraga(e.target.value)}
              placeholder="Sök ledamot, parti eller ärende"
              className="h-12 flex-1 rounded-md border border-input bg-background px-4 text-base"
            />
            <button
              type="submit"
              className="h-12 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Sök
            </button>
          </form>

          <p className="mt-3 text-xs text-muted-foreground">
            Exempel: ett namn, ett partinamn, ett betänkande som <em>2024/25:FiU1</em>.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[2fr_1fr]">
        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl">Senaste voteringar</h2>
            <Link to="/voteringar" className="text-sm text-[var(--accent-insikt)] hover:underline">
              Alla voteringar
            </Link>
          </div>

          <div className="mt-4">
            {start.isPending ? (
              <Laddar />
            ) : start.isError ? (
              <Fel fel={start.error} forsokIgen={() => start.refetch()} />
            ) : start.data!.senasteVoteringar.length === 0 ? (
              <Tomt
                rubrik="Inga voteringar inlästa ännu"
                text="När inläsningen från riksdagen har körts visas de senaste omröstningarna här."
              />
            ) : (
              <ul className="space-y-3">
                {start.data!.senasteVoteringar.map((v) => (
                  <li key={v.id} className="rounded-lg border border-border bg-card p-4">
                    <Link
                      to="/voteringar/$id"
                      params={{ id: v.id }}
                      className="font-medium hover:underline"
                    >
                      {rensaHtml(v.arenden?.titel ?? v.rubrik) || "Votering"}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.beteckning ?? "Beteckning saknas"} · punkt {v.punkt ?? "–"} ·{" "}
                      {datum(v.datum)} · {v.arenden?.organ ?? "Utskott saknas"}
                    </p>
                    {v.gallde ? <p className="mt-2 text-sm">{rensaHtml(v.gallde)}</p> : null}
                    {v.innebord ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Ja</span>
                        {" = "}
                        {v.innebord.ja}
                        <span className="mx-2 text-border">·</span>
                        <span className="font-medium text-foreground">Nej</span>
                        {" = "}
                        {v.innebord.nej}
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <RostDiagram
                        ja={v.ja}
                        nej={v.nej}
                        avstar={v.avstar}
                        franvarande={v.franvarande}
                        kompakt
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Utfall: {vinnareEtikett(v.vinnare)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="mt-12 text-2xl">Hitta dina representanter</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Välj din valkrets för att se de ledamöter som valts där.
          </p>
          {start.isSuccess ? (
            start.data.valkretsar.length === 0 ? (
              <Tomt
                rubrik="Inga valkretsar ännu"
                text="Valkretsarna kommer från de tjänstgörande ledamöternas uppgifter."
              />
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {start.data.valkretsar.map((v) => (
                  <Link
                    key={v}
                    to="/valkretsar/$namn"
                    params={{ namn: v }}
                    className="rounded-full border border-input px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    {v}
                  </Link>
                ))}
              </div>
            )
          ) : null}

          <h2 className="mt-12 text-2xl">Sakfrågor</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ämnesingångar. Kategoriseringen är Insikts egen och finns inte i riksdagens data.
          </p>
          {start.isSuccess ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {start.data.sakfragor.map((s) => (
                <Link
                  key={s.slug}
                  to="/sakfragor/$slug"
                  params={{ slug: s.slug }}
                  className="rounded-lg border border-border bg-card p-4 hover:bg-accent"
                >
                  <p className="font-medium">{s.namn}</p>
                  {s.beskrivning ? (
                    <p className="mt-1 text-xs text-muted-foreground">{s.beskrivning}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="space-y-8">
          <section className="rounded-lg border border-border bg-[var(--yta)] p-5">
            <h2 className="text-xl">Datatäckning</h2>
            {status.isPending ? (
              <Laddar rader={2} text="Hämtar status …" />
            ) : status.isError ? (
              <Fel fel={status.error} forsokIgen={() => status.refetch()} />
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                <Rad namn="Ledamöter" varde={antal(status.data!.ledamoter)} />
                <Rad namn="Ärenden" varde={antal(status.data!.arenden)} />
                <Rad namn="Voteringar" varde={antal(status.data!.voteringar)} />
                <Rad namn="Enskilda röster" varde={antal(status.data!.roster)} />
                <Rad
                  namn="Period"
                  varde={
                    status.data!.aldstaVotering
                      ? `${datumKort(status.data!.aldstaVotering)} – ${datumKort(status.data!.senasteVotering)}`
                      : "Uppgift saknas"
                  }
                />
                <Rad namn="Senast uppdaterad" varde={datum(status.data!.senastUppdaterad)} />
              </dl>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Källa: Riksdagens öppna data. Insikt visar bara det som faktiskt lästs in — saknade
              uppgifter skrivs ut som saknade.
            </p>
            <Link
              to="/kallor-och-metod"
              className="mt-3 inline-block text-sm text-[var(--accent-insikt)] hover:underline"
            >
              Källor &amp; metod
            </Link>
          </section>

          <section className="rounded-lg border border-border p-5">
            <h2 className="text-xl">Partier</h2>
            {start.isSuccess ? (
              <ul className="mt-3 space-y-1 text-sm">
                {start.data.partier.map((p) => (
                  <li key={p.kod}>
                    <Link
                      to="/partier/$kod"
                      params={{ kod: p.kod }}
                      className="flex items-center gap-2 rounded px-1 py-1 hover:bg-accent"
                    >
                      <PartiMarke kod={p.kod} farg={p.farg} />
                      <span className="text-muted-foreground">{p.namn}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Laddar rader={3} text="Hämtar partier …" />
            )}
          </section>

          <section className="rounded-lg border border-border p-5">
            <h2 className="text-xl">Jämför</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Se hur ofta två ledamöter eller två partier röstat lika — med underlaget öppet.
            </p>
            <Link
              to="/jamfor"
              className="mt-3 inline-block rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
            >
              Öppna jämförelse
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Rad({ namn, varde }: { namn: string; varde: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{namn}</dt>
      <dd className="text-right font-medium">{varde}</dd>
    </div>
  );
}
