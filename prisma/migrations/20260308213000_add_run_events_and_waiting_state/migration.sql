ALTER TYPE "workflow_run_status" ADD VALUE IF NOT EXISTS 'WAITING_FOR_INPUT';

CREATE TABLE "run_events" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "step_key" TEXT,
    "payload_json" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "run_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "run_events_run_id_sequence_key" ON "run_events"("run_id", "sequence");
CREATE INDEX "run_events_user_id_created_at_idx" ON "run_events"("user_id", "created_at");
CREATE INDEX "run_events_run_id_sequence_idx" ON "run_events"("run_id", "sequence");
CREATE INDEX "run_events_run_id_occurred_at_idx" ON "run_events"("run_id", "occurred_at");

ALTER TABLE "run_events"
ADD CONSTRAINT "run_events_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "run_events"
ADD CONSTRAINT "run_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
