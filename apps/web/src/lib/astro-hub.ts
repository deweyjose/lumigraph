export type MissionState = "live" | "degraded" | "fallback";

export type AstroHubActionLinkKind =
  | "article"
  | "video"
  | "download"
  | "reference"
  | "media";

export type AstroHubActionLink = {
  label: string;
  href: string;
  kind: AstroHubActionLinkKind;
};

export type MissionTelemetrySource = {
  id: string;
  source: string;
  status: MissionState;
  freshness: string;
  trust: string;
  fallback?: string;
};

export type AstroHubMetaData = {
  missionDay: string;
};

export type AstroHubHeroData = {
  title: string;
  summary: string;
  mediaLabel: string;
  metrics: Array<{ label: string; value: string }>;
  trustSignal: string;
  copyright?: string;
  imageUrl?: string;
  sourceUrl?: string;
  actions?: AstroHubActionLink[];
};

export type AstroHubIssData = {
  latitude: number;
  longitude: number;
  speedKph: number;
  altitudeKm?: number;
  visibility?: string;
  nextPass: string;
  confidence: string;
};

export type AstroHubCalendarEvent = {
  title: string;
  window: string;
  visibility: string;
  summary?: string;
  sourceLabel?: string;
  url?: string;
  imageUrl?: string | null;
  actions?: AstroHubActionLink[];
};

export type AstroHubExploreModule = {
  title: string;
  summary: string;
  status: string;
  sourceLabel?: string;
  url?: string;
  imageUrl?: string | null;
  actions?: AstroHubActionLink[];
};

export type AstroHubSourceMap = {
  meta: AstroHubMetaData;
  telemetry: { items: MissionTelemetrySource[] };
  hero: AstroHubHeroData;
  iss: AstroHubIssData;
  calendar: { items: AstroHubCalendarEvent[] };
  explore: { items: AstroHubExploreModule[] };
};

export type AstroHubSourceKey = keyof AstroHubSourceMap;

export type AstroHubSourceEnvelope<K extends AstroHubSourceKey> = {
  sourceKey: K;
  generatedAt: string;
  source: string;
  status: MissionState;
  data: AstroHubSourceMap[K];
};

export const astroHubSourceKeys: AstroHubSourceKey[] = [
  "meta",
  "telemetry",
  "hero",
  "iss",
  "calendar",
  "explore",
];

export const astroHubMockSourceData: AstroHubSourceMap = {
  meta: {
    missionDay: "Day 068",
  },
  telemetry: {
    items: [
      {
        id: "nasa",
        source: "NASA Open Data",
        status: "live",
        freshness: "updated 2m ago",
        trust: "high confidence",
      },
      {
        id: "iss",
        source: "ISS Position Feed",
        status: "degraded",
        freshness: "updated 12m ago",
        trust: "stale horizon model",
        fallback: "Using synthetic drift interpolation",
      },
      {
        id: "launch",
        source: "Launch Stream",
        status: "live",
        freshness: "updated 5m ago",
        trust: "confirmed payload manifest",
      },
      {
        id: "calendar",
        source: "Event Calendar",
        status: "fallback",
        freshness: "updated 27m ago",
        trust: "advisory only",
        fallback: "Falling back to cached celestial windows",
      },
    ],
  },
  hero: {
    title: "Deep Field Composite: Orion Arm Drift",
    summary:
      "Simulated mission blend of APOD framing, recent transit geometry, and orbital weather context to evaluate hero storytelling before live providers are wired.",
    mediaLabel: "Dominant Surface / Mock Feed",
    metrics: [
      { label: "Exposure Stack", value: "19 x 240s" },
      { label: "Spectral Band", value: "Ha + OIII" },
      { label: "Signal Quality", value: "91 / 100" },
      { label: "Source Blend", value: "NASA + ISS + Launch" },
    ],
    trustSignal: "Telemetry confidence 0.93 (mocked contract)",
  },
  iss: {
    latitude: 29.42,
    longitude: -105.03,
    speedKph: 27540,
    nextPass: "20:41 local",
    confidence: "Modeled pass confidence 82%",
  },
  calendar: {
    items: [
      {
        title: "Lunar shadow crossing",
        window: "Tonight 21:05 - 21:52",
        visibility: "Best from western horizon",
      },
      {
        title: "Jupiter storm band lock",
        window: "Tomorrow 03:10 - 04:00",
        visibility: "High contrast with IR filter",
      },
      {
        title: "Aurora probability bump",
        window: "Mar 10 00:30 - 02:00",
        visibility: "Northern latitude priority",
      },
    ],
  },
  explore: {
    items: [
      {
        title: "Transient targets queue",
        summary:
          "Mock list of photogenic targets ranked by visibility, atmosphere, and moon-phase impact.",
        status: "3 high-priority captures available",
      },
      {
        title: "Instrument thermal profile",
        summary:
          "Prototype module for tracking thermal drift and calibration advisories before long exposure runs.",
        status: "Cooling trend stable / 0.4C variance",
      },
      {
        title: "Mission notes digest",
        summary:
          "Summarized operation notes from previous sessions to validate narrative continuity in the redesign.",
        status: "6 notes synthesized in mock stream",
      },
    ],
  },
};
