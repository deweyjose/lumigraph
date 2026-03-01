import { getPrisma } from "@lumigraph/db";
import { hashPassword } from "../password";
import * as userRepo from "../repo/user";

export type RegisterResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: "EMAIL_TAKEN" };

/**
 * Create a new user with email and password. Used by the registration flow.
 * Returns whether the user was created or the email is already taken.
 */
export async function registerWithPassword(
  email: string,
  password: string,
  name?: string | null
): Promise<RegisterResult> {
  const prisma = await getPrisma();
  const existing = await userRepo.findByEmail(prisma, email);
  if (existing) return { ok: false, reason: "EMAIL_TAKEN" };
  const passwordHash = await hashPassword(password);
  const user = await userRepo.create(prisma, {
    email,
    name: name ?? null,
    passwordHash,
  });
  return { ok: true, userId: user.id, email: user.email };
}
