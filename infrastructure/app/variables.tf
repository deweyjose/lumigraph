variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
  default     = "lumigraph"
}

variable "env" {
  description = "Environment name (used in tags)."
  type        = string
  default     = "prod"
}

variable "artifacts_bucket_name" {
  description = "S3 bucket name for Lumigraph artifacts."
  type        = string
  default     = null
}

variable "vpc_id" {
  description = "VPC ID for RDS and proxy resources. If null, use the default VPC."
  type        = string
  default     = null
}

variable "subnet_ids" {
  description = "Subnet IDs for RDS subnet group and RDS Proxy. If empty, use default VPC subnets."
  type        = list(string)
  default     = []
}

variable "allowed_localhost_origins" {
  description = "Allowed localhost origins for CORS (dev)."
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:5173"]
}

variable "allowed_vercel_preview_origins" {
  description = "Allowed Vercel preview origins for CORS."
  type        = list(string)
  default     = []
}

variable "allowed_vercel_prod_origins" {
  description = "Allowed Vercel production origins for CORS."
  type        = list(string)
  default     = []
}

variable "db_name" {
  description = "Primary PostgreSQL database name."
  type        = string
  default     = "lumigraph_db"
}

variable "db_master_username" {
  description = "Master username for the PostgreSQL instance."
  type        = string
  default     = "lumigraph_admin"
}

variable "db_engine_version" {
  description = "PostgreSQL engine major version. RDS picks the latest minor version."
  type        = string
  default     = "17"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  description = "Allocated storage in GB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage_gb" {
  description = "Maximum autoscaled storage in GB."
  type        = number
  default     = 100
}

variable "db_port" {
  description = "PostgreSQL port."
  type        = number
  default     = 5432
}

variable "db_backup_retention_days_dev" {
  description = "Backup retention days for dev."
  type        = number
  default     = 7
}

variable "db_backup_retention_days_prod" {
  description = "Backup retention days for prod."
  type        = number
  default     = 14
}

variable "db_proxy_idle_client_timeout_seconds" {
  description = "Idle timeout for RDS Proxy clients."
  type        = number
  default     = 1800
}

variable "db_direct_allowed_cidrs" {
  description = "CIDRs allowed to connect directly to the RDS instance (bypassing proxy). Used for Vercel serverless functions which cannot reach the VPC-only proxy."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "proxy_allowed_cidrs" {
  description = "CIDRs allowed to connect to the RDS Proxy endpoint."
  type        = list(string)
  default     = []
}

variable "vercel_team_slug" {
  description = "Vercel team slug used for OIDC trust."
  type        = string
  default     = "deweys-projects-c66e9e02"
}

variable "vercel_project_name" {
  description = "Vercel project name used in OIDC subject matching."
  type        = string
  default     = "lumigraph"
}

variable "vercel_oidc_subjects" {
  description = "Optional explicit Vercel OIDC subject patterns; when empty a sane default is used."
  type        = list(string)
  default     = []
}

variable "db_iam_app_username" {
  description = "Database username that Vercel will use with IAM auth tokens."
  type        = string
  default     = "app_user"
}

variable "runner_security_group_id" {
  description = "Security group ID of the self-hosted GHA runner (from bootstrap). When set, an ingress rule is added to the DB SG."
  type        = string
  default     = ""
}
