"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SubjectOption = {
  id: string;
  title: string;
  subtitle?: string | null;
};

type WorkflowLaunchFormProps = {
  definitionId: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  subjectType: "POST" | "INTEGRATION_SET" | null;
  subjectOptions: SubjectOption[];
};

export function WorkflowLaunchForm({
  definitionId,
  status,
  subjectType,
  subjectOptions,
}: WorkflowLaunchFormProps) {
  const [subjectId, setSubjectId] = useState("");
  const [goal, setGoal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<{
    sessionId: string;
    runId: string;
  } | null>(null);

  const requiresSubject = subjectType !== null;
  const canLaunch =
    status === "ACTIVE" && (!requiresSubject || subjectOptions.length > 0);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLaunchResult(null);

    if (requiresSubject && !subjectId) {
      setError("Select a subject before launching this workflow");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/workflow-definitions/${definitionId}/launch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(requiresSubject && {
              subjectType,
              subjectId,
            }),
            goal: goal.trim() || null,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message ?? "Failed to launch workflow");
        return;
      }

      setLaunchResult({
        sessionId: data.session.id,
        runId: data.run.id,
      });
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Launch Workflow</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          {requiresSubject ? (
            <div className="space-y-2">
              <Label htmlFor="launch-subject">
                {subjectType === "POST" ? "Post" : "Integration set"}
              </Label>
              <Select
                id="launch-subject"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                disabled={!canLaunch}
              >
                <option value="">
                  {subjectOptions.length > 0
                    ? "Select a subject"
                    : `No ${subjectType === "POST" ? "posts" : "integration sets"} available`}
                </option>
                {subjectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.subtitle
                      ? `${option.title} (${option.subtitle})`
                      : option.title}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This workflow does not require a bound subject and can start as a
              generic session.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="launch-goal">Goal (optional)</Label>
            <textarea
              id="launch-goal"
              rows={3}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className={cn(
                "border-input placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              placeholder="What should this run accomplish?"
              disabled={!canLaunch}
            />
          </div>

          {status !== "ACTIVE" && (
            <p className="text-sm text-muted-foreground">
              Only active workflow definitions can be launched.
            </p>
          )}

          {requiresSubject && subjectOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add a compatible owned{" "}
              {subjectType === "POST" ? "post" : "integration set"} before
              launching this workflow.
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {launchResult && (
            <p className="text-sm text-foreground" role="status">
              Session <code>{launchResult.sessionId}</code> started with run{" "}
              <code>{launchResult.runId}</code>.
            </p>
          )}

          <Button type="submit" disabled={!canLaunch || isSubmitting}>
            {isSubmitting ? "Launching..." : "Launch workflow"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
