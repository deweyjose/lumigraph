import { Circle } from "lucide-react";
import type { MissionState } from "@/lib/astro-hub";

function statusClass(status: MissionState) {
  return {
    live: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
    degraded: "border-amber-300/30 bg-amber-500/10 text-amber-100",
    fallback: "border-slate-300/30 bg-slate-600/20 text-slate-100",
  }[status];
}

/**
 * Surface pipeline health only when something is off. Healthy ("live") feeds
 * render nothing — avoids redundant "Live" badges everywhere.
 */
export function HubSourceStatusPill({ status }: { status: MissionState }) {
  if (status === "live") {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${statusClass(status)}`}
    >
      <Circle className="h-2 w-2 fill-current" />
      {status}
    </span>
  );
}
