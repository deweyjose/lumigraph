"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Content types allowed by the presign API (must match server ALLOWED_ARTIFACT_CONTENT_TYPES). */
const ALLOWED_CONTENT_TYPES = [
  "application/zip",
  "application/x-fits",
  "image/fits",
] as const;

type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

function mapFileToContentType(file: File): AllowedContentType | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip")) return "application/zip";
  if (name.endsWith(".fits") || name.endsWith(".fit")) return "image/fits";
  if (ALLOWED_CONTENT_TYPES.includes(file.type as AllowedContentType))
    return file.type as AllowedContentType;
  return null;
}

type FileEntry = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

type DatasetArtifactUploadProps = {
  datasetId: string;
};

export function DatasetArtifactUpload({
  datasetId,
}: DatasetArtifactUploadProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setDropError(null);
    const newEntries: FileEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const contentType = mapFileToContentType(file);
      if (!contentType) {
        setDropError(
          `"${file.name}" has an unsupported type. Use .zip or .fits files.`
        );
        continue;
      }
      newEntries.push({ file, status: "pending" });
    }
    if (newEntries.length > 0) {
      setEntries((prev) => [...prev, ...newEntries]);
    }
  }, []);

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setDropError(null);
  }, []);

  const uploadOne = useCallback(
    async (entry: FileEntry, index: number): Promise<void> => {
      const contentType = mapFileToContentType(entry.file);
      if (!contentType) return;

      setEntries((prev) =>
        prev.map((e, i) =>
          i === index ? { ...e, status: "uploading" as const } : e
        )
      );

      try {
        const presignRes = await fetch(
          `/api/datasets/${datasetId}/artifacts/presign`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: entry.file.name,
              contentType,
              contentLength: entry.file.size,
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
          body: entry.file,
          headers: { "Content-Type": contentType },
        });

        if (!putRes.ok) {
          throw new Error(`Upload failed: ${putRes.status}`);
        }

        const completeRes = await fetch(
          `/api/datasets/${datasetId}/artifacts/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: entry.file.name,
              fileType: contentType,
              s3Key: key,
              sizeBytes: entry.file.size,
            }),
          }
        );

        if (!completeRes.ok) {
          const data = await completeRes.json().catch(() => ({}));
          throw new Error(
            data.message ?? `Complete failed: ${completeRes.status}`
          );
        }

        setEntries((prev) =>
          prev.map((e, i) =>
            i === index ? { ...e, status: "done" as const } : e
          )
        );
        router.refresh();
      } catch (err) {
        setEntries((prev) =>
          prev.map((e, i) =>
            i === index
              ? {
                  ...e,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : e
          )
        );
      }
    },
    [datasetId, router]
  );

  const startUploads = useCallback(() => {
    entries.forEach((entry, index) => {
      if (entry.status === "pending") {
        uploadOne(entry, index);
      }
    });
  }, [entries, uploadOne]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const hasPending = pendingCount > 0;

  return (
    <section aria-labelledby="add-files-heading">
      <h2 id="add-files-heading" className="text-lg font-semibold">
        Add files
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload integration files (FITS, .zip). Drag and drop or click to browse.
      </p>

      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("dataset-artifact-file-input")?.click();
          }
        }}
        className={cn(
          "mt-4 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
        )}
        aria-label="Add files by drag and drop or click to browse"
      >
        <input
          id="dataset-artifact-file-input"
          type="file"
          multiple
          accept=".zip,.fits,.fit,application/zip,application/x-fits,image/fits"
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm text-muted-foreground">
          Drag files here or click to select
        </p>
      </div>

      {dropError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {dropError}
        </p>
      )}

      {entries.length > 0 && (
        <ul className="mt-4 space-y-2" role="list">
          {entries.map((entry, index) => (
            <li
              key={`${entry.file.name}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3"
            >
              <span className="min-w-0 truncate font-medium">
                {entry.file.name}
              </span>
              <div className="flex items-center gap-2">
                {entry.status === "pending" && (
                  <span className="text-sm text-muted-foreground">Pending</span>
                )}
                {entry.status === "uploading" && (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                    <span className="text-sm text-muted-foreground">
                      Uploading…
                    </span>
                  </>
                )}
                {entry.status === "done" && (
                  <>
                    <CheckCircle2
                      className="h-4 w-4 text-green-600"
                      aria-hidden
                    />
                    <span className="text-sm text-green-600">Done</span>
                  </>
                )}
                {entry.status === "error" && (
                  <>
                    <AlertCircle
                      className="h-4 w-4 text-destructive"
                      aria-hidden
                    />
                    <span
                      className="text-sm text-destructive"
                      title={entry.error}
                    >
                      {entry.error}
                    </span>
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeEntry(index)}
                  aria-label={`Remove ${entry.file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasPending && (
        <Button
          type="button"
          className="mt-4"
          onClick={startUploads}
          disabled={entries.some((e) => e.status === "uploading")}
        >
          Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
        </Button>
      )}
    </section>
  );
}
