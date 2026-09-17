/**
 * Färgtema: "system" följer operativsystemets inställning (standard),
 * "light"/"dark" är ett sparat användarval i localStorage.
 * Klassen .dark på <html> styr samtliga CSS-variabler i styles.css.
 */
export type Tema = "system" | "light" | "dark";

const NYCKEL = "insikt.tema";
const GILTIGA: Tema[] = ["system", "light", "dark"];

export function lasTema(): Tema {
  if (typeof window === "undefined") return "system";
  try {
    const sparat = window.localStorage.getItem(NYCKEL);
    return GILTIGA.includes(sparat as Tema) ? (sparat as Tema) : "system";
  } catch {
    return "system";
  }
}

export function systemMorkt(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function tillampaTema(tema: Tema) {
  const morkt = tema === "dark" || (tema === "system" && systemMorkt());
  document.documentElement.classList.toggle("dark", morkt);
}

export function sparaTema(tema: Tema) {
  try {
    if (tema === "system") window.localStorage.removeItem(NYCKEL);
    else window.localStorage.setItem(NYCKEL, tema);
  } catch {
    // localStorage kan vara avstängt – temat följer då bara systemet i sessionen.
  }
  tillampaTema(tema);
}
