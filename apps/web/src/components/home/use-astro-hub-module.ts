"use client";

import { useEffect, useState } from "react";
import type {
  AstroHubSourceEnvelope,
  AstroHubSourceKey,
} from "@/lib/astro-hub";

type UseAstroHubModuleResult<K extends AstroHubSourceKey> = {
  data: AstroHubSourceEnvelope<K>["data"] | null;
  error: string | null;
  isLoading: boolean;
};

export function useAstroHubModule<K extends AstroHubSourceKey>(
  sourceKey: K
): UseAstroHubModuleResult<K> {
  const [data, setData] = useState<AstroHubSourceEnvelope<K>["data"] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/astro-sources/${sourceKey}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as
          | AstroHubSourceEnvelope<K>
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : `Request failed (${response.status})`
          );
        }

        if (!cancelled) {
          setData((payload as AstroHubSourceEnvelope<K>).data);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load Astro Hub module"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sourceKey]);

  return { data, error, isLoading };
}
