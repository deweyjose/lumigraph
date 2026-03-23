"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

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

/** Split RSS/plain body text into paragraphs for readable modal copy. */
function bodyToParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const squeeze = (chunk: string) =>
    chunk.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

  if (normalized.includes("\n\n")) {
    return normalized
      .split(/\n\s*\n/)
      .map(squeeze)
      .filter(Boolean);
  }

  const lines = normalized
    .split("\n")
    .map((line) => squeeze(line))
    .filter(Boolean);

  if (lines.length > 1) {
    return lines;
  }

  return [squeeze(normalized)];
}

function ActionLinks({
  actions,
  className,
}: {
  actions?: AstroHubActionLink[];
  className?: string;
}) {
  if (!actions?.length) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
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

/**
 * Mounted only while `event` is non-null so a closed `<dialog>` is never left
 * in the tree. (Utility classes like `flex` override the UA `display:none` on
 * closed dialogs, which produced a ~2px bordered strip.)
 */
function MissionWatchEventDetailDialog({
  event,
  onClosed,
}: {
  event: AstroHubCalendarEvent;
  onClosed: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const proseSource = event.body ?? event.summary ?? "";
  const detailParagraphs = useMemo(
    () => bodyToParagraphs(proseSource),
    [proseSource]
  );

  useLayoutEffect(() => {
    const d = dialogRef.current;
    if (!d) {
      return;
    }

    if (!d.open) {
      d.showModal();
    }
  }, [event.id]);

  function dismissDialog() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="astro-cal-detail-title"
      onClose={onClosed}
      onMouseDown={(e) => {
        if (e.target === dialogRef.current) {
          dismissDialog();
        }
      }}
      className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(92vh,46rem)] w-[min(calc(100vw-2rem),40rem)] max-w-[40rem] min-h-0 -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200/20 bg-slate-950 p-0 text-slate-50 shadow-2xl [&::backdrop]:bg-black/70"
    >
      <div className="shrink-0 space-y-5 border-b border-white/10 px-6 pb-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] font-semibold tracking-wide text-violet-300 uppercase">
              Event detail
            </p>
            <h3
              id="astro-cal-detail-title"
              className="mt-2 text-lg font-semibold leading-snug text-white sm:text-xl"
            >
              {event.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-200/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-100">
                {STREAM_LABEL[event.stream]}
              </span>
              {event.sourceLabel ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                  {event.sourceLabel}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={dismissDialog}
            className="shrink-0 rounded-full border border-white/10 p-1.5 text-slate-300 hover:bg-white/5"
            aria-label="Close event detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium tracking-tight text-violet-200/95 sm:text-base">
            {event.window}
          </p>
          <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
            {event.visibility}
          </p>
        </div>
        <div>
          <p className="mb-2.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            Links
          </p>
          <ActionLinks actions={event.actions} className="gap-2.5" />
        </div>
        {event.relatedHint ? (
          <p className="rounded-xl border border-emerald-200/15 bg-emerald-500/5 px-4 py-3 text-xs leading-relaxed text-emerald-100 sm:text-sm">
            {event.relatedHint}
          </p>
        ) : null}
      </div>

      {event.imageUrl ? (
        <div className="shrink-0 border-b border-white/10 bg-slate-950 px-6 py-4">
          <img
            src={event.imageUrl}
            alt=""
            className="mx-auto aspect-[2/1] max-h-[10rem] w-full max-w-2xl rounded-lg object-cover object-center ring-1 ring-white/10 sm:max-h-[11rem]"
          />
        </div>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        role="region"
        aria-label="Article summary"
      >
        {detailParagraphs.length > 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="mx-auto max-w-2xl space-y-4">
              {detailParagraphs.map((para, index) => (
                <p
                  key={index}
                  className="text-sm leading-[1.7] text-slate-300 sm:text-[15px] [&:first-of-type]:text-slate-200"
                >
                  {para}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <p className="px-6 py-5 text-sm leading-relaxed text-slate-500 sm:text-base">
            {event.actions?.length
              ? "No on-page summary for this item — use the links above for the full story."
              : "No description for this item."}
          </p>
        )}
      </div>
    </dialog>
  );
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

      {active ? (
        <MissionWatchEventDetailDialog
          key={active.id}
          event={active}
          onClosed={() => setActive(null)}
        />
      ) : null}
    </article>
  );
}
