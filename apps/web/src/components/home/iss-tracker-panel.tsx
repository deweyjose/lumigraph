"use client";

import { Loader2 } from "lucide-react";
import type { AstroHubSourceEnvelope } from "@/lib/astro-hub";
import { IssEquirectMap } from "./iss-equirect-map";
import { useIssTelemetry } from "./use-iss-telemetry";

function formatLatitude(value: number) {
  const suffix = value >= 0 ? "N" : "S";
  return `${Math.abs(value).toFixed(2)}${suffix}`;
}

function formatLongitude(value: number) {
  const suffix = value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(2)}${suffix}`;
}

function formatTelemetryAge(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) {
    return "just now";
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function IssTrackerPanel({
  initial,
}: {
  initial: AstroHubSourceEnvelope<"iss">;
}) {
  const {
    envelope,
    displayPosition,
    positionHistory,
    fetchError,
    isRefreshing,
  } = useIssTelemetry(initial);

  const iss = envelope.data;
  const isLiveTelemetry = iss.confidence.includes("Where The ISS At");
  const statusLabel =
    envelope.status === "live"
      ? "Live"
      : envelope.status === "degraded"
        ? "Degraded"
        : "Fallback";

  return (
    <article className="rounded-2xl border border-slate-200/15 bg-slate-950/65 p-5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">ISS Tracker</h2>
          <span
            className="rounded-full border border-cyan-200/25 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-100/90"
            title="Source envelope status"
          >
            {statusLabel}
          </span>
          {isRefreshing ? (
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-cyan-200/80"
              aria-label="Refreshing telemetry"
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLiveTelemetry ? null : (
            <span className="rounded-full border border-amber-300/35 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-100">
              Fallback position
            </span>
          )}
          <span className="text-[11px] text-slate-400">
            Updated {formatTelemetryAge(envelope.generatedAt)}
          </span>
        </div>
      </div>

      {fetchError ? (
        <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95">
          Could not refresh telemetry: {fetchError}. Showing last known
          position.
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        <IssEquirectMap
          lat={displayPosition.lat}
          lon={displayPosition.lon}
          history={positionHistory}
        />
        <p className="text-[11px] leading-snug text-slate-500">
          Earth imagery from the app&apos;s public assets with the live ISS
          ground track overlaid on top.
        </p>

        <dl className="grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div>
            <dt className="text-slate-500">Latitude</dt>
            <dd className="font-medium text-cyan-50">
              {formatLatitude(displayPosition.lat)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Longitude</dt>
            <dd className="font-medium text-cyan-50">
              {formatLongitude(displayPosition.lon)}
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
