-- CreateEnum
CREATE TYPE "workflow_subject_type" AS ENUM ('POST', 'INTEGRATION_SET');

-- CreateEnum
CREATE TYPE "workflow_session_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "workflow_run_status" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "workflow_run_trigger" AS ENUM ('MANUAL', 'RESUME', 'RETRY', 'SYSTEM');

-- CreateTable
CREATE TABLE "workflow_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workflow_definition_id" UUID,
    "subject_type" "workflow_subject_type",
    "subject_id" UUID,
    "goal" TEXT,
    "status" "workflow_session_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "workflow_run_status" NOT NULL DEFAULT 'PENDING',
    "trigger" "workflow_run_trigger" NOT NULL DEFAULT 'MANUAL',
    "agent_kind" TEXT NOT NULL DEFAULT 'default',
    "model" TEXT,
    "summary" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_sessions_user_id_created_at_idx" ON "workflow_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_sessions_workflow_definition_id_idx" ON "workflow_sessions"("workflow_definition_id");

-- CreateIndex
CREATE INDEX "workflow_sessions_subject_type_subject_id_idx" ON "workflow_sessions"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "workflow_runs_user_id_created_at_idx" ON "workflow_runs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_runs_session_id_created_at_idx" ON "workflow_runs"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_runs_status_created_at_idx" ON "workflow_runs"("status", "created_at");

-- AddForeignKey
ALTER TABLE "workflow_sessions"
ADD CONSTRAINT "workflow_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs"
ADD CONSTRAINT "workflow_runs_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "workflow_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs"
ADD CONSTRAINT "workflow_runs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
