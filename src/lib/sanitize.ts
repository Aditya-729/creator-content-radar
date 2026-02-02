export const MAX_CONTENT_LENGTH = 12000;

export function sanitizeUserInput(input: string) {
  const trimmed = input.trim();
  const withoutTags = trimmed.replace(/<[^>]*>/g, " ");
  const withoutControl = withoutTags.replace(/[\u0000-\u001F\u007F]/g, " ");
  const normalized = withoutControl.replace(/\s+/g, " ");
  return normalized.slice(0, MAX_CONTENT_LENGTH);
}
