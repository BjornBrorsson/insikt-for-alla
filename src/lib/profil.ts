import { useCallback, useEffect, useState } from "react";
import type { BevakningsTyp } from "@/lib/bevakningar";

export type SkuggRostTyp = "Ja" | "Nej" | "Avstår";

export type InsiktProfil = {
  version: 1;
  skapad: string; // ISO-datum
  uppdaterad: string; // ISO-datum
  bevakningar: Record<BevakningsTyp, string[]>;
  skuggroster: Record<string, SkuggRostTyp>; // voteringId -> "Ja" | "Nej" | "Avstår"
};

const PROFIL_NYCKEL = "insikt.profil.v1";
const GAMMAL_BEVAKNINGAR_NYCKEL = "insikt.bevakningar.v1";
const STORAGE_SYNC_EVENT = "insikt:profil-sync";

const TOM_PROFIL: InsiktProfil = {
  version: 1,
  skapad: new Date().toISOString(),
  uppdaterad: new Date().toISOString(),
  bevakningar: {
    ledamoter: [],
    partier: [],
    sakfragor: [],
    arenden: [],
    voteringar: [],
  },
  skuggroster: {},
};

function lasProfilFrånLagring(): InsiktProfil {
  if (typeof window === "undefined") return TOM_PROFIL;

  try {
    const raw = window.localStorage.getItem(PROFIL_NYCKEL);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<InsiktProfil>;
      if (parsed && parsed.version === 1) {
        return {
          version: 1,
          skapad: parsed.skapad ?? new Date().toISOString(),
          uppdaterad: parsed.uppdaterad ?? new Date().toISOString(),
          bevakningar: {
            ledamoter: parsed.bevakningar?.ledamoter ?? [],
            partier: parsed.bevakningar?.partier ?? [],
            sakfragor: parsed.bevakningar?.sakfragor ?? [],
            arenden: parsed.bevakningar?.arenden ?? [],
            voteringar: parsed.bevakningar?.voteringar ?? [],
          },
          skuggroster: parsed.skuggroster ?? {},
        };
      }
    }

    // Automatisk migrering från gamla insikt.bevakningar.v1 om den finns
    const gammalRaw = window.localStorage.getItem(GAMMAL_BEVAKNINGAR_NYCKEL);
    if (gammalRaw) {
      const gammal = JSON.parse(gammalRaw) as Partial<InsiktProfil["bevakningar"]>;
      const migrerad: InsiktProfil = {
        ...TOM_PROFIL,
        bevakningar: {
          ledamoter: gammal.ledamoter ?? [],
          partier: gammal.partier ?? [],
          sakfragor: gammal.sakfragor ?? [],
          arenden: gammal.arenden ?? [],
          voteringar: gammal.voteringar ?? [],
        },
      };
      window.localStorage.setItem(PROFIL_NYCKEL, JSON.stringify(migrerad));
      return migrerad;
    }
  } catch (err) {
    console.error("Kunde inte läsa Insikt-profil:", err);
  }

  return TOM_PROFIL;
}

function sparaProfilILagring(profil: InsiktProfil) {
  if (typeof window === "undefined") return;
  try {
    const uppdaterad = { ...profil, uppdaterad: new Date().toISOString() };
    window.localStorage.setItem(PROFIL_NYCKEL, JSON.stringify(uppdaterad));
    // Dispatch custom event för att synka komponenter i samma flik
    window.dispatchEvent(new CustomEvent(STORAGE_SYNC_EVENT, { detail: uppdaterad }));
  } catch {
    /* Privat läge eller kvotgräns */
  }
}

/**
 * useProfil
 *
 * Hanterar användarens privata data: bevakningar och skuggröster.
 * Inget konto, noll serveranrop, full klientsides-integritet.
 */
