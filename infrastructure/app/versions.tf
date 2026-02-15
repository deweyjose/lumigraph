terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }

  # Backend config is intentionally partial. Provide bucket/table via -backend-config.
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}
