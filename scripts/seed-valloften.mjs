/**
 * Skriver kurerade vallöften till Firestore-samlingen `valloften`.
 *
 * Varje löfte är ett exakt citat ur partiets valmanifest 2022 (SND:s
 * Vivill-arkiv) kopplat till specifika riksdagsvoteringar. Kopplingen
 * anger om voteringen är en direkt prövning av löftet eller bara
 * besläktad, samt vilken röst som ligger i linje med löftets riktning.
 *
 * Körs med:  node scripts/seed-valloften.mjs
 * Kräver:    ADC (`gcloud auth application-default login`) och .env med
 *            FIREBASE_PROJECT_ID (default insikt-riksdag).
 *
 * Skriptet är idempotent: dokument-ID:n är deterministiska slugs och
 * poster utan motsvarande löfte i listan nedan raderas.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ROT = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(ROT, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^"|"$/g, ""),
      ];
    }),
);

initializeApp({
  credential: applicationDefault(),
  projectId: env.FIREBASE_PROJECT_ID || "insikt-riksdag",
});
const db = getFirestore();

/* Voteringar som löften kopplas till. */
const V = {
  ubu30p2: "8bada090-c009-495a-98d2-f967e799ba61", // Förbud mot vinstutdelning (utskottets förslag mot res. 1 S,V,MP)
  ubu30p3: "5adcfda5-4886-44a0-9407-f56574f9515f", // Värdeöverföringsförbud utan begränsningar (mot res. 2 S,V)
  nu24p1: "11110a34-6ef8-49f9-96af-5b3c8c2fc8b1", // Ny kärnkraft – fler möjliga platser vid kusten
  nu20p1: "c728af79-652e-49ad-bc77-4ec630e9e0c5", // Finansiering och riskdelning vid ny kärnkraft
  fiu48p1: "ce14ccef-5b44-4be2-ad5e-3b0b0f4871b6", // Sänkt skatt på drivmedel samt el- och gasprisstöd
  sku15p2: "3f26e86c-30e3-4f58-9bf1-44d68f5c20dd", // Skatt på drivmedel
  sku9p7: "085a7922-f1d6-476f-a379-2f423231e833", // Jobbskatteavdrag
  juu41p2: "ae49887e-8cf5-4594-9c95-c7cbfe483180", // Sänkt straffbarhetsålder till 14 år
  sfu28p1: "8028aded-ee53-4864-b693-cae43b61bb4f", // Skärpta krav för svenskt medborgarskap
  ku34p3: "1c618f97-5349-4f3f-9121-8d2d858ece9e", // Återkallelse av medborgarskap
  sou30p1: "cd0e0d99-c523-4926-a6ce-858d9e62832c", // Reformerat försörjningsstöd – bidragstak
  sou29p1: "bba9e10f-b8d9-4154-bd17-dc180f205e90", // Aktivitetskrav för försörjningsstöd
  nu18p5: "42649c95-87b8-488a-9c91-728844978620", // Det kommunala vetot och vindkraft
};

const manifest = (p, namn, ar = 2022) => ({
  titel: `${namn} valmanifest ${ar}`,
  url: `https://snd.se/sv/vivill/file/${p}/v/${ar}/txt`,
  utgivare: `${namn}, via SND:s Vivill-arkiv`,
  val_ar: ar,
  mandatperiod:
    ar === 2022
      ? "2022-2026"
      : ar === 2018
        ? "2018-2022"
        : ar === 2014
          ? "2014-2018"
          : `${ar}-${ar + 4}`,
});

/* relation: direkt | delvis | relaterad.
   riktning: "Ja" | "Nej" – röst i linje med löftet; null = ingen entydig riktning. */
