CREATE TYPE "download_job_status" AS ENUM ('PENDING', 'RUNNING', 'READY', 'FAILED');

CREATE TABLE "download_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "integration_set_id" UUID NOT NULL,
    "selected_paths_json" JSONB NOT NULL,
    "status" "download_job_status" NOT NULL DEFAULT 'PENDING',
    "output_s3_key" TEXT,
    "output_size_bytes" BIGINT,
    "error_message" TEXT,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "download_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "download_jobs_user_id_created_at_idx" ON "download_jobs"("user_id", "created_at");
CREATE INDEX "download_jobs_integration_set_id_created_at_idx" ON "download_jobs"("integration_set_id", "created_at");
CREATE INDEX "download_jobs_status_created_at_idx" ON "download_jobs"("status", "created_at");

ALTER TABLE "download_jobs"
ADD CONSTRAINT "download_jobs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "download_jobs"
ADD CONSTRAINT "download_jobs_integration_set_id_fkey"
FOREIGN KEY ("integration_set_id") REFERENCES "integration_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
