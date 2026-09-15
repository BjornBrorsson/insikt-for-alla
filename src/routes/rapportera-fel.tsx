import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Sidhuvud } from "@/components/insikt/tillstand";
import { rapporteraFel } from "@/lib/insikt.functions";

const sokParamsSchema = z.object({
  sida: z.string().optional().default(""),
});

export const Route = createFileRoute("/rapportera-fel")({
  validateSearch: sokParamsSchema,
  head: () => ({
    meta: [
      { title: "Rapportera fel — Insikt" },
      {
        name: "description",
        content:
          "Rapportera felaktigheter, saknade uppgifter eller tekniska problem i Insikt. Vi granskar och rättar löpande.",
      },
    ],
  }),
  component: RapporteraFelSida,
});

function RapporteraFelSida() {
  const search = Route.useSearch();
  const skickaFel = useServerFn(rapporteraFel);

  const [sida, setSida] = useState(search.sida || "");
  const [beskrivning, setBeskrivning] = useState("");
  const [epost, setEpost] = useState("");
  const [skickar, setSkickar] = useState(false);
  const [skickat, setSkickat] = useState(false);
  const [felmeddelande, setFelmeddelande] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!beskrivning.trim() || beskrivning.trim().length < 5) {
      setFelmeddelande("Beskriv felet med minst 5 tecken.");
      return;
    }

    setSkickar(true);
    setFelmeddelande(null);

    try {
      await skickaFel({
        data: {
          sida: sida.trim(),
          beskrivning: beskrivning.trim(),
          epost: epost.trim(),
        },
      });
      setSkickat(true);
    } catch (err) {
      setFelmeddelande(err instanceof Error ? err.message : "Kunde inte skicka rapporten.");
    } finally {
      setSkickar(false);
    }
  }

  return (
    <div>
      <Sidhuvud
        rubrik="Rapportera fel"
        lead="Insikt bygger på transparens och precision. Har du stött på felaktig information, en trasig länk eller något annat som inte stämmer? Låt oss veta så att vi kan åtgärda det."
      />

      <div className="mx-auto max-w-xl px-4 py-12">
        {skickat ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-insikt-svag)] text-2xl text-[var(--accent-insikt)]">
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-normal">Tack för din felrapport!</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Vi har tagit emot ditt meddelande och granskar uppgifterna mot Riksdagens öppna data.
              Tack vare engagerade användare kan vi hålla Insikt så pålitligt som möjligt.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setBeskrivning("");
                  setSkickat(false);
                }}
                className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
              >
                Rapportera ett annat fel
              </button>
              <Link
                to="/"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Tillbaka till startsidan
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-xs">
            {felmeddelande ? (
              <div
                role="alert"
                className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {felmeddelande}
              </div>
            ) : null}

            <div className="space-y-5">
              <div>
                <label htmlFor="fel-sida" className="block text-sm font-medium">
                  Sida eller sammanhang
                </label>
                <input
                  id="fel-sida"
                  type="text"
                  value={sida}
                  onChange={(e) => setSida(e.target.value)}
                  placeholder="T.ex. /ledamoter/0123... eller Magdalena Andersson"
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Ange gärna vilken URL eller vilket ärende/ledamot felet rör.
                </p>
              </div>

              <div>
                <label htmlFor="fel-beskrivning" className="block text-sm font-medium">
                  Vad är fel? <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="fel-beskrivning"
                  required
                  rows={5}
                  value={beskrivning}
                  onChange={(e) => setBeskrivning(e.target.value)}
                  placeholder="Beskriv så detaljerat som möjligt vad som inte stämmer och gärna vad den korrekta uppgiften borde vara …"
                  className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="fel-epost" className="block text-sm font-medium">
                  E-postadress (valfritt)
                </label>
                <input
                  id="fel-epost"
                  type="email"
                  value={epost}
                  onChange={(e) => setEpost(e.target.value)}
                  placeholder="din.epost@exempel.se"
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Fylls endast i om du vill att vi ska kunna återkoppla när felet är åtgärdat.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={skickar}
                  className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {skickar ? "Skickar felrapport …" : "Skicka felrapport"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
