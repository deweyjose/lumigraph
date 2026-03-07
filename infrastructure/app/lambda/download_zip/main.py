import hashlib
import hmac
import json
import logging
import os
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

import boto3

LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

S3 = boto3.client("s3")
CHUNK_SIZE = 8 * 1024 * 1024


def _callback_secret() -> str:
    secret = os.environ.get("DOWNLOAD_CALLBACK_SECRET", "")
    if not secret:
        raise RuntimeError("DOWNLOAD_CALLBACK_SECRET is not configured")
    return secret


def _is_safe_relative_path(path: str) -> bool:
    if not isinstance(path, str):
        return False
    normalized = path.replace("\\", "/").strip()
    if not normalized or normalized.startswith("/"):
        return False
    parts = [p for p in normalized.split("/") if p]
    if not parts:
        return False
    return all(p not in (".", "..") for p in parts)


def _validate_s3_key_prefix(user_id: str, integration_set_id: str, key: str) -> bool:
    expected = f"users/{user_id}/integration-sets/{integration_set_id}/"
    return isinstance(key, str) and key.startswith(expected)


def _validate_export_key_prefix(user_id: str, integration_set_id: str, key: str) -> bool:
    expected = f"users/{user_id}/exports/integration-sets/{integration_set_id}/"
    return isinstance(key, str) and key.startswith(expected)


def _sign_payload(secret: str, timestamp: str, body: str) -> str:
    msg = f"{timestamp}.{body}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def _send_callback(callback_url: str, payload: dict) -> None:
    secret = _callback_secret()
    body = json.dumps(payload, separators=(",", ":"))
    timestamp = str(int(time.time()))
    signature = _sign_payload(secret, timestamp, body)

    req = urllib.request.Request(
        callback_url,
        data=body.encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-lumigraph-timestamp": timestamp,
            "x-lumigraph-signature": signature,
        },
    )

    with urllib.request.urlopen(req, timeout=15) as resp:
        status = getattr(resp, "status", 200)
        if status < 200 or status >= 300:
            raise RuntimeError(f"Callback failed with status {status}")


def _stream_s3_object_into_zip(zf: zipfile.ZipFile, bucket: str, s3_key: str, arcname: str) -> None:
    obj = S3.get_object(Bucket=bucket, Key=s3_key)
    body = obj["Body"]
    with zf.open(arcname, mode="w") as dst:
        while True:
            chunk = body.read(CHUNK_SIZE)
            if not chunk:
                break
            dst.write(chunk)


def handler(event, _context):
    LOGGER.info("download-zip event: %s", json.dumps(event))

    job_id = event.get("jobId")
    user_id = event.get("userId")
    integration_set_id = event.get("integrationSetId")
    bucket = event.get("bucket")
    output_s3_key = event.get("outputS3Key")
    files = event.get("files", [])
    callback_url = event.get("callbackUrl")

    if not all(
        isinstance(v, str) and v
        for v in [job_id, user_id, integration_set_id, bucket, output_s3_key, callback_url]
    ):
        raise ValueError("Invalid event payload")

    if not isinstance(files, list) or len(files) == 0:
        raise ValueError("files must be a non-empty list")

    if not _validate_export_key_prefix(user_id, integration_set_id, output_s3_key):
        raise ValueError("outputS3Key has invalid prefix")

    try:
        _send_callback(callback_url, {"status": "RUNNING"})
    except Exception as err:  # noqa: BLE001
        LOGGER.warning("RUNNING callback failed: %s", err)

    tmp_path = Path("/tmp") / f"{job_id}.zip"

    try:
        with zipfile.ZipFile(
            tmp_path,
            mode="w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=6,
        ) as zf:
            for file_item in files:
                relative_path = file_item.get("relativePath")
                s3_key = file_item.get("s3Key")

                if not _is_safe_relative_path(relative_path):
                    raise ValueError(f"Invalid relativePath: {relative_path!r}")
                if not _validate_s3_key_prefix(user_id, integration_set_id, s3_key):
                    raise ValueError(f"Invalid s3Key prefix: {s3_key!r}")

                _stream_s3_object_into_zip(zf, bucket, s3_key, relative_path)

        output_size_bytes = tmp_path.stat().st_size
        with tmp_path.open("rb") as stream:
            S3.put_object(
                Bucket=bucket,
                Key=output_s3_key,
                Body=stream,
                ContentType="application/zip",
                Tagging="lumigraph-kind=export",
            )

        _send_callback(
            callback_url,
            {
                "status": "READY",
                "outputS3Key": output_s3_key,
                "outputSizeBytes": output_size_bytes,
            },
        )
        return {"ok": True, "status": "READY"}

    except Exception as err:  # noqa: BLE001
        LOGGER.exception("ZIP job failed")
        message = str(err)[:1000]
        try:
            _send_callback(
                callback_url,
                {
                    "status": "FAILED",
                    "errorMessage": message,
                },
            )
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError) as cb_err:
            LOGGER.error("FAILED callback failed: %s", cb_err)
        raise

    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
