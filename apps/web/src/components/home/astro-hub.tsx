import { Suspense } from "react";
import { Clock3, Radio, ShieldCheck, Telescope } from "lucide-react";
import { getAstroHubCalendarSource } from "@/server/services/astro-sources/calendar";
import { getAstroHubExploreSource } from "@/server/services/astro-sources/explore";
import { getAstroHubHeroSource } from "@/server/services/astro-sources/hero";
import { getAstroHubIssSource } from "@/server/services/astro-sources/iss";
import { getAstroHubMetaSource } from "@/server/services/astro-sources/meta";
import { getAstroHubTelemetrySource } from "@/server/services/astro-sources/telemetry";
import {
  CalendarPanelCard,
  CalendarPanelSkeleton,
  ExploreLayer,
  ExploreLayerSkeleton,
  HeroSurfaceCard,
  HeroSurfaceSkeleton,
  IssTrackerPanel,
  IssTrackerPanelSkeleton,
  ModuleError,
  TelemetryStrip,
  TelemetryStripSkeleton,
} from "./astro-hub-panels";
import { ChatWidget } from "./chat-widget";

async function MissionDayBadge() {
  try {
    const meta = await getAstroHubMetaSource();
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/20 bg-slate-800/50 px-3 py-1 text-xs text-slate-200">
        <ShieldCheck className="h-3.5 w-3.5" />
        {meta.data.missionDay}
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mission stream unavailable";
    return <ModuleError title="Mission badge unavailable" message={message} />;
  }
}

function MissionDayBadgeSkeleton() {
  return (
    <div className="h-8 w-28 animate-pulse rounded-full border border-slate-200/10 bg-slate-950/45" />
  );
}

async function TelemetryStripSection() {
  try {
    const telemetry = await getAstroHubTelemetrySource();
    return <TelemetryStrip telemetry={telemetry.data.items} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Telemetry stream unavailable";
    return <ModuleError title="Telemetry unavailable" message={message} />;
  }
}

async function HeroSurfaceSection() {
  try {
    const hero = await getAstroHubHeroSource();
    return (
      <HeroSurfaceCard
        hero={hero.data}
        sourceLabel={hero.source}
        sourceStatus={hero.status}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Hero source unavailable";
    return <ModuleError title="Hero surface unavailable" message={message} />;
  }
}

async function IssTrackerSection() {
  try {
    const iss = await getAstroHubIssSource();
    return <IssTrackerPanel iss={iss.data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ISS telemetry unavailable";
    return <ModuleError title="ISS tracker unavailable" message={message} />;
  }
}

async function CalendarSection() {
  try {
    const calendar = await getAstroHubCalendarSource();
    return (
      <CalendarPanelCard
        events={calendar.data.items}
        sourceLabel={calendar.source}
        sourceStatus={calendar.status}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Calendar source unavailable";
    return <ModuleError title="Calendar unavailable" message={message} />;
  }
}

async function ExploreLayerSection() {
  try {
    const explore = await getAstroHubExploreSource();
    return <ExploreLayer modules={explore.data.items} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Explore source unavailable";
    return <ModuleError title="Explore layer unavailable" message={message} />;
  }
}

export function AstroHub() {
  return (
    <>
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_78%_20%,rgba(34,197,94,0.1),transparent_30%),linear-gradient(180deg,rgba(8,16,30,0.92),rgba(7,13,25,1))]" />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <header className="space-y-4">
            <p className="text-xs tracking-[0.22em] text-cyan-200/85 uppercase">
              Astro Hub Mission Control
            </p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Live Orbit Desk
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
                  Source-scoped APIs stream panel-by-panel so we can mix live
                  feeds, graceful fallbacks, and suspense boundaries without
                  coupling the whole hub to a single provider.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-200/20 bg-slate-950/50 px-4 py-3 text-xs text-slate-200 backdrop-blur">
                <p className="text-slate-400">Astro Hub wiring</p>
                <p className="mt-1 font-medium text-cyan-100">
                  Live feeds + suspense
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                <Radio className="h-3.5 w-3.5 motion-safe:animate-pulse" />
                Live Layer
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-100">
                <Clock3 className="h-3.5 w-3.5" />
                Time Layer
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                <Telescope className="h-3.5 w-3.5" />
                Explore Layer
              </div>
              <Suspense fallback={<MissionDayBadgeSkeleton />}>
                <MissionDayBadge />
              </Suspense>
            </div>
          </header>

          <section aria-label="Live telemetry strip">
            <h2 className="sr-only">Source status</h2>
            <Suspense fallback={<TelemetryStripSkeleton />}>
              <TelemetryStripSection />
            </Suspense>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
            <Suspense fallback={<HeroSurfaceSkeleton />}>
              <HeroSurfaceSection />
            </Suspense>

            <div className="space-y-6">
              <Suspense fallback={<IssTrackerPanelSkeleton />}>
                <IssTrackerSection />
              </Suspense>
              <Suspense fallback={<CalendarPanelSkeleton />}>
                <CalendarSection />
              </Suspense>
            </div>
          </section>

          <section aria-label="Explore layer">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Explore Layer
            </h2>
            <Suspense fallback={<ExploreLayerSkeleton />}>
              <ExploreLayerSection />
            </Suspense>
          </section>
        </div>
      </div>
      <ChatWidget />
    </>
  );
}
