import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "**/*.config.js",
    "**/*.config.mjs",
    "**/*.config.mts",
    "next-env.d.ts",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Next.js rules only for the web app
  ...nextVitals.map((config) => ({ ...config, files: ["apps/web/**"] })),
]);
