import { Suspense } from "react";
import { getAstroHubCalendarSource } from "@/server/services/astro-sources/calendar";
import { getAstroHubHeroSource } from "@/server/services/astro-sources/hero";
import { getAstroHubIssSource } from "@/server/services/astro-sources/iss";
import {
  CalendarPanelCard,
  CalendarPanelSkeleton,
  HeroSurfaceCard,
  HeroSurfaceSkeleton,
  IssTrackerPanel,
  IssTrackerPanelSkeleton,
  ModuleError,
} from "./astro-hub-panels";
import { ChatWidget } from "./chat-widget";

async function HeroSurfaceSection() {
  try {
    const hero = await getAstroHubHeroSource();
    return <HeroSurfaceCard hero={hero.data} sourceStatus={hero.status} />;
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
    return <ModuleError title="Mission Watch unavailable" message={message} />;
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
          </header>

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
        </div>
      </div>
      <ChatWidget />
    </>
  );
}
