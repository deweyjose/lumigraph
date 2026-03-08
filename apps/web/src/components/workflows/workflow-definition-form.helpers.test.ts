import { describe, expect, it } from "vitest";
import {
  appendWorkflowStep,
  createWorkflowStep,
  moveWorkflowStep,
  removeWorkflowStep,
  toWorkflowDefinitionPayload,
} from "./workflow-definition-form.helpers";

describe("workflow definition form helpers", () => {
  it("creates and appends blank steps with seeded keys", () => {
    const first = createWorkflowStep(1);
    const steps = appendWorkflowStep([first], 2);

    expect(first).toEqual({
      key: "step-1",
      title: "",
      kind: "INSTRUCTION",
      instructions: "",
      toolName: "",
      toolInputTemplateJson: null,
      expectedArtifactType: "",
    });
    expect(steps[1]).toEqual({
      key: "step-2",
      title: "",
      kind: "INSTRUCTION",
      instructions: "",
      toolName: "",
      toolInputTemplateJson: null,
      expectedArtifactType: "",
    });
  });

  it("moves steps up and down without dropping data", () => {
    const steps = [
      { ...createWorkflowStep(1), key: "first", title: "First" },
      { ...createWorkflowStep(2), key: "second", title: "Second" },
      { ...createWorkflowStep(3), key: "third", title: "Third" },
    ];

    expect(moveWorkflowStep(steps, 1, -1).map((step) => step.key)).toEqual([
      "second",
      "first",
      "third",
    ]);
    expect(moveWorkflowStep(steps, 1, 1).map((step) => step.key)).toEqual([
      "first",
      "third",
      "second",
    ]);
  });

  it("removes a step by index", () => {
    const steps = [
      { ...createWorkflowStep(1), key: "first" },
      { ...createWorkflowStep(2), key: "second" },
    ];

    expect(removeWorkflowStep(steps, 0).map((step) => step.key)).toEqual([
      "second",
    ]);
  });

  it("serializes workflow payloads with trimmed fields and contiguous positions", () => {
    const payload = toWorkflowDefinitionPayload({
      title: "  Post publish checklist  ",
      description: "  Review, then publish  ",
      subjectType: "POST",
      status: "ACTIVE",
      steps: [
        {
          key: " review-assets ",
          title: " Review assets ",
          kind: "REVIEW",
          instructions: " Confirm uploads ",
          toolName: "posts.publish",
          toolInputTemplateJson: { ignored: true },
          expectedArtifactType: "ASSET",
        },
        {
          key: " publish-post ",
          title: " Publish post ",
          kind: "TOOL_CALL",
          instructions: " Publish when metadata is ready ",
          toolName: " posts.publish ",
          toolInputTemplateJson: { postId: "{{subjectId}}" },
          expectedArtifactType: "POST",
        },
      ],
    });

    expect(payload).toEqual({
      title: "Post publish checklist",
      description: "Review, then publish",
      subjectType: "POST",
      status: "ACTIVE",
      steps: [
        {
          key: "review-assets",
          position: 1,
          title: "Review assets",
          kind: "REVIEW",
          instructions: "Confirm uploads",
          toolName: null,
          toolInputTemplateJson: null,
          expectedArtifactType: "ASSET",
        },
        {
          key: "publish-post",
          position: 2,
          title: "Publish post",
          kind: "TOOL_CALL",
          instructions: "Publish when metadata is ready",
          toolName: "posts.publish",
          toolInputTemplateJson: { postId: "{{subjectId}}" },
          expectedArtifactType: "POST",
        },
      ],
    });
  });
});
