import OpenAI from "openai";
import { getRequiredOpenAIApiKey } from "./config";

export function createOpenAIClient(apiKey = getRequiredOpenAIApiKey()) {
  return new OpenAI({ apiKey });
}
