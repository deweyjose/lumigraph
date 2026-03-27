"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AstroHubSourceEnvelope } from "@/lib/astro-hub";
import { interpolateLonLat } from "@/lib/iss-map-projection";

const POLL_INTERVAL_MS = 2_000;
const SMOOTH_TRANSITION_MS = 2_000;

export type IssTelemetryState = {
  envelope: AstroHubSourceEnvelope<"iss">;
  displayPosition: { lat: number; lon: number };
  positionHistory: Array<{ lat: number; lon: number }>;
  fetchError: string | null;
  isRefreshing: boolean;
};

export function useIssTelemetry(
  initial: AstroHubSourceEnvelope<"iss">
): IssTelemetryState {
  const [envelope, setEnvelope] = useState(initial);
  const [displayPosition, setDisplayPosition] = useState({
    lat: initial.data.latitude,
    lon: initial.data.longitude,
  });
  const [positionHistory, setPositionHistory] = useState<
    Array<{ lat: number; lon: number }>
  >([{ lat: initial.data.latitude, lon: initial.data.longitude }]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayRef = useRef(displayPosition);
  displayRef.current = displayPosition;

  const animatedGenerationRef = useRef(initial.generatedAt);
  const rafRef = useRef<number>(0);

  const animateTo = useCallback((to: { lat: number; lon: number }) => {
    const from = { ...displayRef.current };
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SMOOTH_TRANSITION_MS);
      const eased = 1 - (1 - t) ** 2;
      setDisplayPosition(interpolateLonLat(from, to, eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (envelope.generatedAt === animatedGenerationRef.current) {
      return;
    }
    animatedGenerationRef.current = envelope.generatedAt;
    animateTo({
      lat: envelope.data.latitude,
      lon: envelope.data.longitude,
    });
    setPositionHistory((previous) => {
      const next = {
        lat: envelope.data.latitude,
        lon: envelope.data.longitude,
      };
      return [...previous.slice(-7), next];
    });
  }, [
    animateTo,
    envelope.data.latitude,
    envelope.data.longitude,
    envelope.generatedAt,
  ]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      setIsRefreshing(true);
      setFetchError(null);

      try {
        const response = await fetch("/api/astro-sources/iss", {
          cache: "no-store",
        });
        const payload = (await response.json()) as
          | AstroHubSourceEnvelope<"iss">
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? String(payload.error)
              : `Request failed (${response.status})`
          );
        }

        if (!cancelled) {
          setEnvelope(payload as AstroHubSourceEnvelope<"iss">);
        }
      } catch (nextError) {
        if (!cancelled) {
          setFetchError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to refresh ISS telemetry"
          );
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return {
    envelope,
    displayPosition,
    positionHistory,
    fetchError,
    isRefreshing,
  };
}
