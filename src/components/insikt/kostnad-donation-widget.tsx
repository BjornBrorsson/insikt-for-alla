import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Server, ShieldCheck, CheckCircle2, Info, ExternalLink } from "lucide-react";
import { getDriftkostnader, type DriftkostnaderData } from "@/lib/insikt.functions";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function KostnadDonationWidget() {
  const [open, setOpen] = React.useState(false);

  const { data, isLoading } = useQuery<DriftkostnaderData>({
    queryKey: ["driftkostnader"],
    queryFn: () => getDriftkostnader(),
    staleTime: 1000 * 60 * 30, // 30 minuter
  });

  if (isLoading || !data) {
    return (
      <div className="border-t border-border/60 bg-muted/20 py-3 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 animate-pulse" />
            <span>Hämtar drift- och transparensdata...</span>
          </div>
        </div>
      </div>
    );
  }

  const { manad, infrastrukturKostnadKr, doneratKr, tackningsgradProcent, tjanster, meddelande } =
    data;

  return (
    <div className="border-t border-border/70 bg-card/40 py-3 text-xs">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4">
        {/* Vänster: Snabbstatus */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Server className="h-3.5 w-3.5 text-primary" />
            <span>Drift &amp; transparens ({manad}):</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              Kostnad: <strong className="text-foreground">{infrastrukturKostnadKr} kr</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Donerat: <strong className="text-foreground">{doneratKr} kr</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20">
              <Progress value={tackningsgradProcent} className="h-2" />
            </div>
            <span className="font-medium text-muted-foreground">{tackningsgradProcent}% täckt</span>
          </div>
        </div>

        {/* Höger: Dialog-trigger */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            >
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
              <span>Se driftkalkyl &amp; stöd projektet</span>
            </button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg font-bold">
                  Driftkostnader &amp; Transparens
                </DialogTitle>
              </div>
              <DialogDescription className="text-left text-sm text-muted-foreground">
                {manad} · 100 % transparent och oberoende.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-sm">
              <div className="rounded-lg border border-border bg-muted/30 p-3.5">
                <p className="text-xs leading-relaxed text-muted-foreground">{meddelande}</p>
              </div>

              {/* Månadsöversikt i siffror */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md border border-border bg-background p-2.5">
                  <p className="text-xs text-muted-foreground">Molnkostnad</p>
                  <p className="mt-1 text-base font-bold text-foreground">
                    {infrastrukturKostnadKr} kr
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background p-2.5">
                  <p className="text-xs text-muted-foreground">Insamlat</p>
                  <p className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {doneratKr} kr
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background p-2.5">
                  <p className="text-xs text-muted-foreground">Täckningsgrad</p>
                  <p className="mt-1 text-base font-bold text-primary">{tackningsgradProcent}%</p>
                </div>
              </div>

              {/* Progressbar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Månadens driftkostnadstäckning</span>
                  <span>{tackningsgradProcent}%</span>
                </div>
                <Progress value={tackningsgradProcent} className="h-2.5" />
              </div>

              {/* Detaljerad tjänstefördelning */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                  Fördelning per molntjänst
                </h4>
                <div className="divide-y divide-border rounded-lg border border-border bg-background">
                  {tjanster.map((t) => (
                    <div key={t.namn} className="flex items-start justify-between gap-3 p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{t.namn}</span>
                          {t.arInomFreeTier ? (
                            <Badge variant="outline" className="text-[10px] py-0 font-normal">
                              Inom free-tier / rabatt
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.beskrivning}</p>
                      </div>
                      <div className="text-right whitespace-nowrap font-medium text-foreground">
                        {t.kostnadKr === 0 ? "0 kr" : `~${t.kostnadKr} kr`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hur man kan ge en gåva */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Heart className="h-4 w-4 fill-primary/20" />
                  <span>Vill du hjälpa till att hålla Insikt vid liv?</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Insikt kostar inte mycket att driva tack vare modern serverlös arkitektur, men
                  varje frivilligt bidrag hjälper till att täcka databasfrågor, servrar och
                  AI-analyser.
                </p>
                <div className="space-y-2 rounded-md bg-background/80 p-3 border border-border/80">
                  <p className="font-medium text-xs text-foreground">
                    Frivillig gåva via Swish eller stöd:
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Skicka valfritt belopp via Swish eller GitHub Sponsors. Märk gärna meddelandet
                    med{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">
                      Insikt
                    </code>
                    .
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src="/swish-qr.png"
                      alt="Swish QR-kod till 070 582 85 26"
                      className="h-28 w-auto rounded-md border border-border"
                    />
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        Swish:{" "}
                        <span className="font-medium font-mono text-foreground">070 582 85 26</span>
                      </p>
                      <a
                        href="https://github.com/sponsors/BjornBrorsson"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                        GitHub Sponsors
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integritets- och oberoendegaranti */}
              <div className="flex items-start gap-2.5 rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  <strong>Integritetsgaranti:</strong> En donation ger aldrig något politiskt eller
                  redaktionellt inflytande. Donationer är helt frikopplade från dina sparade
                  skuggröster, bevakningar och besöksdata.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
