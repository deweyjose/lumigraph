#!/bin/sh
set -eu

BUCKET="${LOCALSTACK_S3_BUCKET:-lumigraph-dev-local}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

awslocal --region "$REGION" s3 mb "s3://$BUCKET" 2>/dev/null || true
awslocal --region "$REGION" s3api put-bucket-cors \
  --bucket "$BUCKET" \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }]
  }'

echo "Initialized S3 bucket: $BUCKET"
