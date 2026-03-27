"use client";

import Image from "next/image";
import { lonLatToSvg } from "@/lib/iss-map-projection";

type Point = { lat: number; lon: number };

const IMAGE_W = 1536;
const IMAGE_H = 1024;

// These bounds align the telemetry overlay to the visible world area in
// /public/images/earth.png instead of the full image canvas.
const WORLD_LEFT = 66;
const WORLD_RIGHT = 1492;
const WORLD_TOP = 170;
const WORLD_BOTTOM = 796;

export function projectToEarthImage(
  lon: number,
  lat: number
): { x: number; y: number } {
  const projected = lonLatToSvg(lon, lat);
  const x = WORLD_LEFT + (projected.x / 360) * (WORLD_RIGHT - WORLD_LEFT);
  const y = WORLD_TOP + (projected.y / 180) * (WORLD_BOTTOM - WORLD_TOP);
  return { x, y };
}

export function IssEquirectMap({
  lat,
  lon,
  history,
}: {
  lat: number;
  lon: number;
  history: Point[];
}) {
  const main = projectToEarthImage(lon, lat);
  const prior = history.slice(0, -1);

  return (
    <figure className="relative overflow-hidden rounded-xl bg-slate-950/80">
      <div className="relative aspect-[3/2] w-full max-h-[320px] min-h-[180px]">
        <Image
          src="/images/earth.png"
          alt="Projected Earth map"
          fill
          priority={false}
          sizes="(max-width: 640px) 100vw, 720px"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.12),transparent_48%),linear-gradient(180deg,rgba(2,6,23,0.1),rgba(2,6,23,0.35))]" />
        <svg
          viewBox={`0 0 ${IMAGE_W} ${IMAGE_H}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={`ISS position approximately ${lat.toFixed(2)} degrees latitude, ${lon.toFixed(2)} degrees longitude on the Earth map`}
        >
          <defs>
            <radialGradient id="iss-glow" cx="50%" cy="50%" r="50%">
              <stop
                offset="0%"
                stopColor="rgb(34 211 238)"
                stopOpacity="0.95"
              />
              <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {prior.map((point, index) => {
            const p = projectToEarthImage(point.lon, point.lat);
            const opacity =
              0.14 + ((index + 1) / Math.max(1, prior.length)) * 0.38;
            return (
              <circle
                key={`trail-${index}`}
                cx={p.x}
                cy={p.y}
                r="11"
                fill="rgb(34 211 238)"
                fillOpacity={opacity}
              />
            );
          })}
          <circle
            cx={main.x}
            cy={main.y}
            r="42"
            fill="url(#iss-glow)"
            opacity="0.6"
          />
          <circle
            cx={main.x}
            cy={main.y}
            r="13"
            fill="rgb(34 211 238)"
            stroke="rgb(236 254 255)"
            strokeWidth="3"
          />
        </svg>
      </div>
      <figcaption className="sr-only">
        Earth map image with the International Space Station marked over its
        current ground track.
      </figcaption>
    </figure>
  );
}
