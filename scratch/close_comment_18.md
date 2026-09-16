## Genomfört arbete: Utöka och automatisera Vallöfteskollen

Issue #18 har implementerats och driftsatts till Cloud Run.

### 1. Tidsmaskin och utökning med historiska mandatperioder
- **Tidsmaskin-väljare i gränssnittet (`src/routes/valloften.tsx`):**
  - Möjlighet att växla mellan mandatperioderna:
    - **2022–2026 (Nuvarande)**
    - **2018–2022**
    - **2014–2018**
    - **Alla mandatperioder**
  - Integrerad med URL-sökparametrar (`?mandatperiod=...`), parti- och sakfrågefilter.
- **Kurerade vallöften från valmanifest:**
  - Utökat `scripts/seed-valloften.mjs` med autentiska citat ur partiernas valmanifest för 2018 och 2014 via Svensk Nationell Datatjänsts (SND) ViVill-arkiv.
  - Totalt 45 kurerade vallöften fördelade över partierna och tre mandatperioder.
  - Varje löfte redovisar manifestkälla, valår, mandatperiod och direktlänk till SND:s originalfiler.
  - Historiska vallöften där motsvarande historiska voteringar ännu inte är inlästa i databasen presenteras med ett informativt, neutralt arkivkort med länk till originalmanifestet och förklaring av pågående synkning.

### 2. Automatiserad synkning mot riksdagsdata
- **Synkmodul (`src/lib/valloften-synk.server.ts`):**
  - Implementerat `synkaValloftenMotVoteringar()` som läser in vallöften, verifierar röstningsdata mot `voteringar` och `partitotaler`, uppdaterar tidsstämplar (`senast_synkad`) och loggar till Firestore-samlingen `inlasningar`.
- **Webhook & Schemaläggning (`src/routes/api/public/hooks/inlasning.ts`):**
  - Stöd för anrop med `{ "typ": "valloften" }` skyddat med `INGEST_SECRET`, för schemalagda körningar via Cloud Scheduler eller efter nya riksmötesinläsningar.
- **Serverfunktion (`src/lib/insikt.functions.ts`):**
  - Exponerat `synkaValloften` samt utökat `korInlasning` för administrativ körning.

### 3. Validering och testning
- Fullständig typkontroll med `npx tsc --noEmit` (0 fel).
- Kodformatering och linting med ESLint/Prettier (0 fel/varningar).
- End-to-end-verifiering i webbläsare med browser subagent: Tidsmaskinens knappar och filtrering växlar korrekt mellan perioderna och visar respektive källor och status.
