#!/bin/sh
set -eu

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
LAMBDA_NAME="${LOCALSTACK_DOWNLOAD_ZIP_LAMBDA_NAME:-lumigraph-download-zip-local}"
CALLBACK_SECRET="${LOCALSTACK_DOWNLOAD_CALLBACK_SECRET:-lumigraph-local-callback-secret}"
BYPASS_SECRET="${LOCALSTACK_VERCEL_AUTOMATION_BYPASS_SECRET:-}"
LAMBDA_SOURCE_DIR="/opt/lumigraph/lambda/download_zip"
ZIP_PATH="/tmp/${LAMBDA_NAME}.zip"
ENV_JSON_PATH="/tmp/${LAMBDA_NAME}-env.json"
ROLE_ARN="arn:aws:iam::000000000000:role/${LAMBDA_NAME}"

if [ ! -f "${LAMBDA_SOURCE_DIR}/main.py" ]; then
  echo "Lambda source missing at ${LAMBDA_SOURCE_DIR}/main.py" >&2
  exit 1
fi

export LAMBDA_SOURCE_DIR ZIP_PATH
python3 - <<'PY'
import os
import zipfile

source_dir = os.environ["LAMBDA_SOURCE_DIR"]
zip_path = os.environ["ZIP_PATH"]

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(source_dir, "main.py"), arcname="main.py")
PY

export CALLBACK_SECRET BYPASS_SECRET ENV_JSON_PATH
python3 - <<'PY'
import json
import os

variables = {"DOWNLOAD_CALLBACK_SECRET": os.environ["CALLBACK_SECRET"]}
variables["AWS_REQUEST_CHECKSUM_CALCULATION"] = "when_required"
variables["AWS_RESPONSE_CHECKSUM_VALIDATION"] = "when_required"
bypass = os.environ.get("BYPASS_SECRET", "").strip()
if bypass:
    variables["VERCEL_AUTOMATION_BYPASS_SECRET"] = bypass

with open(os.environ["ENV_JSON_PATH"], "w", encoding="utf-8") as f:
    json.dump({"Variables": variables}, f)
PY

if awslocal --region "${REGION}" lambda get-function --function-name "${LAMBDA_NAME}" >/dev/null 2>&1; then
  awslocal --region "${REGION}" lambda update-function-code \
    --function-name "${LAMBDA_NAME}" \
    --zip-file "fileb://${ZIP_PATH}" >/dev/null
  awslocal --region "${REGION}" lambda update-function-configuration \
    --function-name "${LAMBDA_NAME}" \
    --environment "file://${ENV_JSON_PATH}" \
    --timeout 900 \
    --memory-size 2048 >/dev/null
  echo "Updated LocalStack Lambda: ${LAMBDA_NAME}"
else
  awslocal --region "${REGION}" lambda create-function \
    --function-name "${LAMBDA_NAME}" \
    --runtime python3.12 \
    --role "${ROLE_ARN}" \
    --handler main.handler \
    --zip-file "fileb://${ZIP_PATH}" \
    --environment "file://${ENV_JSON_PATH}" \
    --timeout 900 \
    --memory-size 2048 >/dev/null
  echo "Created LocalStack Lambda: ${LAMBDA_NAME}"
fi

awslocal --region "${REGION}" lambda wait function-active-v2 --function-name "${LAMBDA_NAME}"
echo "LocalStack Lambda is active: ${LAMBDA_NAME}"
