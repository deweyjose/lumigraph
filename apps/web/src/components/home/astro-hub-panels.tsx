import { ArrowUpRight, Download, Play } from "lucide-react";
import type {
  AstroHubActionLink,
  AstroHubCalendarEvent,
  AstroHubHeroData,
  MissionState,
} from "@/lib/astro-hub";
import { HubSourceStatusPill } from "./astro-hub-source-status";
import { InteractiveAstroCalendarPanel } from "./interactive-astro-calendar-panel";

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

function heroActionIcon(kind: AstroHubActionLink["kind"]) {
  if (kind === "video") {
    return <Play className="h-3 w-3 shrink-0" />;
  }

  if (kind === "download" || kind === "media") {
    return <Download className="h-3 w-3 shrink-0" />;
  }

  return <ArrowUpRight className="h-3 w-3 shrink-0" />;
}

function HeroOutboundLinks({ actions }: { actions?: AstroHubActionLink[] }) {
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
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-slate-950/60 px-3 py-1.5 text-xs font-medium text-cyan-100 transition-colors hover:border-cyan-200/40 hover:bg-cyan-500/10"
        >
          {heroActionIcon(action.kind)}
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

export function HeroSurfaceSkeleton() {
  return (
    <div className="h-[30rem] animate-pulse rounded-3xl border border-cyan-200/15 bg-slate-950/50" />
  );
}

export function HeroSurface({ hero }: { hero: AstroHubHeroData }) {
  return <HeroSurfaceCard hero={hero} />;
}

export function HeroSurfaceCard({
  hero,
  sourceStatus,
}: {
  hero: AstroHubHeroData;
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
        {sourceStatus ? (
          <div className="shrink-0 self-start">
            <HubSourceStatusPill status={sourceStatus} />
          </div>
        ) : null}
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
                decoding="async"
                className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.02]"
              />
            </a>
          ) : null}

          <div className={renderVideo || hero.imageUrl ? "" : "lg:col-span-2"}>
            <p className="text-sm font-medium leading-snug text-slate-200">
              {hero.trustSignal}
            </p>
            {hero.publishedDisplay ? (
              <p className="mt-1 text-xs text-violet-200">
                {hero.publishedDisplay}
              </p>
            ) : null}
            {hero.copyright ? (
              <p className="mt-2 text-xs text-slate-400">{hero.copyright}</p>
            ) : null}
            <HeroOutboundLinks actions={hero.actions} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function IssTrackerPanelSkeleton() {
  return (
    <div className="h-[28rem] max-h-[80vh] animate-pulse rounded-2xl border border-slate-200/10 bg-slate-950/45 sm:h-96" />
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
