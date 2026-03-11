"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ACCEPT = ".jpg,.jpeg,.png,.webp";

function mapFileToContentType(
  file: File
): (typeof ALLOWED_TYPES)[number] | null {
  if (ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return file.type as (typeof ALLOWED_TYPES)[number];
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return null;
}

type UploadSlot = "image" | "thumb";
type SlotStatus = "idle" | "uploading" | "done" | "error";
type AutoThumbJobStatus =
  | "PENDING"
  | "RUNNING"
  | "READY"
  | "FAILED"
  | "CANCELLED";

type AutoThumbJobState = {
  id: string;
  status: AutoThumbJobStatus;
  attempts: number;
  errorMessage: string | null;
  updatedAt: string;
} | null;

type FinalImageUploadProps = {
  postId: string;
  currentImageAssetId: string | null;
  currentThumbAssetId: string | null;
  initialAutoThumbJob: AutoThumbJobState;
  className?: string;
};

export function FinalImageUpload({
  postId,
  currentImageAssetId,
  currentThumbAssetId,
  initialAutoThumbJob,
  className,
}: FinalImageUploadProps) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [imageStatus, setImageStatus] = useState<SlotStatus>("idle");
  const [thumbStatus, setThumbStatus] = useState<SlotStatus>("idle");
  const [imageError, setImageError] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [autoThumbJob, setAutoThumbJob] =
    useState<AutoThumbJobState>(initialAutoThumbJob);
  const [autoThumbError, setAutoThumbError] = useState<string | null>(null);
  const lastImageAssetIdRef = useRef<string | null>(currentImageAssetId);
  const lastAutoThumbStatusRef = useRef<AutoThumbJobStatus | null>(
    initialAutoThumbJob?.status ?? null
  );
  const autoThumbBusy =
    autoThumbJob?.status === "PENDING" || autoThumbJob?.status === "RUNNING";
  const showAutoThumbStatus =
    !currentThumbAssetId &&
    currentImageAssetId != null &&
    autoThumbJob != null &&
    (autoThumbBusy ||
      autoThumbJob.status === "FAILED" ||
      autoThumbJob.status === "CANCELLED");

  const uploadFile = useCallback(
    async (file: File, role: UploadSlot) => {
      const contentType = mapFileToContentType(file);
      if (!contentType) {
        (role === "image" ? setImageError : setThumbError)(
          "Use JPEG, PNG, or WebP."
        );
        return;
      }

      const setStatus = role === "image" ? setImageStatus : setThumbStatus;
      const setError = role === "image" ? setImageError : setThumbError;
      setStatus("uploading");
      setError(null);

      try {
        const relativePath = file.name;
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: role === "image" ? "FINAL_IMAGE" : "FINAL_THUMB",
            postId,
            relativePath,
            contentType,
            contentLength: file.size,
          }),
        });
        if (!presignRes.ok) {
          const data = await presignRes.json().catch(() => ({}));
          throw new Error(data.message ?? "Failed to prepare upload");
        }
        const presigned = (await presignRes.json()) as {
          assetId: string;
          uploadUrl: string;
        };

        const uploadRes = await fetch(presigned.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": contentType },
        });
        if (!uploadRes.ok) throw new Error("Upload failed");

        const completeRes = await fetch("/api/uploads/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: presigned.assetId,
            sizeBytes: file.size,
          }),
        });
        if (!completeRes.ok) {
          const data = await completeRes.json().catch(() => ({}));
          throw new Error(data.message ?? "Failed to complete upload");
        }

        const attachRes = await fetch(`/api/posts/${postId}/final-assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: presigned.assetId,
            role,
          }),
        });
        if (!attachRes.ok) {
          const data = await attachRes.json().catch(() => ({}));
          throw new Error(data.message ?? "Failed to set post image");
        }

        setStatus("done");
        router.refresh();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [postId, router]
  );

  const refreshAutoThumbJob = useCallback(async () => {
    const res = await fetch(`/api/posts/${postId}/auto-thumb`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { job: AutoThumbJobState };
    setAutoThumbJob(data.job);
  }, [postId]);

  const triggerAutoThumb = useCallback(async () => {
    setAutoThumbError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/auto-thumb`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        job?: AutoThumbJobState;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to start thumbnail generation");
      }
      setAutoThumbJob(data.job ?? null);
    } catch (err) {
      setAutoThumbError(
        err instanceof Error ? err.message : "Failed to start generation"
      );
    }
  }, [postId]);

  const cancelAutoThumb = useCallback(async () => {
    setAutoThumbError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/auto-thumb`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        job?: AutoThumbJobState;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(
          data.message ?? "Failed to cancel thumbnail generation"
        );
      }
      setAutoThumbJob(data.job ?? null);
    } catch (err) {
      setAutoThumbError(
        err instanceof Error ? err.message : "Failed to cancel generation"
      );
    }
  }, [postId]);

  useEffect(() => {
    if (!autoThumbBusy) return;
    const timer = window.setInterval(() => {
      void refreshAutoThumbJob();
    }, 2000);
    void refreshAutoThumbJob();
    return () => window.clearInterval(timer);
  }, [autoThumbBusy, refreshAutoThumbJob]);

  useEffect(() => {
    const previousStatus = lastAutoThumbStatusRef.current;
    const currentStatus = autoThumbJob?.status ?? null;
    lastAutoThumbStatusRef.current = currentStatus;
    if (currentStatus === "READY" && previousStatus !== "READY") {
      router.refresh();
    }
  }, [autoThumbJob?.status, router]);

  useEffect(() => {
    if (lastImageAssetIdRef.current === currentImageAssetId) return;
    lastImageAssetIdRef.current = currentImageAssetId;
    setAutoThumbJob(null);
    setAutoThumbError(null);
  }, [currentImageAssetId]);

  return (
    <section
      aria-labelledby="final-image-heading"
      className={cn("rounded-lg border bg-muted/20 p-4", className)}
    >
      <h2 id="final-image-heading" className="text-lg font-semibold">
        Final image
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a main image and optional thumbnail.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-background p-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Main image
          </h3>
          {currentImageAssetId && (
            <img
              src={`/api/assets/${currentImageAssetId}/view`}
              alt=""
              className="mt-2 h-24 w-full rounded border object-cover"
            />
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadFile(file, "image");
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => imageInputRef.current?.click()}
            disabled={imageStatus === "uploading"}
          >
            {imageStatus === "uploading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Uploading...
              </>
            ) : imageStatus === "done" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />
                Done
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" aria-hidden />
                {currentImageAssetId ? "Replace" : "Upload"}
              </>
            )}
          </Button>
          {imageError && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {imageError}
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-background p-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Thumbnail
          </h3>
          {currentThumbAssetId && (
            <img
              src={`/api/assets/${currentThumbAssetId}/view`}
              alt=""
              className="mt-2 h-24 w-full rounded border object-cover"
            />
          )}
          <input
            ref={thumbInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadFile(file, "thumb");
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => thumbInputRef.current?.click()}
            disabled={thumbStatus === "uploading"}
          >
            {thumbStatus === "uploading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Uploading...
              </>
            ) : thumbStatus === "done" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />
                Done
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" aria-hidden />
                {currentThumbAssetId ? "Replace" : "Upload"}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3 ml-2 gap-2"
            onClick={() => void triggerAutoThumb()}
            disabled={!currentImageAssetId || autoThumbBusy}
          >
            {autoThumbBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {autoThumbJob?.status === "PENDING"
                  ? "Queued..."
                  : "Generating..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden />
                {autoThumbJob ? "Regenerate" : "Generate"}
              </>
            )}
          </Button>
          {autoThumbBusy && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 ml-2 gap-2"
              onClick={() => void cancelAutoThumb()}
            >
              Cancel
            </Button>
          )}
          {!currentImageAssetId ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a main image before generating a thumbnail.
            </p>
          ) : showAutoThumbStatus ? (
            <p
              className={cn(
                "mt-2 flex items-center gap-1.5 text-sm",
                autoThumbJob.status === "FAILED"
                  ? "text-destructive"
                  : autoThumbJob.status === "CANCELLED"
                    ? "text-muted-foreground"
                    : autoThumbJob.status === "READY"
                      ? "text-green-700"
                      : "text-muted-foreground"
              )}
            >
              {autoThumbJob.status === "FAILED" ? (
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              ) : autoThumbBusy ? (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin"
                  aria-hidden
                />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {autoThumbJob.status === "PENDING"
                ? "Thumbnail generation queued."
                : autoThumbJob.status === "RUNNING"
                  ? "Generating thumbnail..."
                  : autoThumbJob.status === "CANCELLED"
                    ? "Thumbnail generation cancelled."
                    : autoThumbJob.status === "READY"
                      ? "Thumbnail generation finished."
                      : autoThumbJob.errorMessage ??
                        "Thumbnail generation failed."}
            </p>
          ) : null}
          {autoThumbError && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {autoThumbError}
            </p>
          )}
          {thumbError && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {thumbError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
