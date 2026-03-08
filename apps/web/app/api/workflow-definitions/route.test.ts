import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  createWorkflowDefinitionForOwnerMock,
  listWorkflowDefinitionsForOwnerMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  createWorkflowDefinitionForOwnerMock: vi.fn(),
  listWorkflowDefinitionsForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/workflow-definitions", () => ({
  createWorkflowDefinitionForOwner: createWorkflowDefinitionForOwnerMock,
  listWorkflowDefinitionsForOwner: listWorkflowDefinitionsForOwnerMock,
}));

import { GET, POST } from "./route";

describe("workflow-definitions collection routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    createWorkflowDefinitionForOwnerMock.mockReset();
    listWorkflowDefinitionsForOwnerMock.mockReset();
  });

  describe("GET /api/workflow-definitions", () => {
    it("rejects unauthenticated access", async () => {
      authMock.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        code: "UNAUTHORIZED",
        message: "Sign in to view workflow definitions",
      });
    });

    it("lists owned workflow definitions", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });
      listWorkflowDefinitionsForOwnerMock.mockResolvedValue([
        { id: "definition-1", title: "Post publish checklist" },
      ]);

      const response = await GET();

      expect(listWorkflowDefinitionsForOwnerMock).toHaveBeenCalledWith(
        "user-1"
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        definitions: [{ id: "definition-1", title: "Post publish checklist" }],
      });
    });
  });

  describe("POST /api/workflow-definitions", () => {
    it("returns validation errors for malformed payloads", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });

      const response = await POST(
        new Request("http://localhost/api/workflow-definitions", {
          method: "POST",
          body: JSON.stringify({
            title: "",
            steps: "not-an-array",
          }),
          headers: {
            "content-type": "application/json",
          },
        })
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        code: "VALIDATION_ERROR",
        message:
          "Too small: expected string to have >=1 characters; Invalid input: expected array, received string",
      });
    });

    it("maps service validation failures to api errors", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });
      createWorkflowDefinitionForOwnerMock.mockResolvedValue({
        ok: false,
        code: "VALIDATION_ERROR",
        message: 'Workflow tool step "publish-post" references an unknown tool',
      });

      const response = await POST(
        new Request("http://localhost/api/workflow-definitions", {
          method: "POST",
          body: JSON.stringify({
            title: "Post publish checklist",
            steps: [
              {
                key: "publish-post",
                position: 1,
                title: "Publish post",
                kind: "TOOL_CALL",
                toolName: "posts.destroy",
              },
            ],
          }),
          headers: {
            "content-type": "application/json",
          },
        })
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        code: "VALIDATION_ERROR",
        message: 'Workflow tool step "publish-post" references an unknown tool',
      });
    });

    it("creates a workflow definition for the authenticated owner", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });
      createWorkflowDefinitionForOwnerMock.mockResolvedValue({
        ok: true,
        definition: {
          id: "definition-1",
          title: "Post publish checklist",
          steps: [],
        },
      });

      const response = await POST(
        new Request("http://localhost/api/workflow-definitions", {
          method: "POST",
          body: JSON.stringify({
            title: "Post publish checklist",
            description: "Review and publish the post",
            subjectType: "POST",
            status: "DRAFT",
            steps: [],
          }),
          headers: {
            "content-type": "application/json",
          },
        })
      );

      expect(createWorkflowDefinitionForOwnerMock).toHaveBeenCalledWith(
        "user-1",
        {
          title: "Post publish checklist",
          description: "Review and publish the post",
          subjectType: "POST",
          status: "DRAFT",
          steps: [],
        }
      );
      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({
        definition: {
          id: "definition-1",
          title: "Post publish checklist",
          steps: [],
        },
      });
    });
  });
});
