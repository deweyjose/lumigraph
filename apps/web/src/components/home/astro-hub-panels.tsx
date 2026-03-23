import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Download,
  Orbit,
  Play,
} from "lucide-react";
import type {
  AstroHubActionLink,
  AstroHubCalendarEvent,
  AstroHubExploreModule,
  AstroHubHeroData,
  AstroHubIssData,
  MissionState,
  MissionTelemetrySource,
} from "@/lib/astro-hub";
import { InteractiveAstroCalendarPanel } from "./interactive-astro-calendar-panel";

function statusStyles(status: MissionState) {
  return {
    live: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
    degraded: "border-amber-300/30 bg-amber-500/10 text-amber-100",
    fallback: "border-slate-300/30 bg-slate-600/20 text-slate-100",
  }[status];
}

function formatLatitude(value: number) {
  const suffix = value >= 0 ? "N" : "S";
  return `${Math.abs(value).toFixed(2)}${suffix}`;
}

function formatLongitude(value: number) {
  const suffix = value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(2)}${suffix}`;
}

function toYouTubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.includes("youtu.be")) {
      const id = url.pathname.replace(/^\/+/, "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function isDirectVideoUrl(value: string) {
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    return /\.(mp4|webm|ogg|mov|m4v)$/.test(pathname);
  } catch {
    return false;
  }
}

function actionIcon(kind: AstroHubActionLink["kind"]) {
  if (kind === "video") {
    return <Play className="h-3 w-3" />;
  }

  if (kind === "download" || kind === "media") {
    return <Download className="h-3 w-3" />;
  }

  return <ArrowUpRight className="h-3 w-3" />;
}

function ActionLinks({ actions }: { actions?: AstroHubActionLink[] }) {
  if (!actions?.length) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((action) => (
        <a
          key={`${action.href}-${action.label}`}
          href={action.href}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-slate-950/60 px-3 py-1.5 text-xs text-cyan-100 transition-colors hover:border-cyan-200/40 hover:bg-cyan-500/10"
        >
          {actionIcon(action.kind)}
          {action.label}
        </a>
      ))}
    </div>
  );
}

export function ModuleError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-red-200/80">{message}</p>
    </div>
  );
}

export function TelemetryStripSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-2xl border border-slate-200/10 bg-slate-950/45"
        />
      ))}
    </div>
  );
}

export function TelemetryStrip({
  telemetry,
}: {
  telemetry: MissionTelemetrySource[];
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {telemetry.map((source) => (
        <li
          key={source.id}
          className="rounded-2xl border border-slate-200/15 bg-slate-950/60 p-4 backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.15em] text-slate-500 uppercase">
                {source.source}
              </p>
              <p className="mt-1 text-sm text-slate-300">{source.freshness}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${statusStyles(source.status)}`}
            >
              <Circle className="h-2 w-2 fill-current" />
              {source.status}
            </span>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-300">
            {source.status === "live" ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-300" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-300" />
            )}
            <div>
              <p>{source.trust}</p>
              {source.fallback ? (
                <p className="mt-1 text-slate-400">{source.fallback}</p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HeroSurfaceSkeleton() {
  return (
    <div className="h-[30rem] animate-pulse rounded-3xl border border-cyan-200/15 bg-slate-950/50" />
  );
}

export function HeroSurface({ hero }: { hero: AstroHubHeroData }) {
  return <HeroSurfaceCard hero={hero} sourceLabel={hero.mediaLabel} />;
}

export function HeroSurfaceCard({
  hero,
  sourceLabel,
  sourceStatus,
}: {
  hero: AstroHubHeroData;
  sourceLabel: string;
  sourceStatus?: MissionState;
}) {
  const mediaUrl = hero.sourceUrl ?? hero.imageUrl;
  const youtubeEmbedUrl =
    hero.mediaType === "video" && mediaUrl ? toYouTubeEmbedUrl(mediaUrl) : null;
  const renderVideo =
    hero.mediaType === "video" &&
    mediaUrl &&
    (Boolean(youtubeEmbedUrl) || isDirectVideoUrl(mediaUrl));

  return (
    <article className="rounded-3xl border border-cyan-200/20 bg-slate-950/60 p-5 shadow-[0_24px_80px_rgba(8,145,178,0.12)] backdrop-blur sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-200/85 uppercase">
            Today in Space
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            {hero.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {hero.summary}
          </p>
        </div>
        <div className="space-y-2 text-right">
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
            {hero.trustSignal}
          </div>
          {sourceStatus ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${statusStyles(sourceStatus)}`}
            >
              <Circle className="h-2 w-2 fill-current" />
              {sourceStatus}
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-900/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(14,165,233,0.38),transparent_52%),radial-gradient(circle_at_78%_62%,rgba(16,185,129,0.22),transparent_44%),linear-gradient(140deg,rgba(30,41,59,0.9),rgba(2,8,23,0.96))]" />
        <div className="pointer-events-none absolute -right-20 top-1/2 h-60 w-60 -translate-y-1/2 rounded-full border border-cyan-100/20 motion-safe:animate-[spin_28s_linear_infinite]" />
        <div className="pointer-events-none absolute -right-8 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full border border-cyan-200/25" />
        <div className="relative grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          {renderVideo ? (
            <div className="overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-950/60">
              {youtubeEmbedUrl ? (
                <iframe
                  src={youtubeEmbedUrl}
                  title={hero.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="aspect-[4/3] h-full w-full"
                />
              ) : (
                <video
                  src={mediaUrl}
                  controls
                  preload="metadata"
                  playsInline
                  className="aspect-[4/3] h-full w-full bg-black object-contain"
                />
              )}
            </div>
          ) : hero.imageUrl ? (
            <a
              href={hero.sourceUrl ?? hero.imageUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="group overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-950/60"
            >
              <img
                src={hero.imageUrl}
                alt={hero.title}
                className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </a>
          ) : null}

          <div className={renderVideo || hero.imageUrl ? "" : "lg:col-span-2"}>
            <p className="text-xs tracking-[0.18em] text-slate-300 uppercase">
              {sourceLabel}
            </p>
            {hero.copyright ? (
              <p className="mt-2 text-xs text-slate-400">{hero.copyright}</p>
            ) : null}
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {hero.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
                >
                  <dt className="text-xs text-slate-400">{metric.label}</dt>
                  <dd className="mt-1 text-sm font-medium text-cyan-50">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
            <ActionLinks actions={hero.actions} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function IssTrackerPanelSkeleton() {
  return (
    <div className="h-60 animate-pulse rounded-2xl border border-slate-200/10 bg-slate-950/45" />
  );
}

export function IssTrackerPanel({ iss }: { iss: AstroHubIssData }) {
  const isLiveTelemetry = iss.confidence.includes("Where The ISS At");

  return (
    <article className="rounded-2xl border border-slate-200/15 bg-slate-950/65 p-5 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">ISS Tracker</h2>
        <span className="text-xs text-cyan-200">
          {isLiveTelemetry ? "Live telemetry" : "Fallback telemetry"}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-20 w-20 rounded-full border border-cyan-200/25">
          <div className="absolute inset-2 rounded-full border border-cyan-300/25" />
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)] motion-safe:animate-pulse" />
          <Orbit className="absolute right-2 top-2 h-3.5 w-3.5 text-cyan-200/70 motion-safe:animate-[spin_9s_linear_infinite]" />
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-2 text-xs text-slate-300">
          <div>
            <dt className="text-slate-500">Latitude</dt>
            <dd className="font-medium text-cyan-50">
              {formatLatitude(iss.latitude)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Longitude</dt>
            <dd className="font-medium text-cyan-50">
              {formatLongitude(iss.longitude)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Velocity</dt>
            <dd className="font-medium text-cyan-50">
              {iss.speedKph.toLocaleString("en-US")} km/h
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Altitude</dt>
            <dd className="font-medium text-cyan-50">
              {iss.altitudeKm
                ? `${iss.altitudeKm.toLocaleString("en-US")} km`
                : "Model pending"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Next pass</dt>
            <dd className="font-medium text-cyan-50">{iss.nextPass}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Visibility</dt>
            <dd className="font-medium text-cyan-50">
              {iss.visibility ?? "unknown"}
            </dd>
          </div>
        </dl>
      </div>
      <p className="mt-4 text-xs text-slate-400">{iss.confidence}</p>
    </article>
  );
}

export function CalendarPanelSkeleton() {
  return (
    <div className="h-96 animate-pulse rounded-2xl border border-slate-200/10 bg-slate-950/45" />
  );
}

export function CalendarPanel({ events }: { events: AstroHubCalendarEvent[] }) {
  return <CalendarPanelCard events={events} sourceLabel="Mission watch" />;
}

export function CalendarPanelCard({
  events,
  sourceLabel,
  sourceStatus,
}: {
  events: AstroHubCalendarEvent[];
  sourceLabel: string;
  sourceStatus?: MissionState;
}) {
  return (
    <InteractiveAstroCalendarPanel
      events={events}
      sourceLabel={sourceLabel}
      sourceStatus={sourceStatus}
    />
  );
}

export function ExploreLayerSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-44 animate-pulse rounded-2xl border border-slate-200/10 bg-slate-950/45"
        />
      ))}
    </div>
  );
}

export function ExploreLayer({
  modules,
}: {
  modules: AstroHubExploreModule[];
}) {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {modules.map((module, index) => (
        <li
          key={[
            module.url,
            module.actions?.[0]?.href,
            module.title,
            module.sourceLabel,
            index,
          ]
            .filter(Boolean)
            .join("::")}
          className="group rounded-2xl border border-slate-200/15 bg-slate-950/55 p-4 transition-transform duration-300 hover:-translate-y-1 hover:border-cyan-200/30"
        >
          <h3 className="text-sm font-semibold text-slate-100">
            {module.title}
          </h3>
          {module.sourceLabel ? (
            <p className="mt-1 text-xs text-cyan-200">{module.sourceLabel}</p>
          ) : null}
          <p className="mt-2 text-sm text-slate-300">{module.summary}</p>
          <p className="mt-3 text-xs text-emerald-200">{module.status}</p>
          <ActionLinks actions={module.actions} />
        </li>
      ))}
    </ul>
  );
}
