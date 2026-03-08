import hashlib
import hmac
import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

import boto3

LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

S3 = boto3.client("s3")

CHUNK_SIZE = 8 * 1024 * 1024
PART_SIZE = 16 * 1024 * 1024
MIN_MULTIPART_SIZE = 5 * 1024 * 1024
PROGRESS_FILE_STEP = 50
PROGRESS_INTERVAL_SECONDS = 5
EXPORT_OBJECT_TAGGING = "lumigraph-kind=export"


def _callback_secret() -> str:
    secret = os.environ.get("DOWNLOAD_CALLBACK_SECRET", "").strip()
    if not secret:
        raise RuntimeError("DOWNLOAD_CALLBACK_SECRET is not configured")
    return secret


def _vercel_automation_bypass_secret() -> str | None:
    secret = os.environ.get("VERCEL_AUTOMATION_BYPASS_SECRET", "").strip()
    return secret or None


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


def _send_callback(callback_url: str, payload: dict, bypass_token: str | None = None) -> None:
    secret = _callback_secret()
    body = json.dumps(payload, separators=(",", ":"))
    timestamp = str(int(time.time()))
    signature = _sign_payload(secret, timestamp, body)

    parsed = urllib.parse.urlsplit(callback_url)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    query.extend([("ts", timestamp), ("sig", signature)])
    if isinstance(bypass_token, str) and bypass_token:
        query.append(("x-vercel-protection-bypass", bypass_token))
    callback_url_with_sig = urllib.parse.urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urllib.parse.urlencode(query),
            parsed.fragment,
        )
    )

    headers = {
        "Content-Type": "application/json",
        "x-lumigraph-timestamp": timestamp,
        "x-lumigraph-signature": signature,
    }
    if isinstance(bypass_token, str) and bypass_token:
        headers["x-vercel-protection-bypass"] = bypass_token

    req = urllib.request.Request(
        callback_url_with_sig,
        data=body.encode("utf-8"),
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = getattr(resp, "status", 200)
            if status < 200 or status >= 300:
                raise RuntimeError(f"Callback failed with status {status}")
    except urllib.error.HTTPError as err:
        body_preview = ""
        try:
            body_preview = err.read().decode("utf-8", errors="replace")[:1000]
        except Exception:  # noqa: BLE001
            body_preview = "<unreadable>"
        safe_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
        LOGGER.error(
            "callback http error status=%s url=%s body=%s",
            err.code,
            safe_url,
            body_preview,
        )
        raise


def _send_running_progress_callback(
    callback_url: str,
    total_files: int,
    completed_files: int,
    bypass_token: str | None,
) -> None:
    try:
        _send_callback(
            callback_url,
            {
                "status": "RUNNING",
                "totalFiles": total_files,
                "completedFiles": completed_files,
            },
            bypass_token,
        )
    except Exception as err:  # noqa: BLE001
        LOGGER.warning("RUNNING progress callback failed: %s", err)


class MultipartUploadSink:
    def __init__(
        self,
        s3_client,
        bucket: str,
        key: str,
        part_size: int = PART_SIZE,
        content_type: str = "application/zip",
        tagging: str = EXPORT_OBJECT_TAGGING,
    ):
        if part_size < MIN_MULTIPART_SIZE:
            raise ValueError("part_size must be at least 5MB for multipart upload")

        self._s3 = s3_client
        self._bucket = bucket
        self._key = key
        self._part_size = part_size
        self._parts = []
        self._buffer = bytearray()
        self._part_number = 1
        self._position = 0
        self._completed = False
        self._aborted = False
        self._upload_id = self._s3.create_multipart_upload(
            Bucket=bucket,
            Key=key,
            ContentType=content_type,
            Tagging=tagging,
        )["UploadId"]

    def writable(self) -> bool:
        return True

    def seekable(self) -> bool:
        return False

    def tell(self) -> int:
        return self._position

    def write(self, data) -> int:
        if self._completed or self._aborted:
            raise RuntimeError("Cannot write to closed multipart sink")
        if not data:
            return 0

        chunk = bytes(data)
        self._buffer.extend(chunk)
        self._position += len(chunk)

        while len(self._buffer) >= self._part_size:
            payload = bytes(self._buffer[: self._part_size])
            del self._buffer[: self._part_size]
            self._upload_part(payload)
        return len(chunk)

    def flush(self) -> None:
        return None

    def close(self) -> None:
        return None

    def _upload_part(self, payload: bytes) -> None:
        response = self._s3.upload_part(
            Bucket=self._bucket,
            Key=self._key,
            UploadId=self._upload_id,
            PartNumber=self._part_number,
            Body=payload,
        )
        self._parts.append({"ETag": response["ETag"], "PartNumber": self._part_number})
        self._part_number += 1

    def complete(self) -> int:
        if self._aborted:
            raise RuntimeError("Cannot complete aborted multipart upload")
        if self._completed:
            return self._position

        if self._buffer:
            self._upload_part(bytes(self._buffer))
            self._buffer.clear()

        self._s3.complete_multipart_upload(
            Bucket=self._bucket,
            Key=self._key,
            UploadId=self._upload_id,
            MultipartUpload={"Parts": self._parts},
        )
        self._completed = True
        return self._position

    def abort(self) -> None:
        if self._completed or self._aborted:
            return
        self._aborted = True
        try:
            self._s3.abort_multipart_upload(
                Bucket=self._bucket,
                Key=self._key,
                UploadId=self._upload_id,
            )
        except Exception as err:  # noqa: BLE001
            LOGGER.warning("abort_multipart_upload failed: %s", err)


def _stream_s3_object_into_zip(zf: zipfile.ZipFile, bucket: str, s3_key: str, arcname: str) -> None:
    obj = S3.get_object(Bucket=bucket, Key=s3_key)
    body = obj["Body"]
    try:
        with zf.open(arcname, mode="w") as dst:
            while True:
                chunk = body.read(CHUNK_SIZE)
                if not chunk:
                    break
                dst.write(chunk)
    finally:
        body.close()


def handler(event, _context):
    job_id = event.get("jobId")
    user_id = event.get("userId")
    integration_set_id = event.get("integrationSetId")
    bucket = event.get("bucket")
    output_s3_key = event.get("outputS3Key")
    files = event.get("files", [])
    callback_url = event.get("callbackUrl")
    callback_bypass_token = _vercel_automation_bypass_secret()

    LOGGER.info(
        "download-zip start job_id=%s user_id=%s integration_set_id=%s file_count=%s has_bypass_token=%s",
        job_id,
        user_id,
        integration_set_id,
        len(files) if isinstance(files, list) else "invalid",
        bool(callback_bypass_token),
    )

    if not all(
        isinstance(v, str) and v
        for v in [job_id, user_id, integration_set_id, bucket, output_s3_key, callback_url]
    ):
        raise ValueError("Invalid event payload")
    if not isinstance(files, list) or len(files) == 0:
        raise ValueError("files must be a non-empty list")

    if not _validate_export_key_prefix(user_id, integration_set_id, output_s3_key):
        raise ValueError("outputS3Key has invalid prefix")

    total_files = len(files)
    completed_files = 0
    last_progress_sent_at = 0.0
    sink = MultipartUploadSink(S3, bucket, output_s3_key)

    _send_running_progress_callback(
        callback_url,
        total_files,
        completed_files,
        callback_bypass_token,
    )
    last_progress_sent_at = time.monotonic()

    try:
        with zipfile.ZipFile(
            sink,
            mode="w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=6,
            allowZip64=True,
        ) as zf:
            for file_item in files:
                relative_path = file_item.get("relativePath")
                s3_key = file_item.get("s3Key")

                if not _is_safe_relative_path(relative_path):
                    raise ValueError(f"Invalid relativePath: {relative_path!r}")
                if not _validate_s3_key_prefix(user_id, integration_set_id, s3_key):
                    raise ValueError(f"Invalid s3Key prefix: {s3_key!r}")

                _stream_s3_object_into_zip(zf, bucket, s3_key, relative_path)
                completed_files += 1

                now = time.monotonic()
                should_send_progress = (
                    completed_files % PROGRESS_FILE_STEP == 0
                    or now - last_progress_sent_at >= PROGRESS_INTERVAL_SECONDS
                    or completed_files == total_files
                )
                if should_send_progress:
                    _send_running_progress_callback(
                        callback_url,
                        total_files,
                        completed_files,
                        callback_bypass_token,
                    )
                    last_progress_sent_at = now

        output_size_bytes = sink.complete()
        _send_callback(
            callback_url,
            {
                "status": "READY",
                "outputS3Key": output_s3_key,
                "outputSizeBytes": output_size_bytes,
            },
            callback_bypass_token,
        )
        return {"ok": True, "status": "READY"}

    except Exception as err:  # noqa: BLE001
        sink.abort()
        LOGGER.exception("ZIP job failed")
        message = str(err)[:1000]
        try:
            _send_callback(
                callback_url,
                {
                    "status": "FAILED",
                    "errorMessage": message,
                },
                callback_bypass_token,
            )
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError) as cb_err:
            LOGGER.error("FAILED callback failed: %s", cb_err)
        raise
