-- CreateEnum
CREATE TYPE "run_tool_call_status" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "run_artifact_ref_type" AS ENUM ('POST', 'INTEGRATION_SET', 'ASSET', 'DOWNLOAD_JOB');

-- CreateTable
CREATE TABLE "run_tool_calls" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tool_name" TEXT NOT NULL,
    "status" "run_tool_call_status" NOT NULL,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "error_json" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "run_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_artifact_refs" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "artifact_type" "run_artifact_ref_type" NOT NULL,
    "artifact_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "run_artifact_refs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "run_tool_calls_user_id_created_at_idx" ON "run_tool_calls"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "run_tool_calls_run_id_created_at_idx" ON "run_tool_calls"("run_id", "created_at");

-- CreateIndex
CREATE INDEX "run_tool_calls_tool_name_created_at_idx" ON "run_tool_calls"("tool_name", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "run_artifact_refs_run_id_artifact_type_artifact_id_key" ON "run_artifact_refs"("run_id", "artifact_type", "artifact_id");

-- CreateIndex
CREATE INDEX "run_artifact_refs_user_id_created_at_idx" ON "run_artifact_refs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "run_artifact_refs_run_id_created_at_idx" ON "run_artifact_refs"("run_id", "created_at");

-- CreateIndex
CREATE INDEX "run_artifact_refs_artifact_type_artifact_id_idx" ON "run_artifact_refs"("artifact_type", "artifact_id");

-- AddForeignKey
ALTER TABLE "run_tool_calls"
ADD CONSTRAINT "run_tool_calls_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_tool_calls"
ADD CONSTRAINT "run_tool_calls_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_artifact_refs"
ADD CONSTRAINT "run_artifact_refs_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_artifact_refs"
ADD CONSTRAINT "run_artifact_refs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
