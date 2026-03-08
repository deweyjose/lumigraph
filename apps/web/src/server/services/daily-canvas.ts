import { z } from "zod";
import { getPrisma } from "@lumigraph/db";
import { hasOpenAIApiKey } from "../ai/config";
import { generateOpenAIJsonObject } from "../ai/json";
import { DAILY_CANVAS_SYSTEM_PROMPT } from "../ai/prompts";
import * as dailyCanvasRepo from "../repo/daily-canvas";
import { fetchAllExternalApis, type ExternalApisData } from "./external-apis";

/**
 * Daily canvas content shape. Per contracts/daily-canvas-api.md.
 */
export const dailyCanvasContentSchema = z.object({
  events: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      source: z.string().optional(),
    })
  ),
  calendar: z.string(),
  highlights: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
    })
  ),
});

export type DailyCanvasContent = z.infer<typeof dailyCanvasContentSchema>;

function buildUserPrompt(data: ExternalApisData): string {
  const parts: string[] = ["Raw API data for today:\n"];
  if (data.apod) {
    parts.push(
      `NASA APOD: ${data.apod.title}. ${data.apod.explanation.slice(0, 500)}...`
    );
  } else {
    parts.push("NASA APOD: (unavailable)");
  }
  if (data.iss) {
    parts.push(
      `ISS position: lat ${data.iss.iss_position.latitude}, lon ${data.iss.iss_position.longitude}`
    );
  } else {
    parts.push("ISS: (unavailable)");
  }
  if (data.spacex) {
    parts.push(
      `SpaceX: ${data.spacex.name} (${data.spacex.date_utc})${data.spacex.details ? ` - ${data.spacex.details.slice(0, 200)}` : ""}`
    );
  } else {
    parts.push("SpaceX: (unavailable)");
  }
  return parts.join("\n");
}

function createFallbackContent(): DailyCanvasContent {
  return {
    events: [
      {
        title: "Content temporarily unavailable",
        description:
          "We're having trouble fetching today's astro data. Please try again later.",
      },
    ],
    calendar: "Check back soon for this week's astro calendar.",
    highlights: [
      {
        title: "Explore the community",
        summary: "Browse posts from fellow astrophotographers in the meantime.",
      },
    ],
  };
}

/**
 * Get or generate daily canvas for the given date.
 * Caches in DB. Falls back to prior day or static placeholder on failure.
 */
export async function getOrGenerateDailyCanvas(
  date: Date
): Promise<DailyCanvasContent> {
  const prisma = await getPrisma();

  // 1. Check cache
  const cached = await dailyCanvasRepo.findDailyCanvas(prisma, date);
  if (cached) {
    const parsed = dailyCanvasContentSchema.safeParse(cached.content);
    if (parsed.success) return parsed.data;
  }

  // 2. Fetch external APIs
  const apiData = await fetchAllExternalApis(date);

  // 3. Call OpenAI to synthesize
  if (!hasOpenAIApiKey()) {
    return createFallbackContent();
  }

  try {
    const validated = await generateOpenAIJsonObject({
      systemPrompt: DAILY_CANVAS_SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(apiData),
      schema: dailyCanvasContentSchema,
    });

    // 4. Store in DB
    await dailyCanvasRepo.createDailyCanvas(prisma, date, validated);

    return validated;
  } catch {
    // 5. Fallback: try prior day
    const yesterday = new Date(date);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const prior = await dailyCanvasRepo.findDailyCanvas(prisma, yesterday);
    if (prior) {
      const parsed = dailyCanvasContentSchema.safeParse(prior.content);
      if (parsed.success) return parsed.data;
    }

    return createFallbackContent();
  }
}
