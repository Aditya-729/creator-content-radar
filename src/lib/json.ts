export function extractJsonFromText(raw: string) {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in response.");
  }
  const candidate = raw.slice(firstBrace, lastBrace + 1);
  return JSON.parse(candidate);
}

export function resolveJsonCandidate(payload: unknown) {
  if (!payload) return null;
  if (typeof payload === "string") {
    return extractJsonFromText(payload);
  }
  if (typeof payload === "object") {
    return payload;
  }
  return null;
}
