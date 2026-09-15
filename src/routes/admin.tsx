import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import {
  getAdminData,
  getDatastatus,
  uppdateraFelrapport,
  granskaAiSammanfattning,
  korInlasning,
} from "@/lib/insikt.functions";
import { datum, datumKort, antal } from "@/lib/format";
import { Fel, Laddar, Sidhuvud, Tomt } from "@/components/insikt/tillstand";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Insikt" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminVy,
});

function AdminVy() {
  const [inloggad, setInloggad] = useState(false);
  const [pin, setPin] = useState("");
  const [pinFel, setPinFel] = useState(false);

  const hamtaAdmin = useServerFn(getAdminData);
  const hamtaStatus = useServerFn(getDatastatus);
  const uppdateraFel = useServerFn(uppdateraFelrapport);
  const granskaAi = useServerFn(granskaAiSammanfattning);
  const triggaInlasning = useServerFn(korInlasning);

  const adminQuery = useQuery({
    queryKey: ["admin-data"],
    queryFn: () => hamtaAdmin(),
    enabled: inloggad,
  });

  const statusQuery = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => hamtaStatus(),
    enabled: inloggad,
  });

  const [korsNu, setKorsNu] = useState(false);
  const [aktivFlik, setAktivFlik] = useState<"status" | "inlasningar" | "felrapporter" | "ai">(
    "status",
  );

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    // Enkel administrativ PIN för demonstrations- och driftgranskning
    if (pin === "insikt2026" || pin === "admin") {
      setInloggad(true);
      setPinFel(false);
    } else {
      setPinFel(true);
    }
  }

  async function handleKorInlasning(typ: "ledamoter" | "voteringar") {
    setKorsNu(true);
    try {
      const res = await triggaInlasning({ data: { typ, rm: "2025/26", max: 10 } });
      toast.success(`Inläsning klar: ${res.antal} poster inlästa. (${res.detalj})`);
      adminQuery.refetch();
      statusQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inläsningen misslyckades.");
    } finally {
      setKorsNu(false);
    }
  }

  async function handleStatusAndring(id: string, nyStatus: string) {
    try {
      await uppdateraFel({ data: { id, status: nyStatus } });
      toast.success(`Status uppdaterades till ${nyStatus}`);
      adminQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte uppdatera status.");
    }
  }

  async function handleVaxlaGranskad(id: string, nuvarande: boolean) {
    try {
      await granskaAi({ data: { id, granskad: !nuvarande } });
      toast.success(!nuvarande ? "Markerad som granskad" : "Märkt som ogranskad");
      adminQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte ändra status.");
    }
  }

  if (!inloggad) {
    return (
      <div>
        <Sidhuvud
          rubrik="Administration"
          lead="Skyddad vy för driftövervakning, inläsningshistorik och hantering av felrapporter."
        />

        <div className="mx-auto max-w-md px-4 py-16">
          <form onSubmit={handleLogin} className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-xl font-normal">Logga in i administratörsvyn</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ange administratörslösenordet för att hantera plattformen. (Tips i demo: ange <code>admin</code> eller <code>insikt2026</code>).
            </p>

            {pinFel ? (
              <p className="mt-3 text-xs text-destructive">Felaktigt lösenord. Försök igen.</p>
            ) : null}

            <div className="mt-4">
              <label htmlFor="admin-pin" className="sr-only">
                Lösenord
              </label>
              <input
                id="admin-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Lösenord …"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Logga in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Sidhuvud
        rubrik="Administratörspanel"
        lead="Drift, datainläsningar från data.riksdagen.se, inkomna felrapporter och AI-sammanfattningar."
        barn={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-md border border-input bg-background p-1 text-xs">
              <button
                type="button"
                onClick={() => setAktivFlik("status")}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  aktivFlik === "status" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Datatäckning
              </button>
              <button
                type="button"
                onClick={() => setAktivFlik("inlasningar")}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  aktivFlik === "inlasningar"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Inläsningar
              </button>
              <button
                type="button"
                onClick={() => setAktivFlik("felrapporter")}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  aktivFlik === "felrapporter"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Felrapporter ({adminQuery.data?.felrapporter.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setAktivFlik("ai")}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  aktivFlik === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                AI-sammanfattningar ({adminQuery.data?.sammanfattningar.length ?? 0})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setInloggad(false)}
              className="text-xs text-muted-foreground hover:underline"
            >
              Logga ut
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {adminQuery.isPending || statusQuery.isPending ? (
          <Laddar text="Hämtar administrativ data …" />
        ) : adminQuery.isError ? (
          <Fel fel={adminQuery.error} forsokIgen={() => adminQuery.refetch()} />
        ) : (
          <div>
            {/* Flik: Status & Datatäckning */}
            {aktivFlik === "status" && statusQuery.data ? (
              <div className="space-y-8">
                <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
                  <h2 className="text-xl font-normal">Datatäckning i skarp databas</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-[var(--yta)] p-4">
                      <span className="text-xs text-muted-foreground">Ledamöter</span>
                      <p className="mt-1 text-2xl font-semibold">{antal(statusQuery.data.ledamoter)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--yta)] p-4">
                      <span className="text-xs text-muted-foreground">Ärenden &amp; betänkanden</span>
                      <p className="mt-1 text-2xl font-semibold">{antal(statusQuery.data.arenden)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--yta)] p-4">
                      <span className="text-xs text-muted-foreground">Voteringar</span>
                      <p className="mt-1 text-2xl font-semibold">{antal(statusQuery.data.voteringar)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--yta)] p-4">
                      <span className="text-xs text-muted-foreground">Enskilda röster</span>
                      <p className="mt-1 text-2xl font-semibold">{antal(statusQuery.data.roster)}</p>
                    </div>
                  </div>

                  <dl className="mt-6 border-t border-border pt-4 text-xs space-y-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <dt>Tidsperiod för voteringar:</dt>
                      <dd className="font-medium text-foreground">
                        {statusQuery.data.aldstaVotering
                          ? `${datumKort(statusQuery.data.aldstaVotering)} till ${datumKort(statusQuery.data.senasteVotering)}`
                          : "Saknas"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Senast uppdaterad i databasen:</dt>
                      <dd className="font-medium text-foreground">
                        {datum(statusQuery.data.senastUppdaterad)}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Manuell inläsning */}
                <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
                  <h2 className="text-xl font-normal">Kör manuell inläsning från Riksdagens API</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hämtar nya uppgifter direkt från data.riksdagen.se och uppdaterar databasen.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={korsNu}
                      onClick={() => handleKorInlasning("ledamoter")}
                      className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {korsNu ? "Kör inläsning …" : "Läs in tjänstgörande ledamöter"}
                    </button>
                    <button
                      type="button"
                      disabled={korsNu}
                      onClick={() => handleKorInlasning("voteringar")}
                      className="rounded-md border border-input px-4 py-2 text-xs font-medium hover:bg-accent disabled:opacity-50"
                    >
                      {korsNu ? "Kör inläsning …" : "Läs in 10 senaste voteringar (2025/26)"}
                    </button>
                  </div>
                </section>
              </div>
            ) : null}

            {/* Flik: Inläsningslogg */}
            {aktivFlik === "inlasningar" ? (
              <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h2 className="text-xl font-normal">Körda inläsningar</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Historik över automatiska och manuella inläsningsjobb.
                </p>

                {adminQuery.data.inlasningar.length === 0 ? (
                  <p className="mt-4 text-xs text-muted-foreground">Inga inläsningar registrerade ännu.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-[var(--yta)] text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Tidpunkt</th>
                          <th className="px-4 py-2.5 font-medium">Typ</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                          <th className="px-4 py-2.5 font-medium">Antal</th>
                          <th className="px-4 py-2.5 font-medium">Detaljer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {adminQuery.data.inlasningar.map((jobb) => (
                          <tr key={jobb.id} className="hover:bg-accent/40">
                            <td className="px-4 py-2.5 whitespace-nowrap">{datum(jobb.startad)}</td>
                            <td className="px-4 py-2.5 font-medium">{jobb.typ}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`rounded px-2 py-0.5 font-medium text-[11px] ${
                                  jobb.status === "lyckad"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                }`}
                              >
                                {jobb.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono">{jobb.antal}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{jobb.detalj ?? "–"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}

            {/* Flik: Felrapporter */}
            {aktivFlik === "felrapporter" ? (
              <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h2 className="text-xl font-normal">Inkomna felrapporter</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rapporter inskickade av användare via /rapportera-fel.
                </p>

                {adminQuery.data.felrapporter.length === 0 ? (
                  <p className="mt-4 text-xs text-muted-foreground">Inga felrapporter inkomna.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {adminQuery.data.felrapporter.map((fel) => (
                      <div
                        key={fel.id}
                        className="rounded-lg border border-border bg-background p-4 text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-mono text-muted-foreground">
                            {datum(fel.skapad)} · Sida: {fel.sida ?? "Ej angiven"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Status:</span>
                            <select
                              value={fel.status}
                              onChange={(e) => handleStatusAndring(fel.id, e.target.value)}
                              className="h-7 rounded border border-input bg-background px-2 text-xs"
                            >
                              <option value="ny">Ny</option>
                              <option value="under_arbete">Under arbete</option>
                              <option value="atgardad">Åtgärdad</option>
                              <option value="avfardad">Avfärdad</option>
                            </select>
                          </div>
                        </div>

                        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                          {fel.beskrivning}
                        </p>

                        {fel.epost ? (
                          <p className="text-muted-foreground">
                            Kontakt e-post: <a href={`mailto:${fel.epost}`} className="underline">{fel.epost}</a>
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {/* Flik: AI-sammanfattningar */}
            {aktivFlik === "ai" ? (
              <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h2 className="text-xl font-normal">AI-sammanfattningar</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Granska och godkänn genererade sammanfattningar av betänkanden.
                </p>

                {adminQuery.data.sammanfattningar.length === 0 ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Inga AI-sammanfattningar finns i databasen för närvarande.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {adminQuery.data.sammanfattningar.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border border-border bg-background p-4 text-xs space-y-3"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {s.arenden?.titel ?? s.arende_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleVaxlaGranskad(s.id, s.granskad)}
                            className={`rounded px-2.5 py-1 text-xs font-medium ${
                              s.granskad
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {s.granskad ? "✓ Granskad av redaktion" : "Markera som granskad"}
                          </button>
                        </div>

                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                          {s.sammanfattning}
                        </p>

                        <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-2 text-muted-foreground">
                          <span>Modell: {s.modell} · Skapad: {datum(s.skapad)}</span>
                          <span>Tillräckligt underlag: {s.tillrackligt_underlag ? "Ja" : "Nej"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
