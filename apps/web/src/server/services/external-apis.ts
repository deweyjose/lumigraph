/**
 * External API fetchers for daily canvas.
 * NASA APOD, Open Notify ISS, SpaceX latest launch.
 * Per research.md: NASA uses api_key; Open Notify and SpaceX need no keys.
 */

const NASA_BASE = "https://api.nasa.gov";
const OPEN_NOTIFY_ISS = "http://api.open-notify.org/iss-now.json";
const SPACEX_LATEST = "https://api.spacexdata.com/v4/launches/latest";

export type ApodData = {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  copyright?: string;
};

export type IssData = {
  message: string;
  iss_position: { latitude: string; longitude: string };
  timestamp: number;
};

export type SpaceXLaunch = {
  id: string;
  name: string;
  date_utc: string;
  details: string | null;
  links?: { patch?: { small?: string; large?: string }; webcast?: string };
  success: boolean | null;
};

export type ExternalApisData = {
  apod: ApodData | null;
  iss: IssData | null;
  spacex: SpaceXLaunch | null;
};

function getNasaApiKey(): string {
  return process.env.NASA_API_KEY ?? "DEMO_KEY";
}

export async function fetchApod(date: Date): Promise<ApodData | null> {
  const dateStr = date.toISOString().slice(0, 10);
  const url = `${NASA_BASE}/planetary/apod?api_key=${getNasaApiKey()}&date=${dateStr}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as ApodData;
  } catch {
    return null;
  }
}

export async function fetchIssNow(): Promise<IssData | null> {
  try {
    const res = await fetch(OPEN_NOTIFY_ISS, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as IssData;
  } catch {
    return null;
  }
}

export async function fetchSpaceXLatest(): Promise<SpaceXLaunch | null> {
  try {
    const res = await fetch(SPACEX_LATEST, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as SpaceXLaunch;
  } catch {
    return null;
  }
}

/**
 * Fetch all external API data for daily canvas synthesis.
 * Failures are isolated; returns partial data.
 */
export async function fetchAllExternalApis(
  date: Date
): Promise<ExternalApisData> {
  const [apod, iss, spacex] = await Promise.all([
    fetchApod(date),
    fetchIssNow(),
    fetchSpaceXLatest(),
  ]);
  return { apod, iss, spacex };
}
