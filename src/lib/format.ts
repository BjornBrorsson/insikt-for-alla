export const ROSTER = ["Ja", "Nej", "Avstår", "Frånvarande"] as const;
export type Rost = (typeof ROSTER)[number];

/** Svenskt datumformat, t.ex. 14 maj 2025. */
export function datum(value: string | null | undefined): string {
  if (!value) return "Uppgift saknas";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
}

export function datumKort(value: string | null | undefined): string {
  if (!value) return "–";
  return value.slice(0, 10);
}

export function procent(del: number, helhet: number): string {
  if (!helhet) return "Går inte att beräkna";
  return `${Math.round((del / helhet) * 1000) / 10} %`.replace(".", ",");
}

export function antal(n: number | null | undefined): string {
  if (n === null || n === undefined) return "Uppgift saknas";
  return new Intl.NumberFormat("sv-SE").format(n);
}

/** Mönster som gör diagram läsbara utan färgseende. */
export const rostStil: Record<string, { klass: string; tecken: string; text: string }> = {
  Ja: { klass: "bg-[var(--rost-ja)]", tecken: "▲", text: "Ja" },
  Nej: { klass: "bg-[var(--rost-nej)]", tecken: "▼", text: "Nej" },
  Avstår: { klass: "bg-[var(--rost-avstar)]", tecken: "■", text: "Avstår" },
  Frånvarande: { klass: "bg-[var(--rost-franvarande)]", tecken: "○", text: "Frånvarande" },
};

export function ledamotsnamn(l: { fornamn: string; efternamn: string }): string {
  return `${l.fornamn} ${l.efternamn}`.trim();
}

export function rensaHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&aring;/gi, "å")
    .replace(/&Aring;/gi, "Å")
    .replace(/&auml;/gi, "ä")
    .replace(/&Auml;/gi, "Ä")
    .replace(/&ouml;/gi, "ö")
    .replace(/&Ouml;/gi, "Ö")
    .replace(/&eacute;/gi, "é")
    .replace(/&Eacute;/gi, "É")
    .replace(/&sect;/gi, "§")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function csv(rader: (string | number | null)[][]): string {
  return rader
    .map((rad) =>
      rad
        .map((cell) => {
          const v = cell === null || cell === undefined ? "" : String(cell);
          return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(";"),
    )
    .join("\n");
}

export function laddaNerCsv(filnamn: string, innehall: string) {
  const blob = new Blob([`\uFEFF${innehall}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filnamn;
  a.click();
  URL.revokeObjectURL(url);
}
