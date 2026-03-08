import { afterEach, describe, expect, it } from "vitest";
import { getPrisma } from "@lumigraph/db";
import {
  createWorkflowSessionForOwner,
  listRunArtifactRefsForOwner,
  listRunToolCallsForOwner,
  listWorkflowRunsForOwner,
  recordRunArtifactRefForOwner,
  recordSuccessfulRunToolCallForOwner,
  startWorkflowRunForOwner,
} from "./workflow-runs";

describe("workflow-runs service (integration)", () => {
  const email = `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`;
  let userId: string | null = null;
  let sessionId: string | null = null;
  let postId: string | null = null;

  afterEach(async () => {
    const prisma = await getPrisma();
    if (postId) {
      await prisma.post.deleteMany({ where: { id: postId } });
    }
    if (sessionId) {
      await prisma.workflowRun.deleteMany({ where: { sessionId } });
      await prisma.workflowSession.deleteMany({ where: { id: sessionId } });
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    } else {
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  it("creates a workflow session, records tool calls, and links artifact refs", async () => {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        email,
      },
    });
    userId = user.id;

    const session = await createWorkflowSessionForOwner(user.id, {
      goal: "Draft a publish workflow",
    });

    expect(session).not.toBeNull();
    if (!session) return;
    sessionId = session.id;

    const run = await startWorkflowRunForOwner(user.id, {
      sessionId: session.id,
      agentKind: "planner",
      model: "gpt-4o-mini",
    });

    expect(run).not.toBeNull();
    expect(run?.status).toBe("RUNNING");
    if (!run) return;

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        slug: `workflow-post-${Date.now()}`,
        title: "Workflow draft",
      },
    });
    postId = post.id;

    const toolCall = await recordSuccessfulRunToolCallForOwner(user.id, {
      runId: run.id,
      toolName: "posts.get",
      input: { postId: post.id },
      output: { id: post.id },
    });
    expect(toolCall?.status).toBe("SUCCEEDED");

    const artifactRef = await recordRunArtifactRefForOwner(user.id, {
      runId: run.id,
      artifact: { type: "POST", id: post.id },
    });
    expect(artifactRef?.artifactId).toBe(post.id);

    const runs = await listWorkflowRunsForOwner(user.id, {
      sessionId: session.id,
    });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe(run?.id);

    const toolCalls = await listRunToolCallsForOwner(user.id, {
      runId: run.id,
    });
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]?.toolName).toBe("posts.get");

    const artifactRefs = await listRunArtifactRefsForOwner(user.id, {
      runId: run.id,
    });
    expect(artifactRefs).toHaveLength(1);
    expect(artifactRefs[0]?.artifactType).toBe("POST");
  });
});
