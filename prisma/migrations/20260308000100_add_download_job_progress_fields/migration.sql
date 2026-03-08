ALTER TABLE "download_jobs"
ADD COLUMN "total_files" INTEGER,
ADD COLUMN "completed_files" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "last_progress_at" TIMESTAMP(3);
