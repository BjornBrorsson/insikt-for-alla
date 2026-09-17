import { getRequest } from "@tanstack/react-start/server";

/**
 * Enkel begränsning av AI-genereringar (glidande fönster i minnet).
 *
 * Räknarna lever per serverprocess – räcker för en instans och skyddar nyckeln
 * mot både enskilda storanvändare (per IP) och total belastning (hela nyckeln).
 * Endast faktiska genereringar räknas, inte cacheträffar.
 */

interface Granss {
  max: number;
  fonsterMs: number;
}

function heltal(namn: string, standard: number): number {
  const v = Number(process.env[namn]);
  return Number.isFinite(v) && v > 0 ? v : standard;
}

const PER_IP: Granss = { max: heltal("AI_LIMIT_IP_PER_10MIN", 10), fonsterMs: 10 * 60_000 };
const GLOBAL_MINUT: Granss = { max: heltal("AI_LIMIT_GLOBAL_PER_MIN", 15), fonsterMs: 60_000 };
const GLOBAL_DAG: Granss = {
  max: heltal("AI_LIMIT_GLOBAL_PER_DAY", 1000),
  fonsterMs: 24 * 60 * 60_000,
};

const stampel = new Map<string, number[]>();

function rensa(nyckel: string, fonsterMs: number, nu: number): number[] {
  const lista = (stampel.get(nyckel) ?? []).filter((t) => nu - t < fonsterMs);
  stampel.set(nyckel, lista);
  return lista;
}

function harPlats(nyckel: string, g: Granss, nu: number): boolean {
  return rensa(nyckel, g.fonsterMs, nu).length < g.max;
}

export type RateLimitResultat = { ok: true } | { ok: false; orsak: "ip" | "global" };

/**
 * Kontrollerar och – om det finns plats – reserverar en generering.
 */
export function reserveraAiGenerering(ip: string): RateLimitResultat {
  const nu = Date.now();

  if (!harPlats("global:minut", GLOBAL_MINUT, nu) || !harPlats("global:dag", GLOBAL_DAG, nu)) {
    return { ok: false, orsak: "global" };
  }
  if (!harPlats(`ip:${ip}`, PER_IP, nu)) return { ok: false, orsak: "ip" };

  stampel.get("global:minut")!.push(nu);
  stampel.get("global:dag")!.push(nu);
  stampel.get(`ip:${ip}`)!.push(nu);

  // Håll kartan liten: släng IP-nycklar som blivit tomma.
  if (stampel.size > 5000) {
    for (const [k, v] of stampel) if (k.startsWith("ip:") && v.length === 0) stampel.delete(k);
  }

  return { ok: true };
}

/**
 * Generisk begränsning för andra publika endpoints (t.ex. felrapporter,
 * motionsuppslag). Returnerar true om anropet fick plats i fönstret.
 */
export function reserveraAnrop(
  omrade: string,
  ip: string,
  max: number,
  fonsterMs: number,
): boolean {
  const nyckel = `${omrade}:${ip}`;
  const lista = rensa(nyckel, fonsterMs, Date.now());
  if (lista.length >= max) return false;
  lista.push(Date.now());
  return true;
}

/** Plockar klientens IP från vanliga proxy-headers, annars "okänd". */
export function klientIp(): string {
  const headers = getRequest()?.headers;
  const forwarded = headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers?.get("x-real-ip") || headers?.get("cf-connecting-ip") || "okänd";
}
