import { useProfil } from "@/lib/profil";

export type BevakningsTyp = "ledamoter" | "partier" | "sakfragor" | "arenden" | "voteringar";

export type Bevakningar = Record<BevakningsTyp, string[]>;

/**
 * useBevakningar
 * 
 * Bakåtkompatibel hook som kopplar direkt till den versionerade useProfil.
 */
export function useBevakningar() {
  const { bevakningar, laddad, vaxlaBevakning, foljer, rensaAllt, antalBevakningar } = useProfil();

  return {
    bevakningar,
    laddad,
    vaxla: vaxlaBevakning,
    foljer,
    rensa: rensaAllt,
    antal: antalBevakningar,
  };
}

