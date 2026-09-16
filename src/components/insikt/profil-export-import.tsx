import { useState, useRef } from "react";
import { Download, Upload, Share2, Check, Copy, AlertCircle, FileJson } from "lucide-react";
import { toast } from "sonner";
import { useProfil, type InsiktProfil } from "@/lib/profil";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ProfilExportImport({ className = "" }: { className?: string }) {
  const {
    antalBevakningar,
    antalSkuggroster,
    exporteraProfilJson,
    importeraProfilData,
    skapaDelningsUrl,
  } = useProfil();

  const [importModalOppen, setImportModalOppen] = useState(false);
  const [delaModalOppen, setDelaModalOppen] = useState(false);
  const [importeradData, setImporteradData] = useState<Partial<InsiktProfil> | null>(null);
  const [kopierad, setKopierad] = useState(false);
  const filInputRef = useRef<HTMLInputElement>(null);

  const hanteraFilVald = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fil = e.target.files?.[0];
    if (!fil) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as Partial<InsiktProfil>;

        if (!parsed || typeof parsed !== "object") {
          toast.error("Filen innehåller inte giltig Insikt-profildata.");
          return;
        }

        setImporteradData(parsed);
        setImportModalOppen(true);
      } catch {
        toast.error("Kunde inte läsa JSON-filen. Kontrollera filformatet.");
      }
    };
    reader.readAsText(fil);

    // Återställ så att samma fil kan väljas igen
    if (filInputRef.current) {
      filInputRef.current.value = "";
    }
  };

  const slutforImport = (lage: "sla_ihop" | "ersatt") => {
    if (!importeradData) return;
    try {
      importeraProfilData(importeradData, lage);
      toast.success(
        lage === "ersatt"
          ? "Din profil har ersatts med filens innehåll."
          : "Filens innehåll har slagits ihop med din profil.",
      );
      setImportModalOppen(false);
      setImporteradData(null);
    } catch {
      toast.error("Ett fel uppstod vid importen.");
    }
  };

  const kopieraDelningsLank = () => {
    const url = skapaDelningsUrl();
    navigator.clipboard.writeText(url);
    setKopierad(true);
    toast.success("Delningslänk kopierad till urklipp!");
    setTimeout(() => setKopierad(false), 2500);
  };

  const filBevakningarAntal =
    (importeradData?.bevakningar?.ledamoter?.length ?? 0) +
    (importeradData?.bevakningar?.partier?.length ?? 0) +
    (importeradData?.bevakningar?.sakfragor?.length ?? 0) +
    (importeradData?.bevakningar?.arenden?.length ?? 0) +
    (importeradData?.bevakningar?.voteringar?.length ?? 0);

  const filSkuggrosterAntal = Object.keys(importeradData?.skuggroster ?? {}).length;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-5",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Säkerhetskopiera &amp; flytta till annan enhet
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Eftersom allt sparas i webbläsaren utan konto kan du ladda ned din data eller flytta den
            till din telefon eller en annan dator.
          </p>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-md shrink-0">
          Nuvarande profil: <strong>{antalBevakningar}</strong> bevakningar ·{" "}
          <strong>{antalSkuggroster}</strong> skuggröster
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        {/* EXPORTERA */}
        <button
          type="button"
          onClick={exporteraProfilJson}
          className="flex items-center justify-center gap-2 rounded-xl border border-input bg-background p-3.5 font-medium hover:bg-accent transition-colors cursor-pointer shadow-2xs"
        >
          <Download className="h-4 w-4 text-primary shrink-0" />
          <span>Ladda ned profilfil (JSON)</span>
        </button>

        {/* IMPORTERA */}
        <div>
          <input
            ref={filInputRef}
            type="file"
            accept=".json,application/json"
            onChange={hanteraFilVald}
            className="hidden"
            id="profil-fil-valjare"
          />
          <label
            htmlFor="profil-fil-valjare"
            className="flex items-center justify-center gap-2 rounded-xl border border-input bg-background p-3.5 font-medium hover:bg-accent transition-colors cursor-pointer shadow-2xs w-full text-center"
          >
            <Upload className="h-4 w-4 text-primary shrink-0" />
            <span>Importera från fil</span>
          </label>
        </div>

        {/* DELA TILL ANNAN ENHET */}
        <button
          type="button"
          onClick={() => setDelaModalOppen(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-input bg-background p-3.5 font-medium hover:bg-accent transition-colors cursor-pointer shadow-2xs"
        >
          <Share2 className="h-4 w-4 text-primary shrink-0" />
          <span>Dela till annan enhet (Länk)</span>
        </button>
      </div>

      {/* MODAL FÖR FILIMPORT */}
      <Dialog open={importModalOppen} onOpenChange={setImportModalOppen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              Importera Insikt-profil
            </DialogTitle>
            <DialogDescription>
              Filen innehåller {filBevakningarAntal} sparade bevakningar och {filSkuggrosterAntal}{" "}
              skuggröster. Hur vill du läsa in uppgifterna?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border p-3.5 space-y-1 bg-muted/40">
              <p className="font-semibold text-foreground">
                Alternativ 1: Slå ihop (Rekommenderas)
              </p>
              <p className="text-muted-foreground">
                Lägger till bevakningar och skuggröster från filen till dina nuvarande uppgifter
                utan att radera något du redan sparat.
              </p>
            </div>

            <div className="rounded-lg border p-3.5 space-y-1 bg-muted/40">
              <p className="font-semibold text-destructive">Alternativ 2: Ersätt helt</p>
              <p className="text-muted-foreground">
                Ersätter all din nuvarande lokala data med uppgifterna från filen.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setImportModalOppen(false)}
              className="rounded-md border border-input px-4 py-2 text-xs hover:bg-accent"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={() => slutforImport("ersatt")}
              className="rounded-md border border-destructive/50 text-destructive px-4 py-2 text-xs hover:bg-destructive/10"
            >
              Ersätt helt
            </button>
            <button
              type="button"
              onClick={() => slutforImport("sla_ihop")}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-xs font-medium hover:bg-primary/90"
            >
              Slå ihop
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL FÖR DELNINGSLÄNK */}
      <Dialog open={delaModalOppen} onOpenChange={setDelaModalOppen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Dela din profil till en annan enhet
            </DialogTitle>
            <DialogDescription>
              Denna länk innehåller din profildata direkt i adressfältet (efter tecknet #). Den
              skickas <strong>aldrig</strong> till Insikts servrar, utan läses uteslutande av din
              andra enhets webbläsare.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between gap-2 overflow-hidden">
              <span className="font-mono text-[11px] text-muted-foreground truncate">
                {skapaDelningsUrl()}
              </span>
              <button
                type="button"
                onClick={kopieraDelningsLank}
                className="inline-flex items-center gap-1 rounded bg-primary text-primary-foreground px-3 py-1.5 font-medium shrink-0 hover:bg-primary/90 transition-colors"
              >
                {kopierad ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{kopierad ? "Kopierad!" : "Kopiera länk"}</span>
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                Öppna länken på din telefon eller andra dator och välj ”Importera” för att få med
                dig alla dina bevakningar och skuggröster.
              </span>
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setDelaModalOppen(false)}
              className="rounded-md border border-input px-4 py-2 text-xs hover:bg-accent"
            >
              Stäng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
