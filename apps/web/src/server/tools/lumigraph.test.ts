import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/posts", () => ({
  createDraft: vi.fn(),
  getPostForOwner: vi.fn(),
  listMyPosts: vi.fn(),
  publishPost: vi.fn(),
  updatePostDraft: vi.fn(),
}));

vi.mock("../services/integration-sets", () => ({
  createIntegrationSet: vi.fn(),
  getIntegrationSetForOwner: vi.fn(),
  listMyIntegrationSets: vi.fn(),
  updateIntegrationSet: vi.fn(),
}));

vi.mock("../services/assets", () => ({
  listAssetsByIntegrationSetForOwner: vi.fn(),
  listPostFinalAssetsForOwner: vi.fn(),
}));

vi.mock("../services/download-jobs", () => ({
  cancelDownloadJobForOwner: vi.fn(),
  createDownloadExportJob: vi.fn(),
  deleteDownloadJobForOwner: vi.fn(),
  getDownloadJobStatusForOwner: vi.fn(),
  listDownloadJobsForIntegrationSetForOwner: vi.fn(),
}));

const posts = await import("../services/posts");
const integrationSets = await import("../services/integration-sets");
const assets = await import("../services/assets");
const exportJobs = await import("../services/download-jobs");
const tools = await import("./lumigraph");

const context = { userId: "user-1" };

describe("lumigraph tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an owned post through the posts.get tool", async () => {
    vi.mocked(posts.getPostForOwner).mockResolvedValue({
      id: "post-1",
      title: "M31",
      finalImageAsset: null,
      finalThumbAsset: null,
      integrationSets: [],
    } as never);

    const result = await tools.executeLumigraphTool("posts.get", context, {
      postId: "post-1",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: "post-1",
        title: "M31",
        finalImageAsset: null,
        finalThumbAsset: null,
        integrationSets: [],
      },
    });
    expect(posts.getPostForOwner).toHaveBeenCalledWith("post-1", "user-1");
  });

  it("returns validation errors for malformed post tool input", async () => {
    const result = await tools.executeLumigraphTool(
      "posts.create_draft",
      context,
      {
        title: "",
        slug: "bad slug",
      }
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(result.message).toContain("Too small");
  });

  it("returns integration-set assets with JSON-safe values", async () => {
    vi.mocked(assets.listAssetsByIntegrationSetForOwner).mockResolvedValue([
      {
        id: "asset-1",
        filename: "lights.fit",
        sizeBytes: 123n,
      },
    ] as never);

    const result = await tools.executeLumigraphTool(
      "assets.list_integration_set",
      context,
      {
        integrationSetId: "set-1",
      }
    );

    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: "asset-1",
          filename: "lights.fit",
          sizeBytes: 123,
        },
      ],
    });
  });

  it("returns not found when an integration set is not owned", async () => {
    vi.mocked(integrationSets.getIntegrationSetForOwner).mockResolvedValue(
      null
    );

    const result = await tools.executeLumigraphTool(
      "integration_sets.get",
      context,
      {
        integrationSetId: "set-1",
      }
    );

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Integration set not found or you do not own it",
    });
  });

  it("creates export jobs through the export_jobs.create tool", async () => {
    vi.mocked(exportJobs.createDownloadExportJob).mockResolvedValue({
      ok: true,
      job: {
        id: "job-1",
        status: "PENDING",
      },
    } as never);

    const result = await tools.executeLumigraphTool(
      "export_jobs.create",
      context,
      {
        integrationSetId: "set-1",
        selectedPaths: ["lights"],
        requestOrigin: "http://localhost:3000",
      }
    );

    expect(result).toEqual({
      ok: true,
      data: {
        id: "job-1",
        status: "PENDING",
      },
    });
    expect(exportJobs.createDownloadExportJob).toHaveBeenCalledWith({
      userId: "user-1",
      integrationSetId: "set-1",
      selectedPaths: ["lights"],
      requestOrigin: "http://localhost:3000",
    });
  });

  it("maps export job invalid state to BAD_REQUEST", async () => {
    vi.mocked(exportJobs.cancelDownloadJobForOwner).mockResolvedValue({
      ok: false,
      code: "INVALID_STATE",
      message: "Download job cannot be cancelled from status READY.",
    } as never);

    const result = await tools.executeLumigraphTool(
      "export_jobs.cancel",
      context,
      {
        integrationSetId: "set-1",
        jobId: "job-1",
      }
    );

    expect(result).toEqual({
      ok: false,
      code: "BAD_REQUEST",
      message: "Download job cannot be cancelled from status READY.",
    });
  });
});
