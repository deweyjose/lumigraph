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
  description = "Allowed Vercel preview origins for CORS. Default allows all *.vercel.app subdomains for presigned uploads."
  type        = list(string)
  default     = ["https://*.vercel.app"]
}

variable "allowed_vercel_prod_origins" {
  description = "Allowed Vercel production origins for CORS. Default allows all *.vercel.app subdomains."
  type        = list(string)
  default     = ["https://*.vercel.app"]
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
  description = "Maximum autoscaled storage in GB (set to allocated_storage to stay within free tier)."
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS (increases cost; set false for free tier)."
  type        = bool
  default     = false
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

variable "download_zip_lambda_arn" {
  description = "Optional external Lambda ARN used for async ZIP export jobs. If null, this stack provisions one."
  type        = string
  default     = null
}

variable "download_zip_lambda_package_path" {
  description = "Path to the ZIP package for the managed download ZIP Lambda. Built in CI and passed via TF_VAR_download_zip_lambda_package_path."
  type        = string
  default     = ""
}

variable "internal_callback_secret" {
  description = "Shared secret used by Lambda callbacks to sign status updates."
  type        = string
  default     = ""
  sensitive   = true
}

variable "vercel_automation_bypass_secret" {
  description = "Vercel deployment protection bypass secret used by Lambda callbacks to protected preview/stage URLs."
  type        = string
  default     = ""
  sensitive   = true
}

variable "download_zip_lambda_timeout_seconds" {
  description = "Timeout for the managed ZIP export Lambda."
  type        = number
  default     = 900
}

variable "download_zip_lambda_memory_mb" {
  description = "Memory size for the managed ZIP export Lambda."
  type        = number
  default     = 2048
}

variable "download_zip_lambda_reserved_concurrency" {
  description = "Reserved concurrency for the managed ZIP export Lambda. Set null to use unreserved concurrency."
  type        = number
  default     = null
}

variable "auto_thumb_lambda_package_path" {
  description = "Path to the ZIP package for the managed auto-thumb Lambda. Built in CI and passed via TF_VAR_auto_thumb_lambda_package_path."
  type        = string
  default     = ""
}

variable "auto_thumb_lambda_timeout_seconds" {
  description = "Timeout for the managed auto-thumb Lambda."
  type        = number
  default     = 300
}

variable "auto_thumb_lambda_memory_mb" {
  description = "Memory size for the managed auto-thumb Lambda."
  type        = number
  default     = 1024
}

variable "auto_thumb_lambda_reserved_concurrency" {
  description = "Reserved concurrency for the managed auto-thumb Lambda. Set null to use unreserved concurrency."
  type        = number
  default     = null
}

variable "auto_thumb_max_width" {
  description = "Maximum output width in pixels for generated thumbnails."
  type        = number
  default     = 1024
}

variable "auto_thumb_max_height" {
  description = "Maximum output height in pixels for generated thumbnails."
  type        = number
  default     = 1024
}

variable "auto_thumb_webp_quality" {
  description = "WebP quality for generated thumbnails."
  type        = number
  default     = 82
}

variable "download_exports_expiration_days" {
  description = "Expiration in days for generated export ZIP artifacts in S3."
  type        = number
  default     = 1
}
