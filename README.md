# Insikt

**Insikt gör Sveriges riksdags arbete begripligt, transparent och granskningsbart.**

Vilka representerar min valkrets? Hur röstade ett parti i en specifik fråga? Vilka
ledamöter röstar annorlunda än sin partimajoritet? Insikt svarar med fakta och
länkar alltid till originalkällan – aldrig med åsikter.

- **Livesajt:** [insikt.bearnecessitiesapps.com](https://insikt.bearnecessitiesapps.com)
- **Datakälla:** [Riksdagens öppna data](https://data.riksdagen.se)
- **Licens:** [EUPL-1.2](LICENSE) – kodbasen är öppen och får inspekteras, återanvändas och granskas av vem som helst.

## Vad finns på sidan

| Sida | Innehåll |
| --- | --- |
| Ledamöter | Sökbar katalog med porträtt, parti, valkrets och utskottsuppdrag. |
| Partier | Mandatantal, voteringshistorik, sammanhållning och vilka partier de oftast röstat lika som. |
| Voteringar | Sökbart arkiv över registrerade voteringar med utfall per kammare, parti och ledamot. |
| Avvikelser | Ledamöter som röstat annorlunda än sin egen partimajoritet. |
| Splittringar | Voteringar där partierna varit oeniga internt. |
| Vallöften | Citat ur partiernas valmanifest 2022 (SND:s Vivill-arkiv) ställda mot registrerade röster, med källor och neutrala möjliga förklaringar. |
| Sakfrågor | Ämnessidor (klimat, skola, sjukvård, ekonomi m.fl.) som samlar ärenden och röster. |
| Jämför | Ledamot mot ledamot eller parti mot parti i gemensamma voteringar. |
| Bevakningar | Följ ledamöter, partier och sakfrågor (konto krävs). |

## Granska beräkningarna

Förtroende kan inte krävas – det ska kunna verifieras. Alla sammanställningar
som Insikt själv gör är markerade i gränssnittet och dokumenterade i koden:

- **Partiets majoritetsröst** – `majoritetsrost()` i
  [`src/lib/fs-db.server.ts`](src/lib/fs-db.server.ts). Ett partis majoritetsröst
  är den röst (Ja/Nej/Avstår) som flest av partiets ledamöter avgav; vid oavgjort
  redovisas ingen majoritet. Det är aldrig automatiskt ”partilinjen”.
- **Sammanhållning** – andelen avgivna röster som följer partiets majoritet,
  beräknad från `partitotaler.enligt` i `src/lib/insikt.functions.ts`.
- **Röstlikhet mellan partier/ledamöter** – jämför Ja/Nej/Avstår i gemensamma
  voteringar via `partimajoriteter`- och `rostmatriser`-aggregaten. Likhet visar
  röstlikhet, inte ideologi eller motiv.
- **Avvikelser** – förberäknas i `src/lib/aggregat.server.ts` och läses via
  `getAvvikelser`/`getSplittringar`.
- **Vallöften** – kurerade citat i samlingen `valloften`, seedade av
  `scripts/seed-valloften.mjs`. Varje koppling till en votering anger relation
  (direkt/delvis/relaterad) och om löftets riktning är entydig.
- **Inläsning och uppdatering** – `src/lib/riksdagen.server.ts` hämtar ledamöter,
  ärenden och voteringar från riksdagens API och denormaliserar röstdata vid
  skrivning. Cloud Scheduler kör inläsning dagligen.

## Teknik

- **Ramverk:** TanStack Start + React 19 (SSR), TanStack Router & Query, Vite, Nitro
- **Databas:** Cloud Firestore (Native, `europe-north1`) – nås endast via
  Firebase Admin SDK på servern. Klienten når aldrig databasen direkt
  (`firestore.rules` nekar all läsning).
- **Auth:** Firebase Auth (e-post/lösenord) för bevakningar.
- **Drift:** Firebase Hosting (CDN) → Cloud Run-tjänsten `insikt`
  (`europe-north1`). Bygg & deploy via `cloudbuild.yaml` + `Dockerfile`.
- **AI:** Vissa sammanfattningar genereras med Gemini och är alltid märkta
  ”AI-genererad sammanfattning”. AI används aldrig för att gissa röster,
  beslutsutfall eller motiv.

## Utveckling lokalt

Kräver Node.js 22+ och `gcloud`-CLI med application default credentials.

```sh
git clone https://github.com/BjornBrorsson/insikt-for-alla.git
cd insikt-for-alla
npm install
gcloud auth application-default login   # för Firestore-åtkomst
cp .env.example .env                    # fyll i publika Firebase-nycklar
npm run dev
```

| Kommando | Gör |
| --- | --- |
| `npm run dev` | Utvecklingsserver |
| `npx tsc --noEmit` | Typkontroll |
| `npm run lint` | ESLint |
| `npm run build` | Produktionsbygge → `.output/` |
| `node .output/server/index.mjs` | Kör byggd server lokalt |
| `node scripts/seed-valloften.mjs` | Skriver kurerade vallöften till Firestore |
| `node scripts/migrera-till-firestore.mjs` | Engångsmigration från Supabase (idempotent) |

Se `AGENTS.md` för detaljer om datalager, miljövariabler, drift och
repository-konventioner.

## Bidra och rapportera fel

Buggar och felaktiga uppgifter kan rapporteras via sidans
[felrapportering](https://insikt.bearnecessitiesapps.com/rapportera-fel) eller som
[GitHub-issue](https://github.com/BjornBrorsson/insikt-for-alla/issues).
Pull requests är välkomna – håll förändringarna sakliga och källbaserade,
i linje med projektets neutralitetsprincip.

## Licens

Koden licensieras under **EUPL-1.2** (European Union Public Licence). EUPL är
EU:s officiella licens för öppen programvara: den är copyleft, täcker även
nätverksanvändning (tjänster) och är kompatibel med GPL/AGPL och flera andra
licenser. Den svenska licenstexten – som är en av EUPL:s 23 officiella
språkversioner – finns i [`LICENSE`](LICENSE).