export function useProfil() {
  const [profil, setProfil] = useState<InsiktProfil>(TOM_PROFIL);
  const [laddad, setLaddad] = useState(false);

  useEffect(() => {
    setProfil(lasProfilFrånLagring());
    setLaddad(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFIL_NYCKEL) {
        setProfil(lasProfilFrånLagring());
      }
    };

    const onCustomSync = (e: Event) => {
      const detail = (e as CustomEvent<InsiktProfil>).detail;
      if (detail) {
        setProfil(detail);
      } else {
        setProfil(lasProfilFrånLagring());
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(STORAGE_SYNC_EVENT, onCustomSync);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(STORAGE_SYNC_EVENT, onCustomSync);
    };
  }, []);

  // --- Bevakningar ---
  const vaxlaBevakning = useCallback((typ: BevakningsTyp, id: string) => {
    const nuvarande = lasProfilFrånLagring();
    const finns = nuvarande.bevakningar[typ].includes(id);
    const nyLista = finns
      ? nuvarande.bevakningar[typ].filter((x) => x !== id)
      : [...nuvarande.bevakningar[typ], id];

    const uppdaterad: InsiktProfil = {
      ...nuvarande,
      bevakningar: {
        ...nuvarande.bevakningar,
        [typ]: nyLista,
      },
    };
    sparaProfilILagring(uppdaterad);
    setProfil(uppdaterad);
    return !finns;
  }, []);

  const foljer = useCallback(
    (typ: BevakningsTyp, id: string) => {
      return profil.bevakningar[typ]?.includes(id) ?? false;
    },
    [profil.bevakningar],
  );

  const antalBevakningar =
    (profil.bevakningar.ledamoter?.length ?? 0) +
    (profil.bevakningar.partier?.length ?? 0) +
    (profil.bevakningar.sakfragor?.length ?? 0) +
    (profil.bevakningar.arenden?.length ?? 0) +
    (profil.bevakningar.voteringar?.length ?? 0);

  // --- Skuggröster ---
  const skuggrosta = useCallback((voteringId: string, rost: SkuggRostTyp) => {
    const nuvarande = lasProfilFrånLagring();
    const uppdaterad: InsiktProfil = {
      ...nuvarande,
      skuggroster: {
        ...nuvarande.skuggroster,
        [voteringId]: rost,
      },
    };
    sparaProfilILagring(uppdaterad);
    setProfil(uppdaterad);
  }, []);

  const taBortSkuggrost = useCallback((voteringId: string) => {
    const nuvarande = lasProfilFrånLagring();
    const nyaRoster = { ...nuvarande.skuggroster };
    delete nyaRoster[voteringId];

    const uppdaterad: InsiktProfil = {
      ...nuvarande,
      skuggroster: nyaRoster,
    };
    sparaProfilILagring(uppdaterad);
    setProfil(uppdaterad);
  }, []);

  const minSkuggrost = useCallback(
    (voteringId: string): SkuggRostTyp | undefined => {
      return profil.skuggroster[voteringId];
    },
    [profil.skuggroster],
  );

  const antalSkuggroster = Object.keys(profil.skuggroster).length;

  // --- Export & Import ---
  const exporteraProfilJson = useCallback(() => {
    const nuvarande = lasProfilFrånLagring();
    const jsonStr = JSON.stringify(nuvarande, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const datumStr = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `insikt-profil-${datumStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const importeraProfilData = useCallback(
    (data: Partial<InsiktProfil>, lage: "sla_ihop" | "ersatt") => {
      const nuvarande = lasProfilFrånLagring();

      let nyProfil: InsiktProfil;
      if (lage === "ersatt") {
        nyProfil = {
          version: 1,
          skapad: data.skapad ?? new Date().toISOString(),
          uppdaterad: new Date().toISOString(),
          bevakningar: {
            ledamoter: data.bevakningar?.ledamoter ?? [],
            partier: data.bevakningar?.partier ?? [],
            sakfragor: data.bevakningar?.sakfragor ?? [],
            arenden: data.bevakningar?.arenden ?? [],
            voteringar: data.bevakningar?.voteringar ?? [],
          },
          skuggroster: data.skuggroster ?? {},
        };
      } else {
        // Slå ihop
        const unika = (a: string[] = [], b: string[] = []) => Array.from(new Set([...a, ...b]));
        nyProfil = {
          version: 1,
          skapad: nuvarande.skapad,
          uppdaterad: new Date().toISOString(),
          bevakningar: {
            ledamoter: unika(nuvarande.bevakningar.ledamoter, data.bevakningar?.ledamoter),
            partier: unika(nuvarande.bevakningar.partier, data.bevakningar?.partier),
            sakfragor: unika(nuvarande.bevakningar.sakfragor, data.bevakningar?.sakfragor),
            arenden: unika(nuvarande.bevakningar.arenden, data.bevakningar?.arenden),
            voteringar: unika(nuvarande.bevakningar.voteringar, data.bevakningar?.voteringar),
          },
          skuggroster: {
            ...nuvarande.skuggroster,
            ...(data.skuggroster ?? {}),
          },
        };
      }

      sparaProfilILagring(nyProfil);
      setProfil(nyProfil);
      return nyProfil;
    },
    [],
  );

  const skapaDelningsUrl = useCallback(() => {
    const nuvarande = lasProfilFrånLagring();
    // Enkel och säker URL-kodning i URL-fragmentet (#).
    // Fragmentet skickas aldrig till webbservern i HTTP-anropet!
    const jsonStr = JSON.stringify({
      v: 1,
      b: nuvarande.bevakningar,
      r: nuvarande.skuggroster,
    });
    const encoded = encodeURIComponent(jsonStr);
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/importera#profil=${encoded}`;
  }, []);

  const rensaAllt = useCallback(() => {
    const tom: InsiktProfil = {
      ...TOM_PROFIL,
      skapad: new Date().toISOString(),
      uppdaterad: new Date().toISOString(),
    };
    sparaProfilILagring(tom);
    setProfil(tom);
  }, []);

  return {
    profil,
    laddad,
    bevakningar: profil.bevakningar,
    vaxlaBevakning,
    foljer,
    antalBevakningar,
    skuggroster: profil.skuggroster,
    skuggrosta,
    taBortSkuggrost,
    minSkuggrost,
    antalSkuggroster,
    exporteraProfilJson,
    importeraProfilData,
    skapaDelningsUrl,
    rensaAllt,
  };
}

/**
 * Avkoda profildata från en delningslänk / hash-fragment.
 */
export function avkodaProfilFrånHash(hash: string): Partial<InsiktProfil> | null {
  try {
    const match = hash.match(/#profil=(.+)$/);
    if (!match || !match[1]) return null;

    const jsonStr = decodeURIComponent(match[1]);
    const parsed = JSON.parse(jsonStr);

    if (parsed.v === 1 && (parsed.b || parsed.r)) {
      return {
        version: 1,
        bevakningar: parsed.b ?? {
          ledamoter: [],
          partier: [],
          sakfragor: [],
          arenden: [],
          voteringar: [],
        },
        skuggroster: parsed.r ?? {},
      };
    }
  } catch (err) {
    console.error("Misslyckades att avkoda profil från länk:", err);
  }
  return null;
}
