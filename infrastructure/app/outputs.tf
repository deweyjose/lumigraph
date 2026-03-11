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

output "download_zip_lambda_arn" {
  description = "ARN of the ZIP export Lambda used by integration set download jobs."
  value       = local.effective_download_zip_lambda_arn
}

output "download_zip_lambda_name" {
  description = "Name of the managed ZIP export Lambda, or null when using an external ARN."
  value       = local.create_download_zip_lambda ? aws_lambda_function.download_zip[0].function_name : null
}

output "auto_thumb_lambda_arn" {
  description = "ARN of the managed auto-thumb Lambda used by final image thumbnail jobs."
  value       = aws_lambda_function.auto_thumb.arn
}

output "auto_thumb_lambda_name" {
  description = "Name of the managed auto-thumb Lambda."
  value       = aws_lambda_function.auto_thumb.function_name
}
