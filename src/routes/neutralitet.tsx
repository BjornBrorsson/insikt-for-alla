import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Database,
  Code2,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Sidhuvud } from "@/components/insikt/tillstand";

export const Route = createFileRoute("/neutralitet")({
  head: () => ({
    meta: [
      { title: "Neutralitet & oberoende — Insikt" },
      {
        name: "description",
        content:
          "Hur Insikt garanterar partipolitiskt oberoende, öppen källkod, strikta AI-gränser och full spårbarhet till Riksdagens öppna data.",
      },
    ],
  }),
  component: Neutralitet,
});

function Neutralitet() {
  return (
    <div>
      <Sidhuvud
        rubrik="Neutralitet & oberoende"
        lead="Demokrati kräver fakta utan filter. Här redogör vi för de principer, metoder och tekniska garantier som säkerställer att Insikt förblir helt neutralt, sakligt och granskningsbart för alla."
      />

      <div className="mx-auto max-w-4xl px-4 py-12 space-y-12 text-foreground">
        {/* Kärnlöftet */}
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
              <ShieldCheck className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                Vårt löfte: Fakta, inte åsikter
              </h2>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Insikt drivs inte av något politiskt parti, intresseförbund, fackförbund,
                näringslivsorganisation eller mediabolag. Vi tar aldrig ställning för eller emot
                någon politik, vi sätter inga betyg och vi delar inte ut några pekpinnar. Vårt enda
                uppdrag är att göra riksdagens faktiska arbete begripligt och öppet.
              </p>
            </div>
          </div>
        </section>

        {/* 1. Datakällan och full spårbarhet */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-medium text-foreground">
              1. 100 % officiell data med full källhänvisning
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All data på Insikt hämtas direkt och oförvanskat från Sveriges riksdags officiella öppna
            API (
            <a
              href="https://data.riksdagen.se"
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
            >
              data.riksdagen.se
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            ). Vi gör inget selektivt urval av ärenden eller voteringar för att framhäva eller dölja
            något.
          </p>
          <div className="rounded-lg bg-muted/60 p-4 text-xs text-muted-foreground space-y-2 border border-border/50">
            <p className="font-medium text-foreground">Direkt spårbarhet på varje sida:</p>
            <p>
              På varje voteringssida och ärendesida finns en direktlänk till Riksdagens
              originaldokument, officiella protokoll och betänkandets PDF. Om du någonsin undrar var
              en siffra eller formulering kommer ifrån kan du med ett klick kontrollera det mot
              statens officiella handlingar.
            </p>
          </div>
        </section>

        {/* 2. Metod och regelbaserad tolkning */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-medium text-foreground">
              2. Regelbaserad tolkning – Varför ”Ja” kan betyda ”Avslå”
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ett av de vanligaste missförstånden om riksdagen är hur omröstningar formuleras. I
            kammaren röstar ledamöterna på <em>utskottets förslag</em> till beslut.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-lg border border-border bg-background p-4 space-y-1.5">
              <p className="font-semibold text-foreground">När utskottet föreslår avslag:</p>
              <p className="text-muted-foreground leading-relaxed">
                Om ett utskott vill säga nej till en motion, är utskottets förslag ”avslå motionen”.
                En ledamot som då röstar <strong>Ja</strong> röstar alltså <em>för</em> utskottets
                avslagsförslag, dvs. <em>emot</em> motionen.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4 space-y-1.5">
              <p className="font-semibold text-foreground">Vår transparenta regelmotor:</p>
              <p className="text-muted-foreground leading-relaxed">
                Insikt använder en strikt regelbaserad analysmotor (
                <code className="bg-muted px-1 py-0.5 rounded font-mono">analyseraBeslut</code>) som
                automatiskt parsar utskottets förslag och motförslagen för att förklara vad Ja och
                Nej faktiskt innebar i praktiken.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic border-t border-border/60 pt-3">
            <strong>Tolkningsprincip:</strong> En röst i riksdagen gäller uteslutande den specifika
            beslutspunkten och det exakta lagförslaget. Den får aldrig generaliseras till att ett
            parti generellt är ”för” eller ”emot” ett helt politikområde.
          </p>
        </section>

        {/* 3. AI-gränsen */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            <h2 className="text-xl font-medium text-foreground">
              3. AI-gränsen – Strikt källbunden text utan åsikter
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            För att göra omfattande betänkanden läsbara använder Insikt generativ AI (Google Gemini
            Flash Lite). För att garantera neutralitet tillämpas strikta skyddsregler:
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 text-xs">
            <li className="flex items-start gap-2.5 rounded-lg border border-border bg-background p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Bara officiell källdata:</strong> Endast riksdagens officiella text matas
                in. Inga tidningsartiklar, inga debattinlägg och inga externa åsikter tillåts i
                underlaget.
              </span>
            </li>
            <li className="flex items-start gap-2.5 rounded-lg border border-border bg-background p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Förbud mot värdeord:</strong> Systemprompten förbjuder uttryckligen
                värderande formuleringar, partipolitisk laddning och spekulationer om motiv.
              </span>
            </li>
            <li className="flex items-start gap-2.5 rounded-lg border border-border bg-background p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Tydlig transparens:</strong> Samtliga AI-texter är märkt med lila badge,
                modellnamn och käll-URL.
              </span>
            </li>
            <li className="flex items-start gap-2.5 rounded-lg border border-border bg-background p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Kvalitetsvarning:</strong> Om underlaget från riksdagen är för kort eller
                otillräckligt varnas användaren eller så genereras ingen sammanfattning alls.
              </span>
            </li>
          </ul>
        </section>

        {/* 4. Öppen källkod */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <Code2 className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-medium text-foreground">
              4. Full insyn med öppen källkod (Open Source)
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Förtroende kan inte krävas – det måste kunna bevisas. Hela kodbasen bakom Insikt är
            öppen och licensierad under öppen källkod.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vem som helst – journalister, forskare, medborgare eller politiska partier – kan
            inspektera källkoden, granska hur vi räknar ut röstlikhet, hur texter tolkas och hur
            databasen uppdateras:
          </p>
          <div className="pt-1">
            <a
              href="https://github.com/BjornBrorsson/insikt-for-alla"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
            >
              <Code2 className="h-4 w-4" aria-hidden="true" />
              Inspektera koden på GitHub (BjornBrorsson/insikt-for-alla)
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* 5. Vad Insikt INTE gör */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <h2 className="text-xl font-medium text-foreground">5. Vad Insikt aldrig gör</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-border/80 bg-background p-4 space-y-1">
              <p className="font-semibold text-foreground">Inga politiska betyg</p>
              <p className="text-muted-foreground leading-relaxed">
                Vi utser aldrig ”bästa parti”, ”mest aktiva ledamot” eller liknande rankningar.
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background p-4 space-y-1">
              <p className="font-semibold text-foreground">Inga valrekommendationer</p>
              <p className="text-muted-foreground leading-relaxed">
                Vi säger aldrig vem du ska rösta på. Vi redovisar hur folkvalda har röstat i
                verkligheten.
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background p-4 space-y-1">
              <p className="font-semibold text-foreground">Ingen åsiktsspårning</p>
              <p className="text-muted-foreground leading-relaxed">
                Dina bevakningar och eventuella skuggröster sparas enbart i din egen webbläsare och
                skickas aldrig till servern.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Ägarskap, finansiering och felrapportering */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-medium text-foreground">
              6. Ägarskap, finansiering och felrapportering
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Insikt är utvecklat av Björn Brorsson som ett oberoende samhällsprojekt för att stärka
            den svenska demokratin. Projektet har inga kopplingar till politiska partier eller
            externa sponsringsavtal.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/60 p-4 border border-border/50 text-xs">
            <div className="space-y-1 max-w-lg">
              <p className="font-medium text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Hittat ett fel eller en oklarhet?
              </p>
              <p className="text-muted-foreground">
                Om något i datan verkar felaktigt eller om en tolkning kan missförstås, rapportera
                det gärna. Vi granskar alla anmälningar och rättar fel skyndsamt och öppet.
              </p>
            </div>
            <Link
              to="/rapportera-fel"
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3.5 py-2 text-xs font-medium hover:bg-accent transition-colors"
            >
              Rapportera fel
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
