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

## Utveckling

- `npm run dev` startar Vite/TanStack Start. `npx tsc --noEmit` för typkontroll, `npm run lint` för ESLint (många befintliga prettier-avvikelser – formatera bara filer du själv rör).
- Serverfunktioner ligger i `src/lib/insikt.functions.ts`. Moduler med hemligheter (`*.server.ts`) importeras dynamiskt inuti handlers så att de inte hamnar i klientbundeln.

## Miljövariabler (server)

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` – databas.
- `GEMINI_API_KEY` – krävs för AI-sammanfattningar av voteringar (`src/lib/gemini.server.ts`). Saknas nyckeln visas ingen sammanfattningsruta alls. Modellen är låst till `gemini-flash-lite-latest` – byt inte modell.
- Rate limits för AI-generering (`src/lib/rate-limit.server.ts`, in-memory per process, valfria): `AI_LIMIT_IP_PER_10MIN` (10), `AI_LIMIT_GLOBAL_PER_MIN` (15), `AI_LIMIT_GLOBAL_PER_DAY` (1000). Googles egna 429 hanteras som globalt stopp.
- Sammanfattningar genereras vid första sidvisningen och cachas i tabellen `ai_voteringssammanfattningar`; redaktionen kan sätta `granskad`/redigera texten via service role.
- `INGEST_SECRET` – delad hemlighet för `/api/public/hooks/inlasning` (header `x-insikt-secret`).
- `.env` är gitignorerad; mall i `.env.example`.

## Drift (Google Cloud / Firebase, projekt `insikt-riksdag`)

- Arkitektur: Firebase Hosting (`firebase.json`, CDN + domän) → rewrite till Cloud Run-tjänsten `insikt` i `europe-north1`. Firebase Hosting stöder inte `europe-north2`, därför Finland.
- Bygg & deploy: `gcloud builds submit --config cloudbuild.yaml --substitutions=_TAG=$(git rev-parse --short HEAD) --region=europe-north2 --project insikt-riksdag`. Bygger `Dockerfile`, pushar till Artifact Registry (`europe-north2-docker.pkg.dev/insikt-riksdag/insikt/app`) och deployar. Hosting-konfig deployas separat med `firebase deploy --only hosting`.
- Servern är Nitro `node-server` (`.output/server/index.mjs`, `npm start`). `VITE_*`-variabler bakas in vid bygget via `--build-arg`.
- Hemligheter ligger i Secret Manager: `SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, `CRON_SECRET` (→ env `INGEST_SECRET`). `SUPABASE_SERVICE_ROLE_KEY` måste läggas till för att admin/inläsning/AI-cache ska fungera i drift.
- Org-policyn i Workspace blockerar `allUsers`-IAM; tjänsten körs därför med `--no-invoker-iam-check`.
- Cloud Scheduler (`europe-west4`): `insikt-inlasning-voteringar` dagligen 05:00, `insikt-inlasning-ledamoter` måndagar 04:30 (Europe/Stockholm).
- Domän: `insikt.bearnecessitiesapps.com` (CNAME → `insikt-riksdag.web.app`).
