import {
  astroHubMockSourceData,
  astroHubSourceKeys,
  type AstroHubSourceEnvelope,
  type AstroHubSourceKey,
  type AstroHubSourceMap,
  type MissionState,
} from "@/lib/astro-hub";

const MAX_RANDOM_DELAY_MS = 1000;

const sourceMetadata: Record<
  AstroHubSourceKey,
  { source: string; status: MissionState }
> = {
  meta: { source: "Mock Mission Stream", status: "live" },
  telemetry: { source: "Mock Telemetry Stream", status: "degraded" },
  hero: { source: "Mock Hero Blend", status: "live" },
  iss: { source: "Mock ISS Telemetry", status: "degraded" },
  calendar: { source: "Mock Celestial Windows", status: "fallback" },
};

export function isAstroHubSourceKey(value: string): value is AstroHubSourceKey {
  return astroHubSourceKeys.includes(value as AstroHubSourceKey);
}

export function cloneAstroHubSourceData<K extends AstroHubSourceKey>(
  sourceKey: K
): AstroHubSourceMap[K] {
  return structuredClone(astroHubMockSourceData[sourceKey]);
}

export async function randomizeAstroHubMockDelay() {
  const delay = Math.floor(Math.random() * (MAX_RANDOM_DELAY_MS + 1));
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export function buildAstroHubSourceEnvelope<K extends AstroHubSourceKey>(
  sourceKey: K,
  data: AstroHubSourceMap[K],
  metadataOverride?: Partial<{ source: string; status: MissionState }>
): AstroHubSourceEnvelope<K> {
  const metadata = {
    ...sourceMetadata[sourceKey],
    ...metadataOverride,
  };
  return {
    sourceKey,
    generatedAt: new Date().toISOString(),
    source: metadata.source,
    status: metadata.status,
    data,
  };
}
