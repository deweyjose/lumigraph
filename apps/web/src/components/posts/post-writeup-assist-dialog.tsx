"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  WRITEUP_INTERVIEW_QUESTION_IDS,
  WRITEUP_INTERVIEW_QUESTIONS,
  WRITEUP_REQUIRED_QUESTION_IDS,
} from "@/lib/post-writeup-interview-questions";

type Props = {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyDescription: (description: string) => void;
};

function emptyAnswers(): Record<string, string> {
  return Object.fromEntries(
    WRITEUP_INTERVIEW_QUESTION_IDS.map((id) => [id, ""])
  );
}

export function PostWriteupAssistDialog({
  postId,
  open,
  onOpenChange,
  onApplyDescription,
}: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(emptyAnswers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(0);
      setAnswers(emptyAnswers());
      setError(null);
    }
  }, [open]);

  const question = WRITEUP_INTERVIEW_QUESTIONS[step];
  const total = WRITEUP_INTERVIEW_QUESTIONS.length;
  const isLast = step === total - 1;

  const currentValue = answers[question.id] ?? "";

  const stepValid = useMemo(() => {
    if (!question.required) return true;
    return currentValue.trim().length > 0;
  }, [question.required, question.id, currentValue]);

  async function submitGenerate() {
    for (const id of WRITEUP_REQUIRED_QUESTION_IDS) {
      if (!answers[id]?.trim()) {
        setError(
          "Please complete all required questions. Use Back to fill any you skipped."
        );
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/writeup-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          answers,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        description?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Failed to generate write-up");
        return;
      }
      if (typeof data.description === "string" && data.description.trim()) {
        onApplyDescription(data.description.trim());
        onOpenChange(false);
      } else {
        setError("Generated write-up was empty");
      }
    } catch {
      setError("Failed to generate write-up");
    } finally {
      setLoading(false);
    }
  }

  function goNext() {
    if (!stepValid) {
      setError(
        question.required
          ? "Please answer this question before continuing."
          : null
      );
      return;
    }
    setError(null);
    if (isLast) {
      void submitGenerate();
      return;
    }
    setStep((s) => Math.min(s + 1, total - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={() => !loading && onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="writeup-assist-title"
        className={cn(
          "border-border bg-background relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-xl border shadow-lg"
        )}
      >
        <div className="border-border border-b px-5 py-4">
          <h2 id="writeup-assist-title" className="text-lg font-semibold">
            AI write-up assistant
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Step {step + 1} of {total} — answer a few questions, then we&apos;ll
            draft your write-up.
          </p>
          <div
            className="bg-muted mt-3 h-1.5 w-full overflow-hidden rounded-full"
            aria-hidden
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-200"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor={`writeup-q-${question.id}`}>{question.title}</Label>
            {question.helper ? (
              <p className="text-muted-foreground text-sm">{question.helper}</p>
            ) : null}
            <textarea
              id={`writeup-q-${question.id}`}
              rows={5}
              value={currentValue}
              disabled={loading}
              placeholder={question.placeholder}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [question.id]: e.target.value,
                }))
              }
              className={cn(
                "border-input placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            />
            {!question.required ? (
              <p className="text-muted-foreground text-xs">
                Optional — skip if not relevant.
              </p>
            ) : null}
          </div>
          {error ? (
            <p className="text-destructive mt-3 text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading || step === 0}
            onClick={goBack}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={loading || (!isLast && !stepValid)}
              onClick={goNext}
              className="gap-1"
            >
              {isLast ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  {loading ? "Generating..." : "Generate write-up"}
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
