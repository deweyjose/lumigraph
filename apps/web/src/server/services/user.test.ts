import { describe, it, expect, vi, beforeEach } from "vitest";
import * as userService from "./user";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("../repo/user", () => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../password", () => ({
  hashPassword: vi.fn(),
}));

const { getPrisma } = await import("@lumigraph/db");
const userRepo = await import("../repo/user");
const { hashPassword } = await import("../password");

describe("userService", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
    vi.mocked(userRepo.findByEmail).mockReset();
    vi.mocked(userRepo.create).mockReset();
    vi.mocked(hashPassword).mockReset();
  });

  it("registerWithPassword returns EMAIL_TAKEN when email exists", async () => {
    const prisma = {};
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(userRepo.findByEmail).mockResolvedValue({
      id: "existing-id",
      email: "taken@example.com",
      name: null,
      passwordHash: "hash",
    } as never);

    const result = await userService.registerWithPassword(
      "taken@example.com",
      "password123"
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("EMAIL_TAKEN");
    expect(userRepo.findByEmail).toHaveBeenCalledWith(
      prisma,
      "taken@example.com"
    );
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("registerWithPassword creates user and returns userId and email when email is free", async () => {
    const prisma = {};
    const created = {
      id: "new-user-id",
      email: "new@example.com",
      name: "Test User",
      passwordHash: "hashed",
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(userRepo.findByEmail).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed");
    vi.mocked(userRepo.create).mockResolvedValue(created as never);

    const result = await userService.registerWithPassword(
      "new@example.com",
      "password123",
      "Test User"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.userId).toBe("new-user-id");
    expect(result.email).toBe("new@example.com");
    expect(hashPassword).toHaveBeenCalledWith("password123");
    expect(userRepo.create).toHaveBeenCalledWith(prisma, {
      email: "new@example.com",
      name: "Test User",
      passwordHash: "hashed",
    });
  });

  it("registerWithPassword passes null name when name not provided", async () => {
    const prisma = {};
    const created = {
      id: "new-user-id",
      email: "new@example.com",
      name: null,
      passwordHash: "hashed",
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(userRepo.findByEmail).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed");
    vi.mocked(userRepo.create).mockResolvedValue(created as never);

    await userService.registerWithPassword("new@example.com", "password123");

    expect(userRepo.create).toHaveBeenCalledWith(prisma, {
      email: "new@example.com",
      name: null,
      passwordHash: "hashed",
    });
  });
});
