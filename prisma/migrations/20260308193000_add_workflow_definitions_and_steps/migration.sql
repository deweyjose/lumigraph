-- CreateEnum
CREATE TYPE "workflow_definition_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "workflow_step_kind" AS ENUM ('INSTRUCTION', 'TOOL_CALL', 'REVIEW');

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject_type" "workflow_subject_type",
    "status" "workflow_definition_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_definitions" (
    "id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "workflow_step_kind" NOT NULL,
    "instructions" TEXT,
    "tool_name" TEXT,
    "tool_input_template_json" JSONB,
    "expected_artifact_type" "run_artifact_ref_type",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_step_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_definitions_user_id_updated_at_idx" ON "workflow_definitions"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "workflow_definitions_status_updated_at_idx" ON "workflow_definitions"("status", "updated_at");

-- CreateIndex
CREATE INDEX "workflow_definitions_subject_type_updated_at_idx" ON "workflow_definitions"("subject_type", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_step_definitions_definition_id_key_key" ON "workflow_step_definitions"("definition_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_step_definitions_definition_id_position_key" ON "workflow_step_definitions"("definition_id", "position");

-- CreateIndex
CREATE INDEX "workflow_step_definitions_definition_id_position_idx" ON "workflow_step_definitions"("definition_id", "position");

-- AddForeignKey
ALTER TABLE "workflow_definitions"
ADD CONSTRAINT "workflow_definitions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_definitions"
ADD CONSTRAINT "workflow_step_definitions_definition_id_fkey"
FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
