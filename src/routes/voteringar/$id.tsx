import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { getVotering } from "@/lib/insikt.functions";
import { datum, laddaNerCsv, csv, antal } from "@/lib/format";
import { Fel, Kalla, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";
import { Bevaka, PartiMarke, RostDiagram, RostMarke } from "@/components/insikt/delar";
import { TextMedMotioner } from "@/components/insikt/motion-modal";
import { analyseraBeslut } from "@/lib/beslut-analys";
import { RostGuideKlartext, BeslutsUtfallKlartext } from "@/components/insikt/beslut-forklaring";

export const Route = createFileRoute("/voteringar/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Voteringsdetalj — Insikt` },
      {
        name: "description",
        content:
          "Detaljerat voteringsresultat från Sveriges riksdag. Se vad omröstningen gällde, utfall per parti och hur varje enskild ledamot röstade.",
      },
    ],
  }),
  component: VoteringDetalj,
});

function VoteringDetalj() {
  const { id } = Route.useParams();
  const hamtaVotering = useServerFn(getVotering);

  const query = useQuery({
    queryKey: ["votering", id],
    queryFn: () => hamtaVotering({ data: { id } }),
  });

  const [sokLedamot, setSokLedamot] = useState("");
  const [filterParti, setFilterParti] = useState("");
  const [filterRost, setFilterRost] = useState("");
  const [visaBaraAvvikare, setVisaBaraAvvikare] = useState(false);

  if (query.isPending) return <Laddar text="Hämtar voteringsuppgifter …" />;
  if (query.isError) return <Fel fel={query.error} forsokIgen={() => query.refetch()} />;
  if (!query.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Tomt
          rubrik="Voteringen hittades inte"
          text={`Ingen omröstning med id ”${id}” kunde hittas i databasen.`}
          barn={<Link to="/voteringar" className="text-sm underline">Till alla voteringar</Link>}
        />
      </div>
    );
  }

  const { votering, partitotaler, majoritet, roster } = query.data;

  const beslutsAnalys = analyseraBeslut({
    forslag: votering.beslutspunkter?.forslag,
    rubrik: votering.beslutspunkter?.rubrik ?? votering.rubrik,
    gallde: votering.gallde,
    motforslag_partier: votering.beslutspunkter?.motforslag_partier,
    motforslag_nummer: votering.beslutspunkter?.motforslag_nummer,
    vinnare: votering.vinnare,
    ja: votering.ja,
    nej: votering.nej,
  });

  const majoritetsKarta = new Map<string, string | null>();
  for (const m of majoritet) {
    majoritetsKarta.set(m.parti, m.majoritetsrost);
  }

  // Filtrera röstlängden
  const filtreradeRoster = roster.filter((r) => {
    const namn = r.ledamoter
      ? `${r.ledamoter.fornamn} ${r.ledamoter.efternamn}`.toLowerCase()
      : "";
    const matchNamn = !sokLedamot || namn.includes(sokLedamot.toLowerCase());
    const matchParti = !filterParti || r.parti === filterParti;
    const matchRost = !filterRost || r.rost === filterRost;

    const partimajoritet = r.parti ? majoritetsKarta.get(r.parti) : null;
    const arAvvikare =
      Boolean(partimajoritet &&
      ["Ja", "Nej", "Avstår"].includes(r.rost) &&
      r.rost !== partimajoritet);

    const matchAvvikare = !visaBaraAvvikare || arAvvikare;

    return matchNamn && matchParti && matchRost && matchAvvikare;
  });

  function exporteraCsv() {
    const rubriker = [
      "Votering ID",
      "Ledamot ID",
      "Förnamn",
      "Efternamn",
      "Parti",
      "Valkrets",
      "Röst",
      "Partimajoritet",
      "Avvikare",
    ];
    const rader = roster.map((r) => {
      const pMaj = r.parti ? majoritetsKarta.get(r.parti) ?? "" : "";
      const avv = pMaj && ["Ja", "Nej", "Avstår"].includes(r.rost) && r.rost !== pMaj ? "Ja" : "Nej";
      return [
        id,
        r.ledamot_id,
        r.ledamoter?.fornamn ?? "",
        r.ledamoter?.efternamn ?? "",
        r.parti ?? "",
        r.valkrets ?? "",
        r.rost,
        pMaj,
        avv,
      ];
    });
    laddaNerCsv(`votering_${id}_roster.csv`, csv([rubriker, ...rader]));
  }

  const titel = votering.arenden?.titel ?? votering.rubrik ?? "Votering";

  return (
    <div>
      <Sidhuvud
        rubrik={titel}
        lead={`${votering.beteckning ?? "Beteckning saknas"} · punkt ${votering.punkt ?? "–"} · ${datum(votering.datum)} · ${votering.arenden?.organ ?? "Utskott saknas"}`}
        barn={
          <div className="flex flex-wrap items-center gap-3">
            <Bevaka typ="voteringar" id={votering.id} etikett={`${votering.beteckning} p.${votering.punkt}`} />
            {votering.arende_id ? (
              <Link
                to="/arenden/$id"
                params={{ id: votering.arende_id }}
                className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
              >
                Gå till hela ärendet ({votering.beteckning}) →
              </Link>
            ) : null}
            <Kalla url={votering.kalla_url} />
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
        {/* Vad gällde omröstningen? */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h2 className="text-xl font-normal">Vad gällde omröstningen?</h2>

          <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground">
            {votering.gallde ? (
              <p className="font-medium text-base">
                <TextMedMotioner text={votering.gallde} />
              </p>
            ) : (
              <p className="text-muted-foreground">Konkret voteringsbeskrivning saknas i källdata.</p>
            )}

            {votering.beslutspunkter ? (
              <div className="rounded-lg border border-border/80 bg-[var(--yta)] p-4 text-xs space-y-2">
                <p className="font-medium text-foreground">
                  Beslutspunkt {votering.beslutspunkter.punkt}: {votering.beslutspunkter.rubrik ?? ""}
                </p>
                {votering.beslutspunkter.forslag ? (
                  <div className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Utskottets förslag:</strong>{" "}
                    <TextMedMotioner text={votering.beslutspunkter.forslag} />
                  </div>
                ) : null}
                {votering.beslutspunkter.motforslag_partier ? (
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Motförslag från:</strong>{" "}
                    <TextMedMotioner text={votering.beslutspunkter.motforslag_partier} />
                    {votering.beslutspunkter.motforslag_nummer ? ` (reservation ${votering.beslutspunkter.motforslag_nummer})` : ""}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Pedagogisk röstguide */}
            <RostGuideKlartext analys={beslutsAnalys} />

            {/* Tolkningsprincip */}
            <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
              Observera: En Ja- eller Nej-röst avser enbart den specifika formuleringen och de
              alternativ som ställts mot varandra i kammaren. Den ska inte tolkas som ett generellt
              stöd eller motstånd mot ett övergripande politiskt ämne.
            </p>
          </div>
        </section>

        {/* Kammarens totala utfall */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl font-normal">Kammarens utfall</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Totalt {votering.ja + votering.nej + votering.avstar + votering.franvarande} ledamöter
              </p>
            </div>
            <span className="rounded-full bg-[var(--accent-insikt-svag)] px-3 py-1 text-sm font-medium text-[var(--accent-insikt)]">
              {votering.vinnare ? `${votering.vinnare} vann omröstningen (${votering.ja} Ja mot ${votering.nej} Nej)` : "Utfall oavgjort eller saknas"}
            </span>
          </div>

          {/* Förklaring i klartext av vad beslutet betyder */}
          <BeslutsUtfallKlartext analys={beslutsAnalys} />

          <div className="pt-2">
            <RostDiagram
              ja={votering.ja}
              nej={votering.nej}
              avstar={votering.avstar}
              franvarande={votering.franvarande}
            />
          </div>
        </section>

        {/* Röstfördelning per parti */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h2 className="text-xl font-normal">Partiernas röstfördelning</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Visar antal röster per parti och partiets beräknade majoritetsröst i denna votering.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-[var(--yta)] text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Parti</th>
                  <th className="px-4 py-3 font-medium">Partiets majoritetsröst</th>
                  <th className="px-4 py-3 font-medium">Ja</th>
                  <th className="px-4 py-3 font-medium">Nej</th>
                  <th className="px-4 py-3 font-medium">Avstår</th>
                  <th className="px-4 py-3 font-medium">Frånvarande</th>
                  <th className="px-4 py-3 font-medium text-right">Graf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partitotaler.map((p) => {
                  const maj = majoritetsKarta.get(p.parti);
                  return (
                    <tr key={p.parti} className="hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          to="/partier/$kod"
                          params={{ kod: p.parti }}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <PartiMarke kod={p.parti} />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {maj ? (
                          <RostMarke rost={maj} />
                        ) : (
                          <span className="text-xs text-muted-foreground">Ingen majoritet</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{p.ja}</td>
                      <td className="px-4 py-3 text-xs font-mono">{p.nej}</td>
                      <td className="px-4 py-3 text-xs font-mono">{p.avstar}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.franvarande}</td>
                      <td className="px-4 py-3 text-right w-36">
                        <RostDiagram
                          ja={p.ja}
                          nej={p.nej}
                          avstar={p.avstar}
                          franvarande={p.franvarande}
                          kompakt
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Individuell röstlängd */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-xl font-normal">Individuell röstlängd</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Granska hur varje enskild riksdagsledamot röstade.
              </p>
            </div>

            <button
              type="button"
              onClick={exporteraCsv}
              className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
            >
              Exportera röstlängd till CSV ↗
            </button>
          </div>

          {/* Sök och filter för röstlängd */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={sokLedamot}
              onChange={(e) => setSokLedamot(e.target.value)}
              placeholder="Sök ledamot i voteringen …"
              className="h-9 w-60 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <select
              value={filterParti}
              onChange={(e) => setFilterParti(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">Alla partier</option>
              {partitotaler.map((p) => (
                <option key={p.parti} value={p.parti}>
                  {p.parti}
                </option>
              ))}
            </select>

            <select
              value={filterRost}
              onChange={(e) => setFilterRost(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">Alla röster</option>
              <option value="Ja">Ja</option>
              <option value="Nej">Nej</option>
              <option value="Avstår">Avstår</option>
              <option value="Frånvarande">Frånvarande</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visaBaraAvvikare}
                onChange={(e) => setVisaBaraAvvikare(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span>Visa bara partiavvikare</span>
            </label>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Visar {filtreradeRoster.length} av {roster.length} ledamöter
          </div>

          {/* Röstlängdstabell */}
          <div className="mt-3 max-h-[600px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-border bg-[var(--yta)] text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ledamot</th>
                  <th className="px-4 py-2.5 font-medium">Parti</th>
                  <th className="px-4 py-2.5 font-medium">Valkrets</th>
                  <th className="px-4 py-2.5 font-medium">Röst</th>
                  <th className="px-4 py-2.5 font-medium text-right">Avvikelse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtreradeRoster.map((r) => {
                  const pMaj = r.parti ? majoritetsKarta.get(r.parti) : null;
                  const arAvvikare =
                    pMaj &&
                    ["Ja", "Nej", "Avstår"].includes(r.rost) &&
                    r.rost !== pMaj;

                  return (
                    <tr key={r.ledamot_id} className="hover:bg-accent/40">
                      <td className="px-4 py-2 font-medium">
                        <Link
                          to="/ledamoter/$id"
                          params={{ id: r.ledamot_id }}
                          className="hover:underline"
                        >
                          {r.ledamoter
                            ? `${r.ledamoter.fornamn} ${r.ledamoter.efternamn}`
                            : r.ledamot_id}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <PartiMarke kod={r.parti} />
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {r.valkrets ?? "–"}
                      </td>
                      <td className="px-4 py-2">
                        <RostMarke rost={r.rost} />
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        {arAvvikare ? (
                          <span className="rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300">
                            Avviker från {r.parti}:s majoritet ({pMaj})
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
