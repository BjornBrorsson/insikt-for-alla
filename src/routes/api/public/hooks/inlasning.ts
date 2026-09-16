import { createFileRoute } from "@tanstack/react-router";

/**
 * Schemalagd inläsning från Riksdagens öppna data.
 * Anropas av Cloud Scheduler (insikt-inlasning-*) och kräver den delade hemligheten
 * (INGEST_SECRET, lagrad som CRON_SECRET i Secret Manager).
 */
export const Route = createFileRoute("/api/public/hooks/inlasning")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["INGEST_SECRET"];
        const given = request.headers.get("x-insikt-secret");
        if (!secret || !given || given !== secret) {
          return new Response(JSON.stringify({ fel: "Obehörig" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const { ingestAnforanden, ingestLedamoter, ingestRiksmote, AKTUELLT_RM } =
          await import("@/lib/riksdagen.server");

        let body: { typ?: string; rm?: string; max?: number } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          body = {};
        }

        try {
          if (body.typ === "ledamoter") {
            const r = await ingestLedamoter("tjanstgorande");
            return Response.json(r);
          }
          if (body.typ === "anforanden") {
            const r = await ingestAnforanden(body.max ?? 500, body.rm);
            return Response.json(r);
          }
          if (body.typ === "valloften") {
            const { synkaValloftenMotVoteringar } = await import("@/lib/valloften-synk.server");
            const r = await synkaValloftenMotVoteringar();
            return Response.json(r);
          }
          const r = await ingestRiksmote(body.rm ?? AKTUELLT_RM, body.max ?? 15);
          return Response.json(r);
        } catch (e) {
          return new Response(
            JSON.stringify({ fel: e instanceof Error ? e.message : "Okänt fel" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
