import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Sidhuvud } from "@/components/insikt/tillstand";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logga in — Insikt" },
      {
        name: "description",
        content:
          "Logga in för att komma åt Insikts administratörsvy med inläsningsstatus, felrapporter och granskning av sammanfattningar.",
      },
      { property: "og:title", content: "Logga in — Insikt" },
      {
        property: "og:description",
        content: "Inloggning för Insikts redaktion och administratörer.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Inloggning,
});

function Inloggning() {
  const navigate = useNavigate();
  const [pagar, setPagar] = useState(false);

  useEffect(() => {
    let aktiv = true;
    supabase.auth.getSession().then(({ data }) => {
      if (aktiv && data.session) navigate({ to: "/admin" });
    });
    const { data: prenumeration } = supabase.auth.onAuthStateChange((handelse, session) => {
      if (handelse === "SIGNED_IN" && session) navigate({ to: "/admin" });
    });
    return () => {
      aktiv = false;
      prenumeration.subscription.unsubscribe();
    };
  }, [navigate]);

  async function loggaIn() {
    setPagar(true);
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } catch (fel) {
      toast.error(fel instanceof Error ? fel.message : "Inloggningen kunde inte startas.");
    } finally {
      setPagar(false);
    }
  }

  return (
    <div>
      <Sidhuvud
        rubrik="Logga in"
        lead="Inloggning behövs bara för Insikts administratörsvy. All riksdagsdata på webbplatsen är öppen och kräver inget konto."
      />
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h2 className="rubrik text-xl">Insikt för redaktion</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Efter inloggning krävs dessutom administratörsroll i databasen för att se
            inläsningsstatus, felrapporter och AI-sammanfattningar.
          </p>
          <button
            type="button"
            onClick={loggaIn}
            disabled={pagar}
            className="mt-6 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pagar ? "Öppnar inloggning …" : "Fortsätt med Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
