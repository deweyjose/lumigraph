"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  integrationSetId: string;
  notes: string;
  onApplyNotes: (next: string) => void;
};

export function IntegrationSetNotesAssistButtons({
  integrationSetId,
  notes,
  onApplyNotes,
}: Props) {
  const [loading, setLoading] = useState<"gen" | "ref" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setError(null);
    setLoading("gen");
    try {
      const res = await fetch(
        `/api/integration-sets/${integrationSetId}/notes-assist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        notes?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Failed to generate notes");
        return;
      }
      if (typeof data.notes === "string" && data.notes.trim()) {
        onApplyNotes(data.notes.trim());
      } else {
        setError("Generated notes were empty");
      }
    } catch {
      setError("Failed to generate notes");
    } finally {
      setLoading(null);
    }
  }

  async function onRefine() {
    const trimmed = notes.trim();
    if (!trimmed) {
      setError("Add some notes before refining.");
      return;
    }
    setError(null);
    setLoading("ref");
    try {
      const res = await fetch(
        `/api/integration-sets/${integrationSetId}/notes-assist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refine", notes: trimmed }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        notes?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Failed to refine notes");
        return;
      }
      if (typeof data.notes === "string" && data.notes.trim()) {
        onApplyNotes(data.notes.trim());
      } else {
        setError("Refined notes were empty");
      }
    } catch {
      setError("Failed to refine notes");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex items-center gap-1.5"
          disabled={loading !== null}
          onClick={() => void onGenerate()}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {loading === "gen" ? "Generating..." : "AI draft from files"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex items-center gap-1.5"
          disabled={loading !== null || !notes.trim()}
          onClick={() => void onRefine()}
        >
          <Wand2 className="h-3.5 w-3.5" />
          {loading === "ref" ? "Refining..." : "AI refine"}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
