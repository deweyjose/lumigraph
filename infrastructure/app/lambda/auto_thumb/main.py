import hashlib
import hmac
import io
import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request

import boto3
from botocore.config import Config

LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

DEFAULT_MAX_WIDTH = 1024
DEFAULT_MAX_HEIGHT = 1024
DEFAULT_WEBP_QUALITY = 82


def _load_checksum_mode(name: str) -> str | None:
    value = os.environ.get(name, "").strip().lower()
    if value in {"when_supported", "when_required"}:
        return value
    return None


def _build_s3_client():
    config_kwargs = {}
    request_mode = _load_checksum_mode("AWS_REQUEST_CHECKSUM_CALCULATION")
    response_mode = _load_checksum_mode("AWS_RESPONSE_CHECKSUM_VALIDATION")
    if request_mode:
        config_kwargs["request_checksum_calculation"] = request_mode
    if response_mode:
        config_kwargs["response_checksum_validation"] = response_mode
    if config_kwargs:
        return boto3.client("s3", config=Config(**config_kwargs))
    return boto3.client("s3")


S3 = _build_s3_client()


def _callback_secret() -> str:
    secret = os.environ.get("INTERNAL_CALLBACK_SECRET", "").strip()
    if not secret:
        raise RuntimeError("INTERNAL_CALLBACK_SECRET is not configured")
    return secret


def _vercel_automation_bypass_secret() -> str | None:
    secret = os.environ.get("VERCEL_AUTOMATION_BYPASS_SECRET", "").strip()
    return secret or None


def _parse_positive_int(raw: object, fallback: int) -> int:
    if isinstance(raw, int) and raw > 0:
        return raw
    if isinstance(raw, str):
        candidate = raw.strip()
        if candidate:
            try:
                value = int(candidate)
                if value > 0:
                    return value
            except ValueError:
                pass
    return fallback


def _max_width(event: dict) -> int:
    event_value = event.get("maxWidth")
    env_value = os.environ.get("AUTO_THUMB_MAX_WIDTH")
    return _parse_positive_int(event_value if event_value is not None else env_value, DEFAULT_MAX_WIDTH)


def _max_height(event: dict) -> int:
    event_value = event.get("maxHeight")
    env_value = os.environ.get("AUTO_THUMB_MAX_HEIGHT")
    return _parse_positive_int(event_value if event_value is not None else env_value, DEFAULT_MAX_HEIGHT)


def _webp_quality(event: dict) -> int:
    event_value = event.get("webpQuality")
    env_value = os.environ.get("AUTO_THUMB_WEBP_QUALITY")
    quality = _parse_positive_int(event_value if event_value is not None else env_value, DEFAULT_WEBP_QUALITY)
    return max(1, min(100, quality))


def _validate_source_key_prefix(user_id: str, post_id: str, key: str) -> bool:
    expected = f"users/{user_id}/posts/{post_id}/final/"
    return isinstance(key, str) and key.startswith(expected)


def _validate_output_key_prefix(user_id: str, post_id: str, key: str) -> bool:
    expected = f"users/{user_id}/posts/{post_id}/final/thumbs/"
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
    with urllib.request.urlopen(req, timeout=15) as resp:
        status = getattr(resp, "status", 200)
        if status < 200 or status >= 300:
            raise RuntimeError(f"Callback failed with status {status}")


def _send_running_callback(callback_url: str, bypass_token: str | None) -> None:
    try:
        _send_callback(
            callback_url,
            {
                "status": "RUNNING",
            },
            bypass_token,
        )
    except Exception as err:  # noqa: BLE001
        LOGGER.warning("RUNNING callback failed: %s", err)


def _create_thumbnail(source: bytes, max_width: int, max_height: int, webp_quality: int) -> bytes:
    try:
        from PIL import Image, UnidentifiedImageError
    except Exception as err:  # noqa: BLE001
        LOGGER.warning("Pillow not available, writing passthrough bytes as fallback thumbnail: %s", err)
        return source

    try:
        with Image.open(io.BytesIO(source)) as image:
            image = image.convert("RGB")
            resampling_module = getattr(Image, "Resampling", Image)
            image.thumbnail((max_width, max_height), resampling_module.LANCZOS)
            out = io.BytesIO()
            image.save(out, format="WEBP", quality=webp_quality, method=6)
            return out.getvalue()
    except UnidentifiedImageError as err:
        raise RuntimeError("Unsupported source image format") from err


def _read_source_object(bucket: str, key: str) -> bytes:
    response = S3.get_object(Bucket=bucket, Key=key)
    body = response["Body"]
    try:
        return body.read()
    finally:
        body.close()


def handler(event, _context):
    job_id = event.get("jobId")
    user_id = event.get("userId")
    post_id = event.get("postId")
    bucket = event.get("bucket")
    source_object_key = event.get("sourceObjectKey")
    output_thumb_key = event.get("outputThumbKey")
    callback_url = event.get("callbackUrl")

    LOGGER.info(
        "auto-thumb start job_id=%s user_id=%s post_id=%s",
        job_id,
        user_id,
        post_id,
    )

    if not all(
        isinstance(v, str) and v
        for v in [job_id, user_id, post_id, bucket, source_object_key, output_thumb_key, callback_url]
    ):
        raise ValueError("Invalid event payload")

    if not _validate_source_key_prefix(user_id, post_id, source_object_key):
        raise ValueError("sourceObjectKey has invalid prefix")

    if not _validate_output_key_prefix(user_id, post_id, output_thumb_key):
        raise ValueError("outputThumbKey has invalid prefix")

    bypass_token = _vercel_automation_bypass_secret()
    _send_running_callback(callback_url, bypass_token)

    try:
        source = _read_source_object(bucket, source_object_key)
        thumb = _create_thumbnail(
            source,
            _max_width(event),
            _max_height(event),
            _webp_quality(event),
        )

        S3.put_object(
            Bucket=bucket,
            Key=output_thumb_key,
            Body=thumb,
            ContentType="image/webp",
        )

        try:
            _send_callback(
                callback_url,
                {
                    "status": "READY",
                    "outputThumbKey": output_thumb_key,
                },
                bypass_token,
            )
        except Exception as cb_err:  # noqa: BLE001
            LOGGER.warning("READY callback failed: %s", cb_err)

        return {
            "ok": True,
            "jobId": job_id,
            "outputThumbKey": output_thumb_key,
            "outputSizeBytes": len(thumb),
        }
    except Exception as err:  # noqa: BLE001
        message = str(err).strip()[:1000] or "Auto-thumb generation failed"
        try:
            _send_callback(
                callback_url,
                {
                    "status": "FAILED",
                    "errorMessage": message,
                },
                bypass_token,
            )
        except Exception as cb_err:  # noqa: BLE001
            LOGGER.error("FAILED callback failed: %s", cb_err)

        return {
            "ok": False,
            "jobId": job_id,
            "errorMessage": message,
        }
