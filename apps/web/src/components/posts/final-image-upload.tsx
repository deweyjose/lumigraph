"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isFinalImageS3Key } from "@/lib/image-url";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ACCEPT = ".jpg,.jpeg,.png,.webp";

function mapFileToContentType(
  file: File
): (typeof ALLOWED_TYPES)[number] | null {
  if (ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number]))
    return file.type as (typeof ALLOWED_TYPES)[number];
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
  currentImageKey: string | null;
  currentThumbKey: string | null;
  className?: string;
};

export function FinalImageUpload({
  postId,
  currentImageKey,
  currentThumbKey,
  className,
}: FinalImageUploadProps) {
  const router = useRouter();
  const [imageStatus, setImageStatus] = useState<SlotStatus>("idle");
  const [thumbStatus, setThumbStatus] = useState<SlotStatus>("idle");
  const [imageError, setImageError] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const hasImage = isFinalImageS3Key(currentImageKey);
  const hasThumb = isFinalImageS3Key(currentThumbKey);

  const uploadFile = useCallback(
    async (file: File, role: UploadSlot) => {
      const contentType = mapFileToContentType(file);
      if (!contentType) {
        const setError = role === "image" ? setImageError : setThumbError;
        setError("Use JPEG, PNG, or WebP.");
        return;
      }
      const setStatus = role === "image" ? setImageStatus : setThumbStatus;
      const setError = role === "image" ? setImageError : setThumbError;
      setError(null);
      setStatus("uploading");

      try {
        const presignRes = await fetch(
          `/api/image-posts/${postId}/final-image/presign`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType,
              contentLength: file.size,
            }),
          }
        );
        if (!presignRes.ok) {
          const data = await presignRes.json().catch(() => ({}));
          throw new Error(
            data.message ?? `Presign failed: ${presignRes.status}`
          );
        }
        const { uploadUrl, key } = (await presignRes.json()) as {
          uploadUrl: string;
          key: string;
        };

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": contentType },
        });
        if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);

        const completeRes = await fetch(
          `/api/image-posts/${postId}/final-image/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, role }),
          }
        );
        if (!completeRes.ok) {
          const data = await completeRes.json().catch(() => ({}));
          throw new Error(
            data.message ?? `Complete failed: ${completeRes.status}`
          );
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

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) uploadFile(file, "image");
    },
    [uploadFile]
  );

  const handleThumbChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) uploadFile(file, "thumb");
    },
    [uploadFile]
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
        Upload the main image and an optional thumbnail for cards.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-background p-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Main image
          </h3>
          {hasImage ? (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Image set
            </p>
          ) : null}
          <input
            ref={imageInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={handleImageChange}
            aria-label="Choose main image (JPEG, PNG, WebP)"
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
                Uploading…
              </>
            ) : imageStatus === "done" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />
                Done
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" aria-hidden />
                {hasImage ? "Replace" : "Upload"}
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
            Thumbnail (optional)
          </h3>
          {hasThumb ? (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Thumbnail set
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Used on cards and lists
            </p>
          )}
          <input
            ref={thumbInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={handleThumbChange}
            aria-label="Choose thumbnail (JPEG, PNG, WebP)"
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
                Uploading…
              </>
            ) : thumbStatus === "done" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />
                Done
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" aria-hidden />
                {hasThumb ? "Replace" : "Upload"}
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
