import { afterEach, describe, expect, it } from "vitest";
import { getPrisma } from "@lumigraph/db";
import {
  createWorkflowSessionForOwner,
  listWorkflowRunsForOwner,
  startWorkflowRunForOwner,
} from "./workflow-runs";

describe("workflow-runs service (integration)", () => {
  const email = `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`;
  let userId: string | null = null;
  let sessionId: string | null = null;

  afterEach(async () => {
    const prisma = await getPrisma();
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

  it("creates a workflow session and starts a run for the owner", async () => {
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

    const runs = await listWorkflowRunsForOwner(user.id, {
      sessionId: session.id,
    });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe(run?.id);
  });
});
