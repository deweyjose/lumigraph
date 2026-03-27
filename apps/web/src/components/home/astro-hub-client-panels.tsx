"use client";

import dynamic from "next/dynamic";
import type {
  AstroHubCalendarEvent,
  AstroHubSourceEnvelope,
  MissionState,
} from "@/lib/astro-hub";
import {
  CalendarPanelSkeleton,
  IssTrackerPanelSkeleton,
} from "./astro-hub-panels";

const DynamicIssTrackerPanel = dynamic(
  () => import("./iss-tracker-panel").then((mod) => mod.IssTrackerPanel),
  {
    loading: () => <IssTrackerPanelSkeleton />,
  }
);

const DynamicCalendarPanel = dynamic(
  () =>
    import("./interactive-astro-calendar-panel").then(
      (mod) => mod.InteractiveAstroCalendarPanel
    ),
  {
    loading: () => <CalendarPanelSkeleton />,
  }
);

export function DeferredIssTrackerPanel({
  initial,
}: {
  initial: AstroHubSourceEnvelope<"iss">;
}) {
  return <DynamicIssTrackerPanel initial={initial} />;
}

export function DeferredCalendarPanel({
  events,
  sourceLabel,
  sourceStatus,
}: {
  events: AstroHubCalendarEvent[];
  sourceLabel: string;
  sourceStatus?: MissionState;
}) {
  return (
    <DynamicCalendarPanel
      events={events}
      sourceLabel={sourceLabel}
      sourceStatus={sourceStatus}
    />
  );
}
