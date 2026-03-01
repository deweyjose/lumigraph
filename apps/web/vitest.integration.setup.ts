/**
 * Loads apps/web/.env.integration when running web-integration tests.
 * If the file exists, S3 integration tests run against LocalStack (e.g. local or CI).
 * If it does not exist, S3 tests are skipped (see s3.integration.test.ts).
 * When using LocalStack, disables SDK request checksums for compatibility.
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({
  path: path.join(__dirname, ".env.integration"),
  debug: false,
  ...(typeof process.env.DOTENV_DEBUG === "undefined" && { quiet: true }),
});

if (
  process.env.AWS_S3_ENDPOINT &&
  !process.env.AWS_REQUEST_CHECKSUM_CALCULATION
) {
  process.env.AWS_REQUEST_CHECKSUM_CALCULATION = "WHEN_REQUIRED";
}
