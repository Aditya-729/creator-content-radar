import { resolveJsonCandidate } from "@/lib/json";

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

export async function runPerplexityStage<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing PERPLEXITY_API_KEY.");
  }

  const response = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const candidate =
    data?.choices?.[0]?.message?.content ||
    data?.output ||
    data?.result ||
    data;
  const resolved = resolveJsonCandidate(candidate);
  if (!resolved) {
    throw new Error("Perplexity API returned empty response.");
  }

  return resolved as T;
}
