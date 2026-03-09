-- CreateEnum
CREATE TYPE "auto_thumb_job_status" AS ENUM ('PENDING', 'RUNNING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "auto_thumb_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "source_asset_id" UUID NOT NULL,
    "source_object_key" TEXT NOT NULL,
    "source_checksum" TEXT,
    "source_version" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "auto_thumb_job_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "output_thumb_key" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_thumb_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auto_thumb_jobs_idempotency_key_key" ON "auto_thumb_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "auto_thumb_jobs_user_id_created_at_idx" ON "auto_thumb_jobs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "auto_thumb_jobs_post_id_created_at_idx" ON "auto_thumb_jobs"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "auto_thumb_jobs_status_updated_at_idx" ON "auto_thumb_jobs"("status", "updated_at");

-- CreateIndex
CREATE INDEX "auto_thumb_jobs_status_attempts_updated_at_idx" ON "auto_thumb_jobs"("status", "attempts", "updated_at");

-- CreateIndex
CREATE INDEX "auto_thumb_jobs_source_asset_id_idx" ON "auto_thumb_jobs"("source_asset_id");

-- AddForeignKey
ALTER TABLE "auto_thumb_jobs"
ADD CONSTRAINT "auto_thumb_jobs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_thumb_jobs"
ADD CONSTRAINT "auto_thumb_jobs_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_thumb_jobs"
ADD CONSTRAINT "auto_thumb_jobs_source_asset_id_fkey"
FOREIGN KEY ("source_asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
