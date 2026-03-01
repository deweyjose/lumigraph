output "role_arn" {
  description = "ARN of the GitHub Actions IAM role."
  value       = aws_iam_role.github_actions.arn
}

output "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider."
  value       = aws_iam_openid_connect_provider.github_actions.arn
}

output "tf_state_bucket_name" {
  description = "Name of the Terraform state bucket."
  value       = aws_s3_bucket.tf_state.bucket
}

output "tf_lock_table_name" {
  description = "Name of the Terraform lock table."
  value       = aws_dynamodb_table.tf_lock.name
}

output "runner_instance_id" {
  description = "EC2 instance ID of the self-hosted GHA runner."
  value       = aws_instance.gha_runner.id
}

output "runner_security_group_id" {
  description = "Security group ID of the self-hosted GHA runner (pass to app stack for DB SG ingress)."
  value       = aws_security_group.runner.id
}
