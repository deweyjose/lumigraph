DROP TABLE IF EXISTS "run_artifact_refs" CASCADE;
DROP TABLE IF EXISTS "run_tool_calls" CASCADE;
DROP TABLE IF EXISTS "workflow_runs" CASCADE;
DROP TABLE IF EXISTS "workflow_sessions" CASCADE;
DROP TABLE IF EXISTS "workflow_step_definitions" CASCADE;
DROP TABLE IF EXISTS "workflow_definitions" CASCADE;

DROP TYPE IF EXISTS "run_artifact_ref_type" CASCADE;
DROP TYPE IF EXISTS "run_tool_call_status" CASCADE;
DROP TYPE IF EXISTS "workflow_run_trigger" CASCADE;
DROP TYPE IF EXISTS "workflow_run_status" CASCADE;
DROP TYPE IF EXISTS "workflow_session_status" CASCADE;
DROP TYPE IF EXISTS "workflow_step_kind" CASCADE;
DROP TYPE IF EXISTS "workflow_definition_status" CASCADE;
DROP TYPE IF EXISTS "workflow_subject_type" CASCADE;
