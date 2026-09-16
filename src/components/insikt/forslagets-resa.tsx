import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Users,
  MessageSquare,
  Vote,
  CheckCircle2,
  ChevronRight,
  Info,
  Clock,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { datum } from "@/lib/format";
import { TextMedOrdlista } from "@/components/insikt/motion-modal";
import { cn } from "@/lib/utils";

interface ForslagetsResaProps {
  arende: {
    id: string;
    rm?: string | null;
    beteckning?: string | null;
    organ?: string | null;
    titel?: string | null;
    undertitel?: string | null;
    datum?: string | null;
    publicerad?: string | null;
    doktyp?: string | null;
  };
  punkter?: {
    id: string;
    punkt: string;
    rubrik?: string | null;
    forslag?: string | null;
    vinnare?: string | null;
    votering_id?: string | null;
  }[];
  voteringar?: {
    id: string;
    punkt?: string | null;
    ja?: number;
    nej?: number;
    avstar?: number;
    datum?: string | null;
  }[];
  className?: string;
}

const UTSKOTT_NAMN: Record<string, string> = {
  FiU: "Finansutskottet",
  JuU: "Justitieutskottet",
  KU: "Konstitutionsutskottet",
  UU: "Utrikesutskottet",
  FöU: "Försvarsutskottet",
  SoU: "Socialutskottet",
  UbU: "Utbildningsutskottet",
  TU: "Trafikutskottet",
  NU: "Näringsutskottet",
  AU: "Arbetsmarknadsutskottet",
  CU: "Civilutskottet",
  SkU: "Skatteutskottet",
  MJU: "Miljö- och jordbruksutskottet",
  KrU: "Kulturutskottet",
  SfU: "Socialförsäkringsutskottet",
};

