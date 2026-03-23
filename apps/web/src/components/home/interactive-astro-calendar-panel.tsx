"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Circle,
  Download,
  Play,
  X,
} from "lucide-react";
import type {
  AstroHubActionLink,
  AstroHubCalendarEvent,
  AstroHubCalendarStream,
  MissionState,
} from "@/lib/astro-hub";

const STREAM_LABEL: Record<AstroHubCalendarStream, string> = {
  artemis: "Artemis",
  station: "Station",
  nasa_news: "NASA news",
  mock: "Mock window",
};

function statusStyles(status: MissionState) {
  return {
    live: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
    degraded: "border-amber-300/30 bg-amber-500/10 text-amber-100",
    fallback: "border-slate-300/30 bg-slate-600/20 text-slate-100",
  }[status];
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

function localDayKey(iso: string | null): string | null {
  if (!iso) {
    return null;
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayChip(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt);
}

export function InteractiveAstroCalendarPanel({
  events,
  sourceLabel,
  sourceStatus,
}: {
  events: AstroHubCalendarEvent[];
  sourceLabel: string;
  sourceStatus?: MissionState;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [active, setActive] = useState<AstroHubCalendarEvent | null>(null);

  const { dayKeys, hasUndated } = useMemo(() => {
    const keys = new Set<string>();
    let undated = false;
    for (const ev of events) {
      const k = localDayKey(ev.publishedAt);
      if (k) {
        keys.add(k);
      } else {
        undated = true;
      }
    }
    const sorted = Array.from(keys).sort();
    return { dayKeys: sorted, hasUndated: undated };
  }, [events]);

  const filtered = useMemo(() => {
    if (dayFilter === "all") {
      return events;
    }

    if (dayFilter === "undated") {
      return events.filter((ev) => localDayKey(ev.publishedAt) === null);
    }

    return events.filter((ev) => localDayKey(ev.publishedAt) === dayFilter);
  }, [dayFilter, events]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) {
      return;
    }

    if (active) {
      if (!d.open) {
        d.showModal();
      }
    } else if (d.open) {
      d.close();
    }
  }, [active]);

  function closeDetail() {
    setActive(null);
  }

  const detailBody =
    active?.body ?? active?.summary ?? active?.visibility ?? "";

  return (
    <article className="rounded-2xl border border-slate-200/15 bg-slate-950/65 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Mission Watch</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-100 uppercase">
              <CalendarDays className="h-3 w-3" />
              Time layer
            </span>
          </div>
          <p className="mt-1 text-xs tracking-[0.18em] text-slate-400 uppercase">
            {sourceLabel}
          </p>
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-slate-400">
            Rolling missions and news by publish date — not a full sky
            ephemeris. Tap a row for detail and outbound links.
          </p>
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

      {events.length > 0 ? (
        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Filter events by local day"
        >
          <button
            type="button"
            role="tab"
            aria-selected={dayFilter === "all"}
            onClick={() => setDayFilter("all")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              dayFilter === "all"
                ? "border-violet-300/50 bg-violet-500/15 text-violet-50"
                : "border-white/10 bg-slate-900/50 text-slate-300 hover:border-white/20"
            }`}
          >
            All days
          </button>
          {dayKeys.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={dayFilter === key}
              onClick={() => setDayFilter(key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                dayFilter === key
                  ? "border-violet-300/50 bg-violet-500/15 text-violet-50"
                  : "border-white/10 bg-slate-900/50 text-slate-300 hover:border-white/20"
              }`}
            >
              {formatDayChip(key)}
            </button>
          ))}
          {hasUndated ? (
            <button
              type="button"
              role="tab"
              aria-selected={dayFilter === "undated"}
              onClick={() => setDayFilter("undated")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                dayFilter === "undated"
                  ? "border-violet-300/50 bg-violet-500/15 text-violet-50"
                  : "border-white/10 bg-slate-900/50 text-slate-300 hover:border-white/20"
              }`}
            >
              Undated
            </button>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-4 max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-6 text-center text-sm text-slate-400">
            No events for this day.
          </li>
        ) : (
          filtered.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => setActive(event)}
                className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-3 text-left transition-colors hover:border-violet-300/35 hover:bg-slate-900/90"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-slate-100">
                      {event.title}
                    </h3>
                    <span className="rounded-full border border-cyan-200/15 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-100">
                      {STREAM_LABEL[event.stream]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-violet-200">{event.window}</p>
                  {event.sourceLabel ? (
                    <p className="mt-1 text-xs text-cyan-200">
                      {event.sourceLabel}
                    </p>
                  ) : null}
                  {event.summary ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-300">
                      {event.summary}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {event.visibility}
                  </p>
                </div>
                <ChevronRight
                  className="mt-1 h-4 w-4 shrink-0 text-slate-500"
                  aria-hidden
                />
              </button>
            </li>
          ))
        )}
      </ul>

      <dialog
        ref={dialogRef}
        aria-labelledby={active ? "astro-cal-detail-title" : undefined}
        onClose={closeDetail}
        onMouseDown={(e) => {
          if (e.target === dialogRef.current) {
            closeDetail();
          }
        }}
        className="w-[min(100%-2rem,28rem)] max-h-[min(90vh,36rem)] overflow-y-auto rounded-2xl border border-slate-200/20 bg-slate-950 p-5 text-slate-50 shadow-2xl [&::backdrop]:bg-black/70"
      >
        {active ? (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-violet-300 uppercase">
                  Event detail
                </p>
                <h3
                  id="astro-cal-detail-title"
                  className="mt-1 text-base font-semibold text-white"
                >
                  {active.title}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-200/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-100">
                    {STREAM_LABEL[active.stream]}
                  </span>
                  {active.sourceLabel ? (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                      {active.sourceLabel}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border border-white/10 p-1.5 text-slate-300 hover:bg-white/5"
                aria-label="Close event detail"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-violet-200">{active.window}</p>
            {detailBody ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {detailBody}
              </p>
            ) : null}
            {active.relatedHint ? (
              <p className="mt-4 rounded-xl border border-emerald-200/15 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100">
                {active.relatedHint}
              </p>
            ) : null}
            {active.imageUrl ? (
              <img
                src={active.imageUrl}
                alt=""
                className="mt-4 max-h-48 w-full rounded-xl object-cover"
              />
            ) : null}
            <ActionLinks actions={active.actions} />
          </div>
        ) : null}
      </dialog>
    </article>
  );
}
