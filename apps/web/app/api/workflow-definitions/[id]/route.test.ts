import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  getWorkflowDefinitionForOwnerMock,
  updateWorkflowDefinitionForOwnerMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getWorkflowDefinitionForOwnerMock: vi.fn(),
  updateWorkflowDefinitionForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/workflow-definitions", () => ({
  getWorkflowDefinitionForOwner: getWorkflowDefinitionForOwnerMock,
  updateWorkflowDefinitionForOwner: updateWorkflowDefinitionForOwnerMock,
}));

import { GET, PUT } from "./route";

const definitionId = "01957dfc-7b83-79d4-9a53-f91dc60cf4f2";

describe("workflow-definition item routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    getWorkflowDefinitionForOwnerMock.mockReset();
    updateWorkflowDefinitionForOwnerMock.mockReset();
  });

  describe("GET /api/workflow-definitions/:id", () => {
    it("returns validation errors for malformed ids", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });

      const response = await GET(
        new Request("http://localhost/api/workflow-definitions/not-a-uuid"),
        {
          params: Promise.resolve({ id: "not-a-uuid" }),
        }
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        code: "VALIDATION_ERROR",
        message: "Invalid UUID",
      });
    });

    it("returns 404 when the workflow definition is not owned", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });
      getWorkflowDefinitionForOwnerMock.mockResolvedValue(null);

      const response = await GET(
        new Request(
          `http://localhost/api/workflow-definitions/${definitionId}`
        ),
        {
          params: Promise.resolve({ id: definitionId }),
        }
      );

      expect(getWorkflowDefinitionForOwnerMock).toHaveBeenCalledWith(
        "user-1",
        definitionId
      );
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        code: "NOT_FOUND",
        message: "Workflow definition not found or you do not own it",
      });
    });

    it("returns the owned workflow definition", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });
      getWorkflowDefinitionForOwnerMock.mockResolvedValue({
        id: definitionId,
        title: "Post publish checklist",
        steps: [],
      });

      const response = await GET(
        new Request(
          `http://localhost/api/workflow-definitions/${definitionId}`
        ),
        {
          params: Promise.resolve({ id: definitionId }),
        }
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        definition: {
          id: definitionId,
          title: "Post publish checklist",
          steps: [],
        },
      });
    });
  });

  describe("PUT /api/workflow-definitions/:id", () => {
    it("rejects unauthenticated access", async () => {
      authMock.mockResolvedValue(null);

      const response = await PUT(
        new Request(
          `http://localhost/api/workflow-definitions/${definitionId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              title: "Post publish checklist",
              steps: [],
            }),
            headers: {
              "content-type": "application/json",
            },
          }
        ),
        {
          params: Promise.resolve({ id: definitionId }),
        }
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        code: "UNAUTHORIZED",
        message: "Sign in to update a workflow definition",
      });
    });

    it("returns validation errors for malformed payloads", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });

      const response = await PUT(
        new Request(
          `http://localhost/api/workflow-definitions/${definitionId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              title: "Post publish checklist",
              steps: [
                {
                  key: "Bad Key",
                  position: 0,
                  title: "",
                  kind: "REVIEW",
                },
              ],
            }),
            headers: {
              "content-type": "application/json",
            },
          }
        ),
        {
          params: Promise.resolve({ id: definitionId }),
        }
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        code: "VALIDATION_ERROR",
        message:
          "Invalid string: must match pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/; Too small: expected number to be >=1; Too small: expected string to have >=1 characters",
      });
    });

    it("maps service validation failures to api errors", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });
      updateWorkflowDefinitionForOwnerMock.mockResolvedValue({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Workflow step positions must be contiguous starting at 1",
      });

      const response = await PUT(
        new Request(
          `http://localhost/api/workflow-definitions/${definitionId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              title: "Post publish checklist",
              steps: [
                {
                  key: "publish-post",
                  position: 2,
                  title: "Publish post",
                  kind: "TOOL_CALL",
                  toolName: "posts.publish",
                },
              ],
            }),
            headers: {
              "content-type": "application/json",
            },
          }
        ),
        {
          params: Promise.resolve({ id: definitionId }),
        }
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        code: "VALIDATION_ERROR",
        message: "Workflow step positions must be contiguous starting at 1",
      });
    });

    it("returns 404 when the workflow definition is not owned", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });
      updateWorkflowDefinitionForOwnerMock.mockResolvedValue({
        ok: false,
        code: "NOT_FOUND",
        message: "Workflow definition not found or you do not own it",
      });

      const response = await PUT(
        new Request(
          `http://localhost/api/workflow-definitions/${definitionId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              title: "Post publish checklist",
              steps: [],
            }),
            headers: {
              "content-type": "application/json",
            },
          }
        ),
        {
          params: Promise.resolve({ id: definitionId }),
        }
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        code: "NOT_FOUND",
        message: "Workflow definition not found or you do not own it",
      });
    });

    it("updates an owned workflow definition", async () => {
      authMock.mockResolvedValue({ user: { id: "user-1" } });
      updateWorkflowDefinitionForOwnerMock.mockResolvedValue({
        ok: true,
        definition: {
          id: definitionId,
          title: "Integration QC",
          steps: [
            {
              id: "step-1",
              key: "inspect-assets",
              position: 1,
            },
          ],
        },
      });

      const response = await PUT(
        new Request(
          `http://localhost/api/workflow-definitions/${definitionId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              title: "Integration QC",
              subjectType: "INTEGRATION_SET",
              status: "ACTIVE",
              steps: [
                {
                  key: "inspect-assets",
                  position: 1,
                  title: "Inspect assets",
                  kind: "TOOL_CALL",
                  toolName: "assets.list_integration_set",
                  toolInputTemplateJson: {
                    integrationSetId: "{{subjectId}}",
                  },
                },
              ],
            }),
            headers: {
              "content-type": "application/json",
            },
          }
        ),
        {
          params: Promise.resolve({ id: definitionId }),
        }
      );

      expect(updateWorkflowDefinitionForOwnerMock).toHaveBeenCalledWith(
        "user-1",
        definitionId,
        {
          title: "Integration QC",
          subjectType: "INTEGRATION_SET",
          status: "ACTIVE",
          steps: [
            {
              key: "inspect-assets",
              position: 1,
              title: "Inspect assets",
              kind: "TOOL_CALL",
              toolName: "assets.list_integration_set",
              toolInputTemplateJson: {
                integrationSetId: "{{subjectId}}",
              },
            },
          ],
        }
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        definition: {
          id: definitionId,
          title: "Integration QC",
          steps: [
            {
              id: "step-1",
              key: "inspect-assets",
              position: 1,
            },
          ],
        },
      });
    });
  });
});