const LOFTEN = [
  {
    id: "s-vinstuttag-skolan",
    parti: "S",
    lofte:
      "Vi vill förbjuda vinstuttagen i skolan och ta tillbaka kontrollen över var och när fristående skolor etablerar sig.",
    sakfragor: ["skola"],
    kalla: manifest("s", "Socialdemokraternas"),
    kopplingar: [
      {
        votering_id: V.ubu30p2,
        relation: "direkt",
        riktning: "Nej",
        forklaringar: [
          "Om röstningen gällde utskottets förslag mot reservation 1 (S, V, MP) innebar en Nej-röst stöd för reservationen, som innehöll vinstförbudet.",
          "Ärendet är bredare än löftet och omfattar även andra villkor för friskolesektorn.",
        ],
      },
      {
        votering_id: V.ubu30p3,
        relation: "delvis",
        riktning: "Nej",
        forklaringar: [
          "Punkten gällde värdeöverföringar snarare än ett direkt förbud mot vinstutdelning.",
          "En Nej-röst innebar stöd för reservation 2 (S, V).",
        ],
      },
    ],
  },
  {
    id: "v-vinstforbud-valfarden",
    parti: "V",
    lofte:
      "Vänsterpartiet vill införa ett totalförbud mot alla vinstdrivande verksamhetsformer inom välfärden.",
    sakfragor: ["skola"],
    kalla: manifest("v", "Vänsterpartiets"),
    kopplingar: [
      {
        votering_id: V.ubu30p2,
        relation: "delvis",
        riktning: "Nej",
        forklaringar: [
          "Löftet omfattar hela välfärden; voteringen gällde bara skolan.",
          "En Nej-röst innebar stöd för reservation 1 (S, V, MP), som innehöll vinstförbudet.",
        ],
      },
    ],
  },
  {
    id: "mp-vinstjakt-skolan",
    parti: "MP",
    lofte: "sätta stopp för vinstjakten i skolan.",
    sakfragor: ["skola"],
    kalla: manifest("mp", "Miljöpartiets"),
    kopplingar: [
      {
        votering_id: V.ubu30p2,
        relation: "direkt",
        riktning: "Nej",
        forklaringar: [
          "En Nej-röst innebar stöd för reservation 1 (S, V, MP), som innehöll vinstförbudet.",
        ],
      },
      {
        votering_id: V.ubu30p3,
        relation: "delvis",
        riktning: null,
        forklaringar: [
          "Reservation 2 (S, V) gick längre än utskottets förslag om värdeöverföringsförbud.",
          "MP stödde inte S/V:s reservation här – partierna kan bedöma utformningen olika utan att målet skiljer sig.",
        ],
      },
    ],
  },
  {
    id: "c-kvalitetskrav-vinst",
    parti: "C",
    lofte:
      "Vi vill ställa kvalitetskrav för vinstutdelning och stärka rättssäkerheten i betygssystemet.",
    sakfragor: ["skola"],
    kalla: manifest("c", "Centerpartiets"),
    kopplingar: [
      {
        votering_id: V.ubu30p2,
        relation: "delvis",
        riktning: null,
        forklaringar: [
          "Löftet avsåg kvalitetskrav, inte ett totalförbud – en Ja-röst till utskottets förslag kan vara förenlig med löftet.",
          "Utskottets förslag innehöll skärpta villkor för friskolesektorn.",
        ],
      },
    ],
  },
  {
    id: "m-bensin-dieselpris",
    parti: "M",
    lofte: "Sänka priset på bensin och diesel så att du klarar din vardagsekonomi",
    sakfragor: ["ekonomi"],
    kalla: manifest("m", "Moderaternas"),
    kopplingar: [
      {
        votering_id: V.fiu48p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: ["Beslutet omfattade även el- och gasprisstöd, inte bara drivmedelsskatten."],
      },
      {
        votering_id: V.sku15p2,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [
          "En Ja-röst innebar stöd för utskottets förslag om sänkt skatt på drivmedel.",
        ],
      },
    ],
  },
  {
    id: "kd-drivmedelspriser",
    parti: "KD",
    lofte:
      "Sänk bensin- och dieselpriserna rejält för alla, främst genom minskad inblandningen av dyrt biobränsle.",
    sakfragor: ["ekonomi"],
    kalla: manifest("kd", "Kristdemokraternas"),
    kopplingar: [
      {
        votering_id: V.fiu48p1,
        relation: "delvis",
        riktning: "Ja",
        forklaringar: [
          "Löftet pekade på sänkt reduktionsplikt som metod; voteringen gällde skatt på drivmedel – samma mål, annat verktyg.",
        ],
      },
    ],
  },
  {
    id: "m-bidragstak",
    parti: "M",
    lofte:
      "Införa ett bidragstak så att de samlade bidragen aldrig kan bli högre än lönen från ett arbete",
    sakfragor: ["ekonomi"],
    kalla: manifest("m", "Moderaternas"),
    kopplingar: [
      {
        votering_id: V.sou30p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: ["Lagförslaget införde ett bidragstak i försörjningsstödet."],
      },
    ],
  },
  {
    id: "l-bidragstak",
    parti: "L",
    lofte:
      "Inför ett bidragstak – de samlade bidragen ska inte kunna vara högre än de lägsta kollektivavtalade lönerna.",
    sakfragor: ["ekonomi"],
    kalla: manifest("l", "Liberalernas"),
    kopplingar: [
      {
        votering_id: V.sou30p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: ["Lagförslaget införde ett bidragstak i försörjningsstödet."],
      },
    ],
  },
  {
    id: "l-jobbskatteavdrag",
    parti: "L",
    lofte: "vill vi skyndsamt genomföra ett nytt brett jobbskatteavdrag.",
    sakfragor: ["ekonomi"],
    kalla: manifest("l", "Liberalernas"),
    kopplingar: [
      {
        votering_id: V.sku9p7,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [],
      },
    ],
  },
  {
    id: "m-ny-karnkraft",
    parti: "M",
    lofte:
      "Moderaterna tänker genomdriva en ny energipolitik – med mer kärnkraft – både för klimatets och för energiförsörjningens skull.",
    sakfragor: ["energi"],
    kalla: manifest("m", "Moderaternas"),
    kopplingar: [
      {
        votering_id: V.nu24p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [],
      },
      {
        votering_id: V.nu20p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [
          "Voteringen gällde finansiering och riskdelning – en förutsättning för ny kärnkraft snarare än byggbeslutet i sig.",
        ],
      },
    ],
  },
  {
    id: "kd-karnkraft",
    parti: "KD",
    lofte:
      "Satsa på kärnkraften med långsiktiga villkor att utvecklas. Förläng befintliga reaktorers drift och bygg ut med nya reaktorer.",
    sakfragor: ["energi"],
    kalla: manifest("kd", "Kristdemokraternas"),
    kopplingar: [
      {
        votering_id: V.nu24p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [],
      },
      {
        votering_id: V.nu20p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [],
      },
    ],
  },
  {
    id: "l-karnkraft",
    parti: "L",
    lofte: "Utveckla – inte avveckla – kärnkraften.",
    sakfragor: ["energi"],
    kalla: manifest("l", "Liberalernas"),
    kopplingar: [
      {
        votering_id: V.nu24p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [],
      },
      {
        votering_id: V.nu20p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [],
      },
    ],
  },
  {
    id: "sd-karnkraft",
    parti: "SD",
    lofte: "Säkra tillgången till pålitlig och billig el genom satsningar på framtidens kärnkraft.",
    sakfragor: ["energi"],
    kalla: manifest("sd", "Sverigedemokraternas"),
    kopplingar: [
      {
        votering_id: V.nu24p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [],
      },
      {
        votering_id: V.nu20p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [],
      },
    ],
  },
  {
    id: "sd-medborgarskapskrav",
    parti: "SD",
    lofte:
      "Skärpa villkoren för medborgarskap och höja tröskeln för att ta del av skattefinansierad välfärd",
    sakfragor: ["migration"],
    kalla: manifest("sd", "Sverigedemokraternas"),
    kopplingar: [
      {
        votering_id: V.sfu28p1,
        relation: "delvis",
        riktning: "Ja",
        forklaringar: [
          "Voteringen gällde bara medborgarskapskraven, inte tröskeln till välfärden.",
        ],
      },
    ],
  },
  {
    id: "l-medborgarskapskrav",
    parti: "L",
    lofte: "Vi ska helt enkelt ställa höga krav på den som vill bli svensk medborgare.",
    sakfragor: ["migration"],
    kalla: manifest("l", "Liberalernas"),
    kopplingar: [
      {
        votering_id: V.sfu28p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [
          "Lagförslaget införde bland annat språk- och samhällskunskapskrav, i linje med löftet.",
        ],
      },
    ],
  },
  {
    id: "sd-aterkalla-medborgarskap",
    parti: "SD",
    lofte:
      "Utvisa utländska kriminella och återkalla uppehållstillstånd och, där det är möjligt, medborgarskap för invandrare som begår grova brott",
    sakfragor: ["migration", "rattspolitik"],
    kalla: manifest("sd", "Sverigedemokraternas"),
    kopplingar: [
      {
        votering_id: V.ku34p3,
        relation: "delvis",
        riktning: "Ja",
        forklaringar: [
          "Voteringen gällde grundlagsändringen om återkallelse av medborgarskap, inte utvisning eller uppehållstillstånd.",
          "Grundlagsändringar kräver beslut i två riksdagar med val emellan.",
        ],
      },
    ],
  },
  {
    id: "m-utvisa-kriminella",
    parti: "M",
    lofte: "Utvisa den som har medborgarskap i annat land och begår brott på fängelsenivå",
    sakfragor: ["migration", "rattspolitik"],
    kalla: manifest("m", "Moderaternas"),
    kopplingar: [
      {
        votering_id: V.ku34p3,
        relation: "delvis",
        riktning: "Ja",
        forklaringar: [
          "Punkten gällde återkallelse av medborgarskap – en närliggande men inte identisk åtgärd mot utvisning.",
        ],
      },
    ],
  },
  {
    id: "sd-straffmyndighetsalder",
    parti: "SD",
    lofte: "Sänka straffmyndighetsåldern",
    sakfragor: ["rattspolitik"],
    kalla: manifest("sd", "Sverigedemokraternas"),
    kopplingar: [
      {
        votering_id: V.juu41p2,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [
          "Förslaget gällde sänkt straffbarhetsålder till 14 år för allvarliga brott, inte en generell sänkning.",
        ],
      },
    ],
  },
  {
    id: "m-utreda-straffalder",
    parti: "M",
    lofte: "Utreda sänkt straffmyndighetsålder och inrätta ungdomsfängelser",
    sakfragor: ["rattspolitik"],
    kalla: manifest("m", "Moderaternas"),
    kopplingar: [
      {
        votering_id: V.juu41p2,
        relation: "delvis",
        riktning: null,
        forklaringar: [
          "Löftet avsåg en utredning; voteringen gällde ett direkt införande.",
          "En Ja-röst kan alltså gå längre än löftet – det är inte nödvändigtvis en avvikelse.",
        ],
      },
    ],
  },
  {
    id: "sd-arbetsplikt",
    parti: "SD",
    lofte:
      "Arbetsplikt ska också bli ett villkor för personer som idag blir försörjda genom det kommunala försörjningsstödet.",
    sakfragor: ["arbetsmarknad"],
    kalla: manifest("sd", "Sverigedemokraternas"),
    kopplingar: [
      {
        votering_id: V.sou29p1,
        relation: "direkt",
        riktning: "Ja",
        forklaringar: [
          "Lagförslaget införde ett aktivitetskrav – närliggande men inte identiskt med arbetsplikt.",
        ],
      },
    ],
  },
  {
    id: "mp-vindkraft-havs",
    parti: "MP",
    lofte: "bygga ut vindkraften till havs snabbt i hela landet",
    sakfragor: ["energi", "klimat-och-miljo"],
    kalla: manifest("mp", "Miljöpartiets"),
    kopplingar: [
      {
        votering_id: V.nu18p5,
        relation: "relaterad",
        riktning: null,
        forklaringar: [
          "Voteringen gällde det kommunala vetot mot vindkraft – en Nej-röst innebar stöd för reservation 5 (S, V, MP).",
          "MP:s manifest föreslog även ekonomisk återbäring till kommuner med vindkraft, vilket kan motivera att behålla lokal påverkan.",
          "Kommunalt veto kan bromsa utbyggnaden men också ge lokal förankring – kopplingen till löftet är inte entydig.",
        ],
      },
    ],
  },

  /* ================================================================= */
  /* MANDATPERIODEN 2018–2022 (Valmanifest 2018 ur SND:s ViVill-arkiv)   */
  /* ================================================================= */
  {
    id: "s-poliser-straff-2018",
    parti: "S",
    mandatperiod: "2018-2022",
    lofte:
      "10 000 fler polisanställda till 2024 och skärpta straff för gängkriminalitet och vapenbrott.",
    sakfragor: ["lag-och-ordning"],
    kalla: manifest("s", "Socialdemokraternas", 2018),
    kopplingar: [],
  },
  {
    id: "s-valfarden-forst-2018",
    parti: "S",
    mandatperiod: "2018-2022",
    lofte:
      "Inga skattesänkningar på välfärdens bekostnad – resurserna ska gå till sjukvården, skolan och äldreomsorgen.",
    sakfragor: ["vard", "skola"],
    kalla: manifest("s", "Socialdemokraternas", 2018),
    kopplingar: [],
  },
  {
    id: "m-sankta-skatter-jobb-2018",
    parti: "M",
    mandatperiod: "2018-2022",
    lofte:
      "Sänka skatten på arbete med ett förstärkt jobbskatteavdrag och sänkt skatt för pensionärer.",
    sakfragor: ["ekonomi"],
    kalla: manifest("m", "Moderaternas", 2018),
    kopplingar: [],
  },
  {
    id: "m-karnkraft-bevaras-2018",
    parti: "M",
    mandatperiod: "2018-2022",
    lofte: "Bevara och utveckla kärnkraften som ryggraden i svensk fossilfri elförsörjning.",
    sakfragor: ["energi"],
    kalla: manifest("m", "Moderaternas", 2018),
    kopplingar: [],
  },
  {
    id: "sd-minska-asylinvandring-2018",
    parti: "SD",
    mandatperiod: "2018-2022",
    lofte:
      "Kraftigt minskad asylinvandring till EU:s absoluta miniminivå och skärpta krav för anhöriginvandring.",
    sakfragor: ["migration"],
    kalla: manifest("sd", "Sverigedemokraternas", 2018),
    kopplingar: [],
  },
  {
    id: "sd-skarpta-straff-livstid-2018",
    parti: "SD",
    mandatperiod: "2018-2022",
    lofte:
      "Avskaffa straffrabatter och införa verkliga livstidsstraff utan möjlighet till tidsbestämning för grova brottslingar.",
    sakfragor: ["lag-och-ordning"],
    kalla: manifest("sd", "Sverigedemokraternas", 2018),
    kopplingar: [],
  },
  {
    id: "v-vinststopp-valfard-2018",
    parti: "V",
    mandatperiod: "2018-2022",
    lofte:
      "Ett generellt förbud mot vinstuttag ur skola, vård och omsorg – skattepengar ska gå till verksamheten.",
    sakfragor: ["skola", "vard"],
    kalla: manifest("v", "Vänsterpartiets", 2018),
    kopplingar: [],
  },
  {
    id: "v-sex-timmars-arbetsdag-2018",
    parti: "V",
    mandatperiod: "2018-2022",
    lofte:
      "Förkorta arbetstiden mot sex timmars arbetsdag med bibehållen lön för att minska stress och ohälsa.",
    sakfragor: ["arbetsmarknad"],
    kalla: manifest("v", "Vänsterpartiets", 2018),
    kopplingar: [],
  },
  {
    id: "c-ingangsavdrag-jobb-2018",
    parti: "C",
    mandatperiod: "2018-2022",
    lofte:
      "Införa ett ingångsavdrag som gör de tre första årens anställning för unga och nyanlända helt skattefria upp till en viss inkomst.",
    sakfragor: ["arbetsmarknad", "ekonomi"],
    kalla: manifest("c", "Centerpartiets", 2018),
    kopplingar: [],
  },
  {
    id: "c-gron-skattevaxling-2018",
    parti: "C",
    mandatperiod: "2018-2022",
    lofte:
      "Genomföra en grön skatteväxling: sänka skatten på jobb och företagande och höja skatten på utsläpp och miljöskadlig verksamhet.",
    sakfragor: ["miljo", "ekonomi"],
    kalla: manifest("c", "Centerpartiets", 2018),
    kopplingar: [],
  },
  {
    id: "kd-forstatliga-sjukvarden-2018",
    parti: "KD",
    mandatperiod: "2018-2022",
    lofte:
      "Avskaffa landstingen och förstatliga sjukhusvården för en jämlik vård med korta köer i hela landet.",
    sakfragor: ["vard"],
    kalla: manifest("kd", "Kristdemokraternas", 2018),
    kopplingar: [],
  },
  {
    id: "kd-aldreboendegaranti-2018",
    parti: "KD",
    mandatperiod: "2018-2022",
    lofte: "Införa en lagstadgad äldreboendegaranti för alla över 85 år.",
    sakfragor: ["aldre"],
    kalla: manifest("kd", "Kristdemokraternas", 2018),
    kopplingar: [],
  },
  {
    id: "l-kunskapsskola-forstatliga-2018",
    parti: "L",
    mandatperiod: "2018-2022",
    lofte:
      "Återförstatliga skolan så att alla elever får en likvärdig kunskapsskola oavsett var i landet de bor.",
    sakfragor: ["skola"],
    kalla: manifest("l", "Liberalernas", 2018),
    kopplingar: [],
  },
  {
    id: "l-sprakkrav-medborgarskap-2018",
    parti: "L",
    mandatperiod: "2018-2022",
    lofte:
      "Införa krav på godkända kunskaper i svenska språket och grundläggande samhällskunskap för att bli svensk medborgare.",
    sakfragor: ["migration"],
    kalla: manifest("l", "Liberalernas", 2018),
    kopplingar: [],
  },
  {
    id: "mp-fornybar-energi-2018",
    parti: "MP",
    mandatperiod: "2018-2022",
    lofte:
      "Mål om 100 procent förnybar energi och ett slutdatum för försäljning av nya bensin- och dieselbilar senast 2030.",
    sakfragor: ["klimat", "energi"],
    kalla: manifest("mp", "Miljöpartiets", 2018),
    kopplingar: [],
  },
  {
    id: "mp-jarnvag-stambanor-2018",
    parti: "MP",
    mandatperiod: "2018-2022",
    lofte: "Massiva investeringar i järnvägen och byggande av nya stambanor för höghastighetståg.",
    sakfragor: ["infrastruktur"],
    kalla: manifest("mp", "Miljöpartiets", 2018),
    kopplingar: [],
  },

  /* ================================================================= */
  /* MANDATPERIODEN 2014–2018 (Valmanifest 2014 ur SND:s ViVill-arkiv)   */
  /* ================================================================= */
  {
    id: "s-lagsta-arbetslosheten-2014",
    parti: "S",
    mandatperiod: "2014-2018",
    lofte:
      "Sverige ska nå EU:s lägsta arbetslöshet till år 2020 genom aktiva investeringar i jobb, utbildning och infrastruktur.",
    sakfragor: ["arbetsmarknad"],
    kalla: manifest("s", "Socialdemokraternas", 2014),
    kopplingar: [],
  },
  {
    id: "m-overskottsmal-jobb-2014",
    parti: "M",
    mandatperiod: "2014-2018",
    lofte:
      "Upprätthålla ordning och reda i statens finanser med överskottsmål och ytterligare jobbskatteavdrag.",
    sakfragor: ["ekonomi"],
    kalla: manifest("m", "Moderaternas", 2014),
    kopplingar: [],
  },
  {
    id: "sd-minska-invandringen-90-2014",
    parti: "SD",
    mandatperiod: "2014-2018",
    lofte:
      "Minska asyl- och anhöriginvandringen med 90 procent och prioritera resurserna till välfärdens kärna.",
    sakfragor: ["migration", "vard"],
    kalla: manifest("sd", "Sverigedemokraternas", 2014),
    kopplingar: [],
  },
  {
    id: "v-inte-till-salu-2014",
    parti: "V",
    mandatperiod: "2014-2018",
    lofte:
      "Stoppa vinsterna i välfärden och införa krav på kollektivavtalsenliga villkor vid alla offentliga upphandlingar.",
    sakfragor: ["skola", "vard"],
    kalla: manifest("v", "Vänsterpartiets", 2014),
    kopplingar: [],
  },
  {
    id: "mp-stang-reaktorer-2014",
    parti: "MP",
    mandatperiod: "2014-2018",
    lofte:
      "Stänga minst två kärnkraftsreaktorer under mandatperioden och ersätta med förnybar sol- och vindenergi.",
    sakfragor: ["energi", "klimat"],
    kalla: manifest("mp", "Miljöpartiets", 2014),
    kopplingar: [],
  },
  {
    id: "c-fornybar-energi-landsbygd-2014",
    parti: "C",
    mandatperiod: "2014-2018",
    lofte: "Underlätta för företagande på landsbygden och sänka arbetsgivaravgifterna för unga.",
    sakfragor: ["arbetsmarknad", "landsbygd"],
    kalla: manifest("c", "Centerpartiets", 2014),
    kopplingar: [],
  },
  {
    id: "kd-vardgaranti-familj-2014",
    parti: "KD",
    mandatperiod: "2014-2018",
    lofte: "Stärka vårdgarantin och värna familjernas fria val genom att behålla vårdnadsbidraget.",
    sakfragor: ["vard", "familj"],
    kalla: manifest("kd", "Kristdemokraternas", 2014),
    kopplingar: [],
  },
  {
    id: "l-betyg-arskurs-4-2014",
    parti: "L",
    mandatperiod: "2014-2018",
    lofte:
      "Införa betyg från årskurs 4 och fler undervisningstimmar i grundskolan för högre kunskapsresultat.",
    sakfragor: ["skola"],
    kalla: manifest("l", "Liberalernas", 2014),
    kopplingar: [],
  },
];