export function ForslagetsResa({
  arende,
  punkter = [],
  voteringar = [],
  className = "",
}: ForslagetsResaProps) {
  const [valtSteg, setValtSteg] = useState<number | null>(null);

  // Analysera ursprung: Proposition (regeringen) vs. fristående motioner (riksdagsledamöter)
  const undertitelText = (arende.undertitel ?? "").toLowerCase();
  const titelText = (arende.titel ?? "").toLowerCase();
  const arProposition =
    undertitelText.includes("prop.") ||
    undertitelText.includes("proposition") ||
    titelText.includes("proposition");
  const arSkrivelse =
    undertitelText.includes("skr.") ||
    undertitelText.includes("skrivelse") ||
    titelText.includes("skrivelse");
  const harMotioner =
    undertitelText.includes("motion") || titelText.includes("motion") || !arProposition;

  const ursprungstyp = arProposition
    ? "Proposition från regeringen"
    : arSkrivelse
      ? "Skrivelse från regeringen"
      : "Fristående motioner från ledamöter";

  const utskottsKortnamn = arende.organ ?? "Utskott";
  const utskottsFullnamn = UTSKOTT_NAMN[utskottsKortnamn] ?? utskottsKortnamn;

  // Analysera beslut/votering status
  const harVoteringar = voteringar.length > 0;
  const harUtfall = punkter.some((p) => p.vinnare) || harVoteringar;
  const beslutsDatum = voteringar[0]?.datum ?? arende.datum;

  // Aktuellt steg: 1=Väckt, 2=Beredning, 3=Debatt, 4=Beslut/Votering, 5=Ikraftträdande
  const aktivtSteg = harUtfall ? 4 : 2;

  const steg = [
    {
      nummer: 1,
      titel: "Förslaget väcks",
      undertitel: ursprungstyp,
      ikon: FileText,
      status: "klar" as const,
      detalj: arProposition
        ? "Regeringen har lämnat en proposition (lagförslag) till riksdagen. Riksdagsledamöter har även kunnat lämna följdmotioner med motförslag."
        : arSkrivelse
          ? "Regeringen har lämnat en officiell skrivelse till riksdagen för information och behandling."
          : "En eller flera riksdagsledamöter har väckt motioner (förslag) till riksdagen, t.ex. under den allmänna motionstiden.",
      badge: arProposition ? "Proposition" : arSkrivelse ? "Skrivelse" : "Motion",
    },
    {
      nummer: 2,
      titel: "Utskottets behandling",
      undertitel: utskottsFullnamn,
      ikon: Users,
      status: "klar" as const,
      datum: arende.datum ? datum(arende.datum) : undefined,
      detalj: `${utskottsFullnamn} har berett ärendet, tagit in synpunkter och sammanställt sitt betänkande (${arende.beteckning ?? "betänkande"}). Ledamöter från minoriteten har lämnat reservationer med motförslag.`,
      badge: arende.beteckning ?? "Betänkande",
    },
    {
      nummer: 3,
      titel: "Debatt i kammaren",
      undertitel: "Plenisalen",
      ikon: MessageSquare,
      status: "klar" as const,
      detalj:
        "Ärendet bordläggs och debatteras öppet i riksdagens kammare. Ledamöter från de olika partierna argumenterar för utskottets förslag och reservationerna.",
    },
    {
      nummer: 4,
      titel: harUtfall ? "Beslut fattat" : "Omröstning / Beslut",
      undertitel: harUtfall
        ? `${punkter.length} beslutspunkt${punkter.length === 1 ? "" : "er"}`
        : "Väntar på kammaren",
      ikon: Vote,
      status: harUtfall ? ("klar" as const) : ("aktiv" as const),
      datum: beslutsDatum ? datum(beslutsDatum) : undefined,
      detalj: harUtfall
        ? `Kammaren har fattat beslut i ärendets samtliga ${punkter.length} beslutspunkter${harVoteringar ? ` (varav ${voteringar.length} avgjordes med elektronisk votering)` : " (avgjordes med acklamation)"}.`
        : "Kammaren ska ta ställning till utskottets förslag till beslut. Omröstning sker antingen med acklamation eller votering.",
      badge: harUtfall ? "Beslutat" : "Kommande",
    },
    {
      nummer: 5,
      titel: "Lag & ikraftträdande",
      undertitel: harUtfall ? "Expediering till regeringen" : "Kommande",
      ikon: Landmark,
      status: harUtfall ? ("aktiv" as const) : ("kommande" as const),
      detalj: harUtfall
        ? "Riksdagen skickar en riksdagsskrivelse (rskr) till regeringen. Om lagförslaget bifölls utfärdar regeringen lagen i Svensk författningssamling (SFS) och den träder i kraft på det datum riksdagen beslutat. Om förslaget avslogs avslutas ärendet."
        : "När beslut har fattats expedieras det formella beslutet till regeringen för verkställande.",
    },
  ];

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-6",
        className,
      )}
      aria-label="Förslagets resa i riksdagen"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h2 className="text-lg sm:text-xl font-medium text-foreground">
              Förslagets resa: Från idé till beslut
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Lagstiftningsprocessen steg för steg för detta riksdagsärende.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>
            Status:{" "}
            <strong className="text-foreground font-medium">
              {harUtfall ? "Beslutat i kammaren" : "Bereds i utskottet"}
            </strong>
          </span>
        </div>
      </div>

      {/* Stegvisare för skrivbord */}
      <nav aria-label="Processens steg" className="hidden lg:block">
        <ol className="grid grid-cols-5 gap-2 relative">
          {steg.map((s, idx) => {
            const arKlar = s.status === "klar";
            const arAktiv = s.status === "aktiv";
            const Ikon = s.ikon;
            const arVald = valtSteg === s.nummer;

            return (
              <li key={s.nummer} className="relative flex flex-col items-center text-center group">
                {/* Kopplingslinje */}
                {idx < steg.length - 1 ? (
                  <div
                    className={cn(
                      "absolute top-5 left-1/2 w-full h-0.5 -z-0",
                      arKlar ? "bg-primary/40" : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => setValtSteg(arVald ? null : s.nummer)}
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    arKlar
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                      : arAktiv
                        ? "border-primary bg-background text-primary ring-4 ring-primary/20 shadow-xs"
                        : "border-border bg-muted/50 text-muted-foreground",
                    arVald && "scale-110 ring-4 ring-primary/30",
                  )}
                  aria-expanded={arVald}
                  aria-label={`Steg ${s.nummer}: ${s.titel}`}
                >
                  {arKlar ? (
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Ikon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>

                <div className="mt-2.5 space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{s.titel}</p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                    {s.undertitel}
                  </p>
                  {s.datum ? (
                    <p className="text-[10px] text-muted-foreground/80 font-mono">{s.datum}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Tidslinje för mobil/surfplatta */}
      <ol className="lg:hidden space-y-4 relative border-l-2 border-primary/30 ml-4 pl-4">
        {steg.map((s) => {
          const arKlar = s.status === "klar";
          const arAktiv = s.status === "aktiv";
          const Ikon = s.ikon;

          return (
            <li key={s.nummer} className="relative space-y-1">
              <span
                className={cn(
                  "absolute -left-[25px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs",
                  arKlar
                    ? "border-primary bg-primary text-primary-foreground"
                    : arAktiv
                      ? "border-primary bg-background text-primary ring-2 ring-primary/20"
                      : "border-border bg-muted text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {arKlar ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Ikon className="h-3.5 w-3.5" />
                )}
              </span>

              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Steg {s.nummer}: {s.titel}
                </span>
                {s.badge ? (
                  <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                    {s.badge}
                  </span>
                ) : null}
                {s.datum ? (
                  <span className="text-xs font-mono text-muted-foreground ml-auto">{s.datum}</span>
                ) : null}
              </div>

              <div className="text-xs text-muted-foreground leading-relaxed">
                <TextMedOrdlista text={s.detalj} />
              </div>
            </li>
          );
        })}
      </ol>

      {/* Utfällt steg-detaljfönster för desktop */}
      <div className="hidden lg:block">
        {valtSteg ? (
          <div className="rounded-xl border border-primary/20 bg-muted/40 p-4 text-xs text-foreground space-y-1.5 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Info className="h-4 w-4 text-primary" />
                <span>
                  Steg {steg[valtSteg - 1]?.nummer}: {steg[valtSteg - 1]?.titel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setValtSteg(null)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Stäng ×
              </button>
            </div>
            <div className="text-muted-foreground leading-relaxed text-xs pt-1">
              <TextMedOrdlista text={steg[valtSteg - 1]?.detalj} />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3.5 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>
                <strong>Aktuellt läge:</strong>{" "}
                {harUtfall
                  ? "Riksdagens kammare har fattat beslut. Beslutet har expedierats till regeringen för verkställande."
                  : "Ärendet bereds i utskottet inför debatt och beslut i kammaren."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setValtSteg(aktivtSteg)}
              className="text-primary font-medium hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0 ml-3"
            >
              Visa detaljer för aktuellt steg
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Pedagogisk notis om skillnaden mellan motion och proposition */}
      <div className="rounded-lg bg-muted/50 p-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border/40">
        <div className="space-y-0.5 max-w-2xl">
          <p className="font-medium text-foreground">
            Varför avslås oftast motioner från oppositionen?
          </p>
          <p className="leading-relaxed">
            I Sverige styr regeringen med stöd av en riksdagsmajoritet. Propositioner från
            regeringen bifalls därför i regel, medan motioner från oppositionen oftast avslås i
            utskottet och i kammaren.
          </p>
        </div>
        <Link
          to="/neutralitet"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
        >
          Läs om hur vi tolkar besluten
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
