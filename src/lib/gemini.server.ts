/**
 * Minimal klient mot Google Gemini (generateContent via REST).
 * Ingen SDK – bara fetch – så att den fungerar oavsett hostingmiljö.
 *
 * Kräver miljövariabeln GEMINI_API_KEY. Modellen är låst till Flash Lite.
 */

export const GEMINI_MODELL = "gemini-flash-lite-latest";

export function geminiKonfigurerad(): boolean {
  return Boolean(process.env["GEMINI_API_KEY"]);
}

export function geminiModell(): string {
  return GEMINI_MODELL;
}

/** Kastas när Google själva svarar 429 (kvoten för nyckeln är slut). */
export class GeminiKvotFel extends Error {
  constructor(detalj: string) {
    super(`Gemini-kvoten är slut: ${detalj}`);
    this.name = "GeminiKvotFel";
  }
}

interface GeminiJsonAlternativ {
  systemInstruktion: string;
  prompt: string;
  /** JSON-schema (OpenAPI-delmängd) som svaret måste följa. */
  schema: Record<string, unknown>;
  temperatur?: number;
}

/**
 * Anropar Gemini och tvingar ett JSON-svar enligt angivet schema.
 */
export async function geminiJson<T>({
  systemInstruktion,
  prompt,
  schema,
  temperatur = 0.3,
}: GeminiJsonAlternativ): Promise<T> {
  const nyckel = process.env["GEMINI_API_KEY"];
  if (!nyckel) throw new Error("GEMINI_API_KEY saknas i miljön.");

  const modell = geminiModell();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modell}:generateContent`;

  const svar = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": nyckel },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruktion }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperatur,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!svar.ok) {
    const text = await svar.text().catch(() => "");
    if (svar.status === 429) throw new GeminiKvotFel(text.slice(0, 300));
    throw new Error(`Gemini svarade ${svar.status}: ${text.slice(0, 300)}`);
  }

  const json = (await svar.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };

  if (json.promptFeedback?.blockReason) {
    throw new Error(`Gemini blockerade anropet: ${json.promptFeedback.blockReason}`);
  }

  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returnerade inget innehåll.");

  return JSON.parse(text) as T;
}
