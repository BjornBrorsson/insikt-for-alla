## Genomfört arbete: AI-sammanfattningarna i Riksdagskompassen avslöjar inte utfallet i förväg

Issue #19 har åtgärdats, testats och driftsatts till Cloud Run.

### 1. Separering av sakfrågebakgrund och röstningsutfall
- **Under frågestadiet i Riksdagskompassen (`src/routes/kompass.tsx`):**
  - AI-sammanfattningsrutan visar nu enbart sakfrågebakgrunden (*"Vad frågan handlar om"*), dvs. vad förslagen, motionerna och propositionerna i sak gällde utan att avslöja vinnare, röstsiffror (t.ex. "172 mot 171 röster") eller partiernas ställningstaganden.
  - Användaren kan ta opåverkad och neutral ställning till frågan baserat på förslagets innebörd.
- **På resultatsidan (`visarResultat`):**
  - Efter avslutad kompass kan användaren fälla ut *"Visa hur omröstningen gick (AI-sammanfattning)"* under respektive parti i resultatgranskningen och läsa den fullständiga sammanfattningen inklusive röstsiffror och utfall.
- **I voteringsdetaljerna (`/voteringar/$id`):**
  - Visar fortsatt den fullständiga sammanfattningen i klartext inklusive utfall, i enlighet med önskemålet.

### 2. Utökad datastruktur och AI-modellstöd
- **`src/lib/voteringssammanfattning.server.ts`:**
  - Utökat `GenereradSammanfattning` och JSON-schemat för Gemini med separata fält för `bakgrund` (vad frågan gäller), `utfall` (röstsiffror och partiernas röster) och `betydelse` (beslutets praktiska konsekvenser), utöver den sammanslagna `sammanfattning`.
  - Lagt till `extraheraFrageBakgrund` för att på ett deterministiskt och bakåtkompatibelt sätt extrahera sakfrågebakgrunden ur befintliga cachade sammanfattningar.
- **`src/lib/insikt.functions.ts`:**
  - Utökat `KompassFraga` och `getKompassFragor` med `bakgrund: string | null` så att klienten får den rena sakfrågebakgrunden direkt utan risk för spoilers.

### 3. Validering och testning
- `npx tsc --noEmit` körd utan fel.
- `npx eslint` och Prettier godkända utan anmärkningar.
- End-to-end-test med browser subagent: verifierat att frågekortet endast visar frågebakgrunden och att resultatvyn tillåter att fälla ut hela utfallet.
- Driftsatt till Cloud Run via Cloud Build.
