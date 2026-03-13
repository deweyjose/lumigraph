import {
  buildAstroHubSourceEnvelope,
  randomizeAstroHubMockDelay,
} from "../astro-hub-mock";

function getMissionDayLabel(date: Date) {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const elapsedMs = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(elapsedMs / 86_400_000) + 1;
  return `Day ${String(dayOfYear).padStart(3, "0")}`;
}

export async function getAstroHubMetaSource() {
  await randomizeAstroHubMockDelay();

  return buildAstroHubSourceEnvelope(
    "meta",
    {
      missionDay: getMissionDayLabel(new Date()),
    },
    {
      source: "Mission clock",
      status: "live",
    }
  );
}
