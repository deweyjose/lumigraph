export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export function hasOpenAIApiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getRequiredOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return apiKey;
}
