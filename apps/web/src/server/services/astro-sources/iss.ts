import {
  buildAstroHubSourceEnvelope,
  cloneAstroHubSourceData,
  randomizeAstroHubMockDelay,
} from "../astro-hub-mock";
import { fetchJson, writeAstroSourceOutput } from "./shared";

const WHERE_THE_ISS_AT_URL = "https://api.wheretheiss.at/v1/satellites/25544";

type WhereTheIssAtResponse = {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  timestamp: number;
};

export async function getAstroHubIssSource() {
  await randomizeAstroHubMockDelay();

  try {
    const payload = await fetchJson<WhereTheIssAtResponse>(
      WHERE_THE_ISS_AT_URL,
      {
        revalidateSeconds: 30,
      }
    );
    await writeAstroSourceOutput("iss", payload);

    const nextPass = new Date(
      (payload.timestamp + 15 * 60) * 1000
    ).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    return buildAstroHubSourceEnvelope(
      "iss",
      {
        latitude: payload.latitude,
        longitude: payload.longitude,
        speedKph: Math.round(payload.velocity),
        altitudeKm: Math.round(payload.altitude),
        visibility: payload.visibility,
        nextPass,
        confidence: "Live telemetry from Where The ISS At",
      },
      { source: "Where The ISS At", status: "live" }
    );
  } catch {
    return buildAstroHubSourceEnvelope("iss", cloneAstroHubSourceData("iss"), {
      source: "Mock ISS Telemetry",
      status: "fallback",
    });
  }
}
