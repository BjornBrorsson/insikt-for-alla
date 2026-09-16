import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Egen server-entry (src/server.ts) som paketerar in SSR-felsidan.
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    viteReact(),
    // Bygg en fristående Node-server (.output/server/index.mjs) för Cloud Run / App Hosting.
    ...(command === "build"
      ? [
          nitro({
            preset: "node-server",
            // Serverbundeln shimmar inte __dirname/__filename för inlineade
            // CJS-beroenden (t.ex. google-gax). Exponera dem som globaler så
            // att bundlad CJS-kod inte kraschar i ESM-kontext.
            rolldownConfig: {
              output: {
                banner:
                  'import{dirname as __cjsDirname}from"node:path";import{fileURLToPath as __cjsFileURLToPath}from"node:url";globalThis.__dirname=__cjsDirname(__cjsFileURLToPath(import.meta.url));globalThis.__filename=__cjsFileURLToPath(import.meta.url);',
              },
            },
          }),
        ]
      : []),
  ],
}));
