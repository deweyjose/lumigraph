"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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

type FinalImageUploadProps = {
  postId: string;
  currentImageAssetId: string | null;
  currentThumbAssetId: string | null;
  className?: string;
};

export function FinalImageUpload({
  postId,
  currentImageAssetId,
  currentThumbAssetId,
  className,
}: FinalImageUploadProps) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [imageStatus, setImageStatus] = useState<SlotStatus>("idle");
  const [thumbStatus, setThumbStatus] = useState<SlotStatus>("idle");
  const [imageError, setImageError] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);

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
