import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Orbit,
  Radio,
  ShieldCheck,
  Telescope,
} from "lucide-react";
import { ChatWidget } from "./chat-widget";
import {
  astroHubMockData,
  type MissionState,
  type MissionTelemetrySource,
} from "./astro-hub-mock-data";

/**
 * Logged-in home: Astro Hub Mission Control mock experience.
 * Provider wiring ships in follow-up slices; this builds the UX contract first.
 */
export function AstroHub() {
  const generatedAtLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(astroHubMockData.generatedAt));

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
                  Mocked data stream to evaluate hero hierarchy, live telemetry,
                  time windows, and exploration workflows before provider
                  integration.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-200/20 bg-slate-950/50 px-4 py-3 text-xs text-slate-200 backdrop-blur">
                <p className="text-slate-400">Mock stream generated</p>
                <p className="mt-1 font-medium text-cyan-100">
                  {generatedAtLabel}
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
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/20 bg-slate-800/50 px-3 py-1 text-xs text-slate-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {astroHubMockData.missionDay}
              </div>
            </div>
          </header>

          <section aria-label="Live telemetry strip">
            <h2 className="sr-only">Live telemetry strip</h2>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {astroHubMockData.telemetry.map((source) => (
                <TelemetryCard key={source.id} source={source} />
              ))}
            </ul>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
            <article className="rounded-3xl border border-cyan-200/20 bg-slate-950/60 p-5 shadow-[0_24px_80px_rgba(8,145,178,0.12)] backdrop-blur sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.2em] text-cyan-200/85 uppercase">
                    Dominant Hero Surface
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                    {astroHubMockData.hero.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    {astroHubMockData.hero.summary}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                  {astroHubMockData.hero.trustSignal}
                </div>
              </div>

              <div className="relative mt-6 overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-900/70">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(14,165,233,0.38),transparent_52%),radial-gradient(circle_at_78%_62%,rgba(16,185,129,0.22),transparent_44%),linear-gradient(140deg,rgba(30,41,59,0.9),rgba(2,8,23,0.96))]" />
                <div className="pointer-events-none absolute -right-20 top-1/2 h-60 w-60 -translate-y-1/2 rounded-full border border-cyan-100/20 motion-safe:animate-[spin_28s_linear_infinite]" />
                <div className="pointer-events-none absolute -right-8 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full border border-cyan-200/25" />
                <div className="relative p-5 sm:p-7">
                  <p className="text-xs tracking-[0.18em] text-slate-300 uppercase">
                    {astroHubMockData.hero.mediaLabel}
                  </p>
                  <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                    {astroHubMockData.hero.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
                      >
                        <dt className="text-xs text-slate-400">
                          {metric.label}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-cyan-50">
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-2xl border border-slate-200/15 bg-slate-950/65 p-5 backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-white">
                    ISS Tracker Module
                  </h2>
                  <span className="text-xs text-cyan-200">Mock telemetry</span>
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
                        {astroHubMockData.iss.lat}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Longitude</dt>
                      <dd className="font-medium text-cyan-50">
                        {astroHubMockData.iss.lon}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Velocity</dt>
                      <dd className="font-medium text-cyan-50">
                        {astroHubMockData.iss.speedKph} km/h
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Next pass</dt>
                      <dd className="font-medium text-cyan-50">
                        {astroHubMockData.iss.nextPass}
                      </dd>
                    </div>
                  </dl>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  {astroHubMockData.iss.confidence}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200/15 bg-slate-950/65 p-5 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">
                  Calendar Preview
                </h2>
                <ul className="mt-4 space-y-3">
                  {astroHubMockData.calendar.map((event) => (
                    <li
                      key={event.title}
                      className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-3"
                    >
                      <h3 className="text-sm font-medium text-slate-100">
                        {event.title}
                      </h3>
                      <p className="mt-1 text-xs text-violet-200">
                        {event.window}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {event.visibility}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </section>

          <section aria-label="Explore layer">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Explore Layer
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {astroHubMockData.explore.map((module) => (
                <li
                  key={module.title}
                  className="group rounded-2xl border border-slate-200/15 bg-slate-950/55 p-4 transition-transform duration-300 hover:-translate-y-1 hover:border-cyan-200/30"
                >
                  <h3 className="text-sm font-semibold text-slate-100">
                    {module.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {module.summary}
                  </p>
                  <p className="mt-3 text-xs text-emerald-200">
                    {module.status}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <ChatWidget />
    </>
  );
}

function TelemetryCard({ source }: { source: MissionTelemetrySource }) {
  const statusStyles: Record<MissionState, string> = {
    live: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
    degraded: "border-amber-300/30 bg-amber-500/10 text-amber-100",
    fallback: "border-slate-300/30 bg-slate-600/20 text-slate-100",
  };

  return (
    <li className="rounded-2xl border border-slate-200/15 bg-slate-950/60 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.15em] text-slate-500 uppercase">
            {source.source}
          </p>
          <p className="mt-1 text-sm text-slate-300">{source.freshness}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${statusStyles[source.status]}`}
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
  );
}
