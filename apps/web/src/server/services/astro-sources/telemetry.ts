import {
  buildAstroHubSourceEnvelope,
  randomizeAstroHubMockDelay,
} from "../astro-hub-mock";
import { getAstroHubCalendarSource } from "./calendar";
import { getAstroHubExploreSource } from "./explore";
import { getAstroHubHeroSource } from "./hero";
import { getAstroHubIssSource } from "./iss";

function freshnessFromGeneratedAt(generatedAt: string) {
  const diffMs = Date.now() - new Date(generatedAt).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 1) {
    return "updated just now";
  }

  if (diffMinutes === 1) {
    return "updated 1m ago";
  }

  return `updated ${diffMinutes}m ago`;
}

function trustFromStatus(status: "live" | "degraded" | "fallback") {
  if (status === "live") {
    return "official source online";
  }

  if (status === "degraded") {
    return "fallback source in use";
  }

  return "mock fallback only";
}

export async function getAstroHubTelemetrySource() {
  await randomizeAstroHubMockDelay();

  const [hero, iss, calendar, explore] = await Promise.all([
    getAstroHubHeroSource(),
    getAstroHubIssSource(),
    getAstroHubCalendarSource(),
    getAstroHubExploreSource(),
  ]);

  return buildAstroHubSourceEnvelope(
    "telemetry",
    {
      items: [
        {
          id: "hero",
          source: hero.source,
          status: hero.status,
          freshness: freshnessFromGeneratedAt(hero.generatedAt),
          trust: trustFromStatus(hero.status),
        },
        {
          id: "iss",
          source: iss.source,
          status: iss.status,
          freshness: freshnessFromGeneratedAt(iss.generatedAt),
          trust: iss.data.confidence,
          ...(iss.status !== "live"
            ? { fallback: "ISS tracker reverted to mock telemetry" }
            : {}),
        },
        {
          id: "calendar",
          source: calendar.source,
          status: calendar.status,
          freshness: freshnessFromGeneratedAt(calendar.generatedAt),
          trust: trustFromStatus(calendar.status),
          ...(calendar.status !== "live"
            ? { fallback: "Calendar is showing cached mock windows" }
            : {}),
        },
        {
          id: "explore",
          source: explore.source,
          status: explore.status,
          freshness: freshnessFromGeneratedAt(explore.generatedAt),
          trust: trustFromStatus(explore.status),
        },
      ],
    },
    {
      source: "Astro Hub source health",
      status: [hero, iss, calendar, explore].some(
        (source) => source.status !== "live"
      )
        ? "degraded"
        : "live",
    }
  );
}
