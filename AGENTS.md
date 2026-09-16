<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Hantering av Issues/Tickets (Github)
- När en Agent plockar upp en issue ska Agenten alltid kommentera "Påbörjad av [AGENTNAMN]".
- Vid avslutat arbete ska issuen uppdateras med en kommentar på vad som gjorts, varför samt stängas med rätt status. Detta för att undvika att två agenter eller personer arbetar med samma issue samtidigt. 

## Utveckling

- `npm run dev` startar Vite/TanStack Start. `npx tsc --noEmit` för typkontroll, `npm run lint` för ESLint (många befintliga prettier-avvikelser – formatera bara filer du själv rör).
- Serverfunktioner ligger i `src/lib/insikt.functions.ts`. Moduler med hemligheter (`*.server.ts`) importeras dynamiskt inuti handlers så att de inte hamnar i klientbundeln.

## Datalager (Firestore)

- All data ligger i Firestore Native `(default)` i `europe-north1` och nås bara via Admin SDK på servern (`src/lib/fs-db.server.ts` + `src/integrations/firebase/server.ts`). Klienten når aldrig databasen (`firestore.rules` nekar allt).
- Samlingar speglar gamla Supabase-tabellerna (`ledamoter`, `uppdrag`, `partier`, `arenden`, `beslutspunkter`, `voteringar`, `roster`, `partitotaler`, `sakfragor`, `ai_sammanfattningar`, `ai_voteringssammanfattningar`, `felrapporter`, `inlasningar`, `anvandarroller`). `arende_sakfragor` är denormaliserat till `arenden.sakfragor`/`sakfragor_kalla` och `voteringar.sakfragor`.
- Denormaliserat vid skrivning: `voteringar.organ`/`arende_titel`, `partitotaler.majoritetsrost`/`enligt` (+ voteringsmeta), `roster.partimajoritet` (+ voteringsmeta), `ledamoter.utskott[]`.
- Aggregeringsdokument: `rostmatriser/{ledamot_id}.poster` (röster per votering med majoritet/datum/sakfragor) ersätter RPC:erna `ledamot_sammanfattning`/`jamfor_ledamoter`; `partimajoriteter/{parti}.poster` ersätter `v_partimajoritet`/`parti_likhet`/`jamfor_partier`. `parti_sammanhallning` räknas från `partitotaler.enligt`. Underhålls av `riksdagen.server.ts` vid inläsning.
- SQL-vyn `v_partimajoritet` motsvaras av `majoritetsrost()` i `fs-db.server.ts` (oavgjort → null).
- Textsökning görs i minnet efter equality-filter – Firestore saknar contains-sök.
- Migrationsskript (engångskörning, idempotent, återupptagbart): `node scripts/migrera-till-firestore.mjs`. Kräver `SUPABASE_*` i `.env` + ADC (`gcloud auth application-default login`).
- `valloften` innehåller kurerade vallöften (citat ur valmanifest 2022 via SND:s Vivill-arkiv) kopplade till voteringar med `relation` (direkt/delvis/relaterad), `riktning` (röst i linje med löftet, eller null) och neutrala `forklaringar`. Seeda/uppdatera med `node scripts/seed-valloften.mjs` (idempotent, deterministiska dokument-ID:n; kräver ADC).

## Auth

- Firebase Auth (e-post/lösenord). Klient: `src/integrations/firebase/client.ts` (`firebaseAuth()`). Servermiddleware `requireFirebaseAuth` verifierar ID-token; adminroll = `anvandarroller/{uid}` `{ role: "admin" }` i Firestore (skapas manuellt).

## Miljövariabler (server)

- `FIREBASE_PROJECT_ID` – default `insikt-riksdag`. ADC används för Firestore (på Cloud Run tjänstens servicekonto; lokalt `gcloud auth application-default login`).
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` – publik klientkonfiguration för Auth.
- `GEMINI_API_KEY` – krävs för AI-sammanfattningar av voteringar (`src/lib/gemini.server.ts`). Saknas nyckeln visas ingen sammanfattningsruta alls. Modellen är låst till `gemini-flash-lite-latest` – byt inte modell.
- Rate limits för AI-generering (`src/lib/rate-limit.server.ts`, in-memory per process, valfria): `AI_LIMIT_IP_PER_10MIN` (10), `AI_LIMIT_GLOBAL_PER_MIN` (15), `AI_LIMIT_GLOBAL_PER_DAY` (1000). Googles egna 429 hanteras som globalt stopp.
- `INGEST_SECRET` – delad hemlighet för `/api/public/hooks/inlasning` (header `x-insikt-secret`).
- `.env` är gitignorerad; mall i `.env.example`.

## Drift (Google Cloud / Firebase, projekt `insikt-riksdag`)

- Arkitektur: Firebase Hosting (`firebase.json`, CDN + domän) → rewrite till Cloud Run-tjänsten `insikt` i `europe-north1`. Firebase Hosting stöder inte `europe-north2`, därför Finland.
- Bygg & deploy: `gcloud builds submit --config cloudbuild.yaml --substitutions=_TAG=$(git rev-parse --short HEAD) --region=europe-north2 --project insikt-riksdag`. Bygger `Dockerfile`, pushar till Artifact Registry (`europe-north2-docker.pkg.dev/insikt-riksdag/insikt/app`) och deployar. Hosting + Firestore-regler deployas med `firebase deploy --only hosting,firestore`.
- Servern är Nitro `node-server` (`.output/server/index.mjs`, `npm start`). `VITE_*`-variabler bakas in vid bygget via `--build-arg`.
- Hemligheter i Secret Manager: `GEMINI_API_KEY`, `CRON_SECRET` (→ env `INGEST_SECRET`). Cloud Run-kontot (`741137979566-compute@…`) har `datastore.user` → Firestore-åtkomst utan nyckel.
- Org-policyn i Workspace blockerar `allUsers`-IAM och servicekonto-nycklar; tjänsten körs med `--no-invoker-iam-check`.
- Cloud Scheduler (`europe-west4`): `insikt-inlasning-voteringar` dagligen 05:00, `insikt-inlasning-ledamoter` måndagar 04:30 (Europe/Stockholm).
- Domän: `insikt.bearnecessitiesapps.com` (CNAME → `insikt-riksdag.web.app`).
