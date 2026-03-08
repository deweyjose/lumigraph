"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/auth/form-field";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  appendWorkflowStep,
  moveWorkflowStep,
  removeWorkflowStep,
  toWorkflowDefinitionPayload,
  type WorkflowStepDraft,
} from "./workflow-definition-form.helpers";

type ToolOption = {
  name: string;
  description: string;
};

type WorkflowDefinitionFormProps = {
  mode: "create" | "edit";
  definitionId?: string;
  initialDefinition?: {
    title: string;
    description: string | null;
    subjectType: "POST" | "INTEGRATION_SET" | null;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    steps: Array<{
      key: string;
      title: string;
      kind: "INSTRUCTION" | "TOOL_CALL" | "REVIEW";
      instructions: string | null;
      toolName: string | null;
      toolInputTemplateJson: unknown | null;
      expectedArtifactType:
        | "POST"
        | "INTEGRATION_SET"
        | "ASSET"
        | "DOWNLOAD_JOB"
        | null;
    }>;
  };
  toolOptions: ToolOption[];
};

export function WorkflowDefinitionForm({
  mode,
  definitionId,
  initialDefinition,
  toolOptions,
}: WorkflowDefinitionFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialDefinition?.title ?? "");
  const [description, setDescription] = useState(
    initialDefinition?.description ?? ""
  );
  const [subjectType, setSubjectType] = useState<
    "POST" | "INTEGRATION_SET" | ""
  >(initialDefinition?.subjectType ?? "");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">(
    initialDefinition?.status ?? "DRAFT"
  );
  const [steps, setSteps] = useState<WorkflowStepDraft[]>(
    initialDefinition?.steps.map((step) => ({
      key: step.key,
      title: step.title,
      kind: step.kind,
      instructions: step.instructions ?? "",
      toolName: step.toolName ?? "",
      toolInputTemplateJson: step.toolInputTemplateJson,
      expectedArtifactType: step.expectedArtifactType ?? "",
    })) ?? []
  );
  const [nextStepSeed, setNextStepSeed] = useState(steps.length + 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStep(
    index: number,
    update:
      | Partial<WorkflowStepDraft>
      | ((step: WorkflowStepDraft) => WorkflowStepDraft)
  ) {
    setSteps((current) =>
      current.map((step, stepIndex) => {
        if (stepIndex !== index) return step;
        return typeof update === "function"
          ? update(step)
          : { ...step, ...update };
      })
    );
  }

  function onAddStep() {
    setSteps((current) => appendWorkflowStep(current, nextStepSeed));
    setNextStepSeed((current) => current + 1);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = toWorkflowDefinitionPayload({
        title,
        description,
        subjectType,
        status,
        steps,
      });
      const response = await fetch(
        mode === "create"
          ? "/api/workflow-definitions"
          : `/api/workflow-definitions/${definitionId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message ?? "Failed to save workflow definition");
        return;
      }

      if (mode === "create") {
        startTransition(() => {
          router.push(`/workflows/${data.definition.id}`);
        });
        return;
      }

      startTransition(() => {
        router.refresh();
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
        <CardTitle>
          {mode === "create" ? "New Workflow" : "Edit Workflow"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="workflow-title"
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Publish post checklist"
              required
            />
            <div className="space-y-2">
              <Label htmlFor="workflow-status">Status</Label>
              <Select
                id="workflow-status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as "DRAFT" | "ACTIVE" | "ARCHIVED"
                  )
                }
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr,220px]">
            <div className="space-y-2">
              <Label htmlFor="workflow-description">Description</Label>
              <textarea
                id="workflow-description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={cn(
                  "border-input placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                placeholder="What is this workflow for?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-subject-type">Subject type</Label>
              <Select
                id="workflow-subject-type"
                value={subjectType}
                onChange={(event) =>
                  setSubjectType(
                    event.target.value as "POST" | "INTEGRATION_SET" | ""
                  )
                }
              >
                <option value="">Generic</option>
                <option value="POST">Post</option>
                <option value="INTEGRATION_SET">Integration set</option>
              </Select>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Steps</h2>
                <p className="text-sm text-muted-foreground">
                  Ordered, private-first workflow steps for this process.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={onAddStep}
              >
                <Plus className="size-4" aria-hidden />
                Add step
              </Button>
            </div>

            {steps.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No steps yet. Add one to describe the workflow.
              </div>
            ) : (
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={`${step.key}-${index}`}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Step {index + 1}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {step.kind === "TOOL_CALL"
                            ? "Runs a typed Lumigraph tool"
                            : step.kind === "REVIEW"
                              ? "Human review checkpoint"
                              : "Instruction-only step"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={index === 0}
                          onClick={() =>
                            setSteps((current) =>
                              moveWorkflowStep(current, index, -1)
                            )
                          }
                        >
                          <ArrowUp className="size-4" aria-hidden />
                          <span className="sr-only">Move step up</span>
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={index === steps.length - 1}
                          onClick={() =>
                            setSteps((current) =>
                              moveWorkflowStep(current, index, 1)
                            )
                          }
                        >
                          <ArrowDown className="size-4" aria-hidden />
                          <span className="sr-only">Move step down</span>
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setSteps((current) =>
                              removeWorkflowStep(current, index)
                            )
                          }
                        >
                          <Trash2 className="size-4" aria-hidden />
                          <span className="sr-only">Remove step</span>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <FormField
                        id={`step-key-${index}`}
                        label="Key"
                        value={step.key}
                        onChange={(event) =>
                          updateStep(index, { key: event.target.value })
                        }
                        placeholder="e.g. publish-post"
                        required
                      />
                      <FormField
                        id={`step-title-${index}`}
                        label="Title"
                        value={step.title}
                        onChange={(event) =>
                          updateStep(index, { title: event.target.value })
                        }
                        placeholder="e.g. Publish the post"
                        required
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`step-kind-${index}`}>Kind</Label>
                        <Select
                          id={`step-kind-${index}`}
                          value={step.kind}
                          onChange={(event) =>
                            updateStep(index, (currentStep) => {
                              const nextKind = event.target
                                .value as WorkflowStepDraft["kind"];
                              if (nextKind === "TOOL_CALL") {
                                return { ...currentStep, kind: nextKind };
                              }
                              return {
                                ...currentStep,
                                kind: nextKind,
                                toolName: "",
                                toolInputTemplateJson: null,
                              };
                            })
                          }
                        >
                          <option value="INSTRUCTION">Instruction</option>
                          <option value="TOOL_CALL">Tool call</option>
                          <option value="REVIEW">Review</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`step-artifact-${index}`}>
                          Expected artifact
                        </Label>
                        <Select
                          id={`step-artifact-${index}`}
                          value={step.expectedArtifactType}
                          onChange={(event) =>
                            updateStep(index, {
                              expectedArtifactType: event.target
                                .value as WorkflowStepDraft["expectedArtifactType"],
                            })
                          }
                        >
                          <option value="">None</option>
                          <option value="POST">Post</option>
                          <option value="INTEGRATION_SET">
                            Integration set
                          </option>
                          <option value="ASSET">Asset</option>
                          <option value="DOWNLOAD_JOB">Download job</option>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`step-instructions-${index}`}>
                        Instructions
                      </Label>
                      <textarea
                        id={`step-instructions-${index}`}
                        rows={3}
                        value={step.instructions}
                        onChange={(event) =>
                          updateStep(index, {
                            instructions: event.target.value,
                          })
                        }
                        className={cn(
                          "border-input placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        )}
                        placeholder="Describe what this step should accomplish."
                      />
                    </div>

                    {step.kind === "TOOL_CALL" && (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor={`step-tool-name-${index}`}>Tool</Label>
                        <Select
                          id={`step-tool-name-${index}`}
                          value={step.toolName}
                          onChange={(event) =>
                            updateStep(index, { toolName: event.target.value })
                          }
                        >
                          <option value="">Select a tool</option>
                          {toolOptions.map((tool) => (
                            <option key={tool.name} value={tool.name}>
                              {tool.name}
                            </option>
                          ))}
                        </Select>
                        {step.toolName && (
                          <p className="text-xs text-muted-foreground">
                            {toolOptions.find(
                              (tool) => tool.name === step.toolName
                            )?.description ?? "Runs the selected tool."}
                          </p>
                        )}
                        {step.toolInputTemplateJson !== null && (
                          <p className="text-xs text-muted-foreground">
                            This step keeps its saved tool input template.
                            Editing raw JSON is intentionally out of scope for
                            v1.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create workflow"
                  : "Save workflow"}
            </Button>
            <Button type="button" variant="secondary" asChild>
              <Link
                href={
                  mode === "create"
                    ? "/workflows"
                    : `/workflows/${definitionId}`
                }
              >
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
