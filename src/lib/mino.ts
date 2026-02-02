import { resolveJsonCandidate } from "@/lib/json";

type MinoRequest = {
  stage: string;
  input: unknown;
  schema: Record<string, unknown>;
  instructions: string;
};

export async function runMinoStage<T>(request: MinoRequest): Promise<T> {
  const url = process.env.MINO_API_URL;
  const apiKey = process.env.MINO_API_KEY;
  if (!url || !apiKey) {
    throw new Error("Missing MINO_API_URL or MINO_API_KEY.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      stage: request.stage,
      input: request.input,
      schema: request.schema,
      instructions: request.instructions,
      response_format: "json",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mino API error: ${response.status} ${errorText}`);
  }

  const data = await response.json().catch(async () => {
    const text = await response.text();
    return { raw: text };
  });

  const candidate =
    (data && (data.output || data.result || data.data || data.response)) ||
    data?.choices?.[0]?.message?.content ||
    data?.message?.content ||
    data?.raw ||
    data;

  const resolved = resolveJsonCandidate(candidate);
  if (!resolved) {
    throw new Error("Mino API returned empty response.");
  }

  return resolved as T;
}
