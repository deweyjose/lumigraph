-- Grant app_user access to all existing tables and sequences in public schema.
-- The bootstrap migration set ALTER DEFAULT PRIVILEGES for future objects,
-- but tables created before that migration were not covered.
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;