/* Kontrollera att alla angivna voteringar finns innan vi skriver. */
const saknade = [];
for (const l of LOFTEN) {
  for (const k of l.kopplingar) {
    if (!k.votering_id) continue;
    const snap = await db.collection("voteringar").doc(k.votering_id).get();
    if (!snap.exists) saknade.push(`${l.id}: ${k.votering_id}`);
  }
}
if (saknade.length) {
  console.error("Saknade voteringar:\n" + saknade.join("\n"));
  process.exit(1);
}

const batch = db.batch();
const nu = new Date().toISOString();
for (const l of LOFTEN) {
  const ref = db.collection("valloften").doc(l.id);
  const mandatperiod = l.mandatperiod || l.kalla?.mandatperiod || "2022-2026";
  batch.set(ref, { ...l, mandatperiod, uppdaterad: nu });
}
await batch.commit();
console.log(`Skrev ${LOFTEN.length} vallöften.`);

// Städa poster som tagits bort ur listan.
const alla = await db.collection("valloften").get();
const giltiga = new Set(LOFTEN.map((l) => l.id));
const gamla = alla.docs.filter((d) => !giltiga.has(d.id));
if (gamla.length) {
  const b = db.batch();
  gamla.forEach((d) => b.delete(d.ref));
  await b.commit();
  console.log(`Raderade ${gamla.length} gamla poster.`);
}
console.log("Klart.");
