-- Create the IAM-auth application user if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE USER app_user;
  END IF;
END
$$;

-- Allow app_user to authenticate via RDS IAM auth tokens.
GRANT rds_iam TO app_user;

-- Grant app_user full access to the database and public schema.
GRANT ALL ON DATABASE lumigraph_db TO app_user;
GRANT ALL ON SCHEMA public TO app_user;

-- Ensure future objects created by the migration user are accessible to app_user.
ALTER DEFAULT PRIVILEGES FOR ROLE lumigraph_admin IN SCHEMA public
  GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE lumigraph_admin IN SCHEMA public
  GRANT ALL ON SEQUENCES TO app_user;
