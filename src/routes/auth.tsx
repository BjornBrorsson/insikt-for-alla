import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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
  const [lage, setLage] = useState<"logga-in" | "skapa">("logga-in");
  const [epost, setEpost] = useState("");
  const [losenord, setLosenord] = useState("");
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

  async function skicka(e: React.FormEvent) {
    e.preventDefault();
    setPagar(true);
    try {
      if (lage === "logga-in") {
        const { error } = await supabase.auth.signInWithPassword({ email: epost, password: losenord });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: epost,
          password: losenord,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("Kontot är skapat. Bekräfta e-postadressen om du får ett brev.");
      }
    } catch (fel) {
      toast.error(fel instanceof Error ? fel.message : "Inloggningen misslyckades.");
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
        <form onSubmit={skicka} className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h2 className="rubrik text-xl">
            {lage === "logga-in" ? "Logga in i Insikt" : "Skapa konto"}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Efter inloggning krävs dessutom administratörsroll i databasen för att se
            inläsningsstatus, felrapporter och AI-sammanfattningar. Rollen delas ut manuellt.
          </p>

          <label htmlFor="epost" className="mt-5 block text-xs font-medium">
            E-postadress
          </label>
          <input
            id="epost"
            type="email"
            required
            autoComplete="email"
            value={epost}
            onChange={(e) => setEpost(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <label htmlFor="losenord" className="mt-4 block text-xs font-medium">
            Lösenord
          </label>
          <input
            id="losenord"
            type="password"
            required
            minLength={8}
            autoComplete={lage === "logga-in" ? "current-password" : "new-password"}
            value={losenord}
            onChange={(e) => setLosenord(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <button
            type="submit"
            disabled={pagar}
            className="mt-6 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pagar ? "Skickar …" : lage === "logga-in" ? "Logga in" : "Skapa konto"}
          </button>

          <button
            type="button"
            onClick={() => setLage(lage === "logga-in" ? "skapa" : "logga-in")}
            className="mt-3 w-full text-xs text-muted-foreground hover:underline"
          >
            {lage === "logga-in" ? "Skapa ett konto i stället" : "Jag har redan ett konto"}
          </button>
        </form>
      </div>
    </div>
  );
}
