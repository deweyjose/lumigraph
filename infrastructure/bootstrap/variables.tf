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
  description = "Environment name used in resource naming."
  type        = string
  default     = "prod"
}

variable "name_suffix" {
  description = "Optional suffix for globally-unique naming. UUID-safe values recommended."
  type        = string
  default     = "main"
}

variable "state_bucket_name" {
  description = "Override the Terraform state bucket name."
  type        = string
  default     = null
}

variable "lock_table_name" {
  description = "Override the Terraform lock table name."
  type        = string
  default     = null
}

variable "github_repo_owner" {
  description = "GitHub org/user that owns the repo."
  type        = string
  default     = "deweyjose"
}

variable "github_repo_name" {
  description = "GitHub repo name."
  type        = string
  default     = "lumigraph"
}

variable "github_subjects" {
  description = "OIDC subject patterns allowed to assume the GitHub Actions role."
  type        = list(string)
  default     = ["repo:deweyjose/lumigraph:ref:refs/heads/main"]
}
