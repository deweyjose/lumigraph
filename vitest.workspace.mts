import path from "path";
import { fileURLToPath } from "url";
import { defineWorkspace } from "vitest/config";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineWorkspace([
  {
    test: {
      name: "web",
      root: path.resolve(repoRoot, "apps/web"),
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/*.integration.test.{ts,tsx}"],
      passWithNoTests: true,
    },
  },
  {
    test: {
      name: "web-integration",
      root: path.resolve(repoRoot, "apps/web"),
      include: ["src/**/*.integration.test.{ts,tsx}"],
      exclude: ["**/node_modules/**"],
      passWithNoTests: true,
      setupFiles: [
        path.resolve(repoRoot, "apps/web/vitest.integration.setup.ts"),
      ],
    },
  },
  {
    test: {
      name: "db",
      root: path.resolve(repoRoot, "packages/db"),
      include: ["src/**/*.{test,spec}.ts"],
      exclude: ["**/node_modules/**"],
      passWithNoTests: true,
    },
  },
  {
    test: {
      name: "db-integration",
      root: path.resolve(repoRoot, "packages/db"),
      include: ["src/**/*.integration.test.{ts,tsx}"],
      exclude: ["**/node_modules/**"],
      passWithNoTests: true,
    },
  },
]);
