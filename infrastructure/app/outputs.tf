output "artifacts_bucket_name" {
  description = "Name of the artifacts bucket."
  value       = aws_s3_bucket.artifacts.bucket
}

output "artifacts_bucket_arn" {
  description = "ARN of the artifacts bucket."
  value       = aws_s3_bucket.artifacts.arn
}

output "db_instance_endpoint" {
  description = "RDS instance endpoint hostname."
  value       = aws_db_instance.main.address
}

output "db_instance_port" {
  description = "RDS instance port."
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Database name."
  value       = var.db_name
}

output "db_master_username" {
  description = "Master database username."
  value       = var.db_master_username
}

output "db_iam_app_username" {
  description = "Application IAM-auth DB username."
  value       = var.db_iam_app_username
}

output "vercel_db_connect_role_arn" {
  description = "IAM role ARN for Vercel OIDC to connect via IAM DB auth."
  value       = aws_iam_role.vercel_db_connect.arn
}

output "vercel_oidc_provider_arn" {
  description = "OIDC provider ARN for Vercel team tokens."
  value       = aws_iam_openid_connect_provider.vercel.arn
}
