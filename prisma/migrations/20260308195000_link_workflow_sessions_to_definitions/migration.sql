ALTER TABLE "workflow_sessions"
ADD CONSTRAINT "workflow_sessions_workflow_definition_id_fkey"
FOREIGN KEY ("workflow_definition_id")
REFERENCES "workflow_definitions"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
