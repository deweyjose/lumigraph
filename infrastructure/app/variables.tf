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
