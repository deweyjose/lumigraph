import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InvalidIntegrationSelectionForPostError,
  replacePostIntegrationSetLinksTx,
} from "./integration-sets";

describe("replacePostIntegrationSetLinksTx", () => {
  const postId = "post-1";
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when any integration set id is not owned", async () => {
    const tx = {
      integrationSet: {
        findMany: vi.fn().mockResolvedValue([{ id: "set-a" }]),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
    };

    await expect(
      replacePostIntegrationSetLinksTx(tx as never, userId, postId, [
        "set-a",
        "set-b",
      ])
    ).rejects.toBeInstanceOf(InvalidIntegrationSelectionForPostError);
    expect(tx.integrationSet.updateMany).not.toHaveBeenCalled();
    expect(tx.integrationSet.update).not.toHaveBeenCalled();
  });

  it("clears post links then assigns each selected set", async () => {
    const tx = {
      integrationSet: {
        findMany: vi.fn().mockResolvedValue([{ id: "set-a" }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    await replacePostIntegrationSetLinksTx(tx as never, userId, postId, [
      "set-a",
    ]);

    expect(tx.integrationSet.findMany).toHaveBeenCalledWith({
      where: { userId, id: { in: ["set-a"] } },
      select: { id: true },
    });
    expect(tx.integrationSet.updateMany).toHaveBeenCalledWith({
      where: { userId, postId },
      data: { postId: null },
    });
    expect(tx.integrationSet.update).toHaveBeenCalledWith({
      where: { id: "set-a", userId },
      data: { postId },
    });
  });

  it("allows an empty selection after validation (unlink all)", async () => {
    const tx = {
      integrationSet: {
        findMany: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn(),
      },
    };

    await replacePostIntegrationSetLinksTx(tx as never, userId, postId, []);

    expect(tx.integrationSet.findMany).not.toHaveBeenCalled();
    expect(tx.integrationSet.updateMany).toHaveBeenCalled();
    expect(tx.integrationSet.update).not.toHaveBeenCalled();
  });
});
