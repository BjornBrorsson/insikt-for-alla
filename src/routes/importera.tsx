import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, FileJson } from "lucide-react";
import { toast } from "sonner";
import { useProfil, avkodaProfilFrånHash, type InsiktProfil } from "@/lib/profil";
import { Sidhuvud } from "@/components/insikt/tillstand";

export const Route = createFileRoute("/importera")({
  head: () => ({
    meta: [
      { title: "Importera profil — Insikt" },
      {
        name: "description",
        content:
          "Importera dina bevakningar och skuggröster från en delad länk helt privat och klientside.",
      },
    ],
  }),
  component: ImporteraSida,
});

function ImporteraSida() {
  const navigate = useNavigate();
  const { importeraProfilData, antalBevakningar, antalSkuggroster } = useProfil();
  const [dataAttImportera, setDataAttImportera] = useState<Partial<InsiktProfil> | null>(null);
  const [kontrollerad, setKontrollerad] = useState(false);
  const [klar, setKlar] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash) {
      const avkodad = avkodaProfilFrånHash(hash);
      setDataAttImportera(avkodad);
    }
    setKontrollerad(true);
  }, []);

  const genomforImport = (lage: "sla_ihop" | "ersatt") => {
    if (!dataAttImportera) return;
    try {
      importeraProfilData(dataAttImportera, lage);
      setKlar(true);
      toast.success(
        lage === "ersatt"
          ? "Din profil har ersatts med de importerade uppgifterna!"
          : "De importerade uppgifterna har slagits ihop med din profil!",
      );
      // Rensa hash från adressfältet för ren URL
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch {
      toast.error("Ett fel uppstod vid importen.");
    }
  };

  const antalImportBevakningar =
    (dataAttImportera?.bevakningar?.ledamoter?.length ?? 0) +
    (dataAttImportera?.bevakningar?.partier?.length ?? 0) +
    (dataAttImportera?.bevakningar?.sakfragor?.length ?? 0) +
    (dataAttImportera?.bevakningar?.arenden?.length ?? 0) +
    (dataAttImportera?.bevakningar?.voteringar?.length ?? 0);

  const antalImportSkuggroster = Object.keys(dataAttImportera?.skuggroster ?? {}).length;

  return (
    <div>
      <Sidhuvud
        rubrik="Importera Insikt-profil"
        lead="Flytta dina bevakningar och skuggröster mellan enheter. All data avkodas uteslutande i din webbläsare — inget skickas till servern."
      />

      <div className="mx-auto max-w-2xl px-4 py-12">
        {!kontrollerad ? null : klar ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Importen slutförd!</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Dina uppgifter är nu sparade i denna webbläsare. Du kan se ditt händelseflöde och dina
              skuggröster direkt.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate({ to: "/bevakningar" })}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
              >
                Gå till Mina bevakningar &amp; skuggröster
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : dataAttImportera ? (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
                <Share2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">
                  En Insikt-profil hittades i länken
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Länken du öppnade innehåller sparade inställningar från en annan enhet.
                </p>
              </div>
            </div>

            {/* Innehåll i profilen */}
            <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-xs">
              <p className="font-semibold text-foreground">Innehåll som kommer läsas in:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <span className="text-muted-foreground block">Bevakningar:</span>
                  <span className="text-base font-bold text-foreground">
                    {antalImportBevakningar} st
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    Ledamöter, partier, sakfrågor och ärenden
                  </span>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <span className="text-muted-foreground block">Skuggröster:</span>
                  <span className="text-base font-bold text-foreground">
                    {antalImportSkuggroster} st
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    Dina personliga ställningstaganden i voteringar
                  </span>
                </div>
              </div>
            </div>

            {/* Befintlig profil notis */}
            <div className="rounded-lg bg-muted/30 p-3.5 text-xs text-muted-foreground flex items-center justify-between gap-2 border border-border/50">
              <span>Din nuvarande webbläsare har:</span>
              <span className="font-medium text-foreground">
                {antalBevakningar} bevakningar · {antalSkuggroster} skuggröster
              </span>
            </div>

            {/* Val av importmetod */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-foreground">Välj hur du vill importera:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => genomforImport("sla_ihop")}
                  className="flex flex-col items-start gap-1 rounded-xl border border-primary/40 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-xs text-primary">
                    1. Slå ihop (Rekommenderas)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Behåll det du redan har sparat här och lägg till det nya från länken.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => genomforImport("ersatt")}
                  className="flex flex-col items-start gap-1 rounded-xl border border-border bg-background p-4 text-left hover:bg-destructive/5 hover:border-destructive/40 transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-xs text-foreground">2. Ersätt helt</span>
                  <span className="text-[11px] text-muted-foreground">
                    Skriv över eventuell befintlig data i denna webbläsare med länkens innehåll.
                  </span>
                </button>
              </div>
            </div>

            {/* Integritetsgaranti */}
            <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                All överföring sker via hash-fragmentet i din webbläsare. Ingenting har skickats
                till Insikts servrar.
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Ingen profildata i adressfältet
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Denna sida används när du öppnar en delningslänk från en annan enhet för att importera
              dina bevakningar och skuggröster.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                to="/bevakningar"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Gå till Mina bevakningar &amp; skuggröster
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
