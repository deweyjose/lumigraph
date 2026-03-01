-- Drop the sessions table. Auth.js v5 uses JWT sessions (required by the
-- Credentials provider); database sessions are not used.
DROP TABLE IF EXISTS "sessions";
