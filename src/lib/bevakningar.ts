import { useCallback, useEffect, useState } from "react";

export type BevakningsTyp = "ledamoter" | "partier" | "sakfragor" | "arenden" | "voteringar";

export type Bevakningar = Record<BevakningsTyp, string[]>;

const NYCKEL = "insikt.bevakningar.v1";

const TOM: Bevakningar = {
  ledamoter: [],
  partier: [],
  sakfragor: [],
  arenden: [],
  voteringar: [],
};

function las(): Bevakningar {
  if (typeof window === "undefined") return TOM;
  try {
    const rad = window.localStorage.getItem(NYCKEL);
    if (!rad) return TOM;
    const tolkad = JSON.parse(rad) as Partial<Bevakningar>;
    return {
      ledamoter: tolkad.ledamoter ?? [],
      partier: tolkad.partier ?? [],
      sakfragor: tolkad.sakfragor ?? [],
      arenden: tolkad.arenden ?? [],
      voteringar: tolkad.voteringar ?? [],
    };
  } catch {
    return TOM;
  }
}

/**
 * Bevakningar sparas bara i den här webbläsaren. Inget konto, ingen server.
 */
export function useBevakningar() {
  const [bevakningar, setBevakningar] = useState<Bevakningar>(TOM);
  const [laddad, setLaddad] = useState(false);

  useEffect(() => {
    setBevakningar(las());
    setLaddad(true);
  }, []);

  const spara = useCallback((nya: Bevakningar) => {
    setBevakningar(nya);
    try {
      window.localStorage.setItem(NYCKEL, JSON.stringify(nya));
    } catch {
      /* privat läge kan blockera lagring */
    }
  }, []);

  const vaxla = useCallback(
    (typ: BevakningsTyp, id: string) => {
      const nuvarande = las();
      const finns = nuvarande[typ].includes(id);
      const nya: Bevakningar = {
        ...nuvarande,
        [typ]: finns ? nuvarande[typ].filter((v) => v !== id) : [...nuvarande[typ], id],
      };
      spara(nya);
      return !finns;
    },
    [spara],
  );

  const rensa = useCallback(() => spara(TOM), [spara]);

  const foljer = useCallback(
    (typ: BevakningsTyp, id: string) => bevakningar[typ].includes(id),
    [bevakningar],
  );

  const antal =
    bevakningar.ledamoter.length +
    bevakningar.partier.length +
    bevakningar.sakfragor.length +
    bevakningar.arenden.length +
    bevakningar.voteringar.length;

  return { bevakningar, laddad, vaxla, foljer, rensa, antal };
}
