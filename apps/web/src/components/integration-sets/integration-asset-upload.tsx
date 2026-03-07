"use client";

import {
  type ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Upload, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type UploadEntry = {
  clientId: string;
  file: File;
  relativePath: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

type AssetRow = {
  id: string;
  relativePath: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: "INTEGRATION" | "FINAL_IMAGE" | "FINAL_THUMB";
  createdAt: string;
};

type Props = {
  integrationSetId: string;
  assets: AssetRow[];
};

type BatchPresignResult =
  | {
      clientId: string;
      ok: true;
      assetId: string;
      uploadUrl: string;
      s3Key: string;
    }
  | {
      clientId: string;
      ok: false;
      error: string;
    };

type BatchCompleteResult =
  | {
      clientId: string;
      ok: true;
      assetId: string;
      status: string;
    }
  | {
      clientId: string;
      ok: false;
      error: string;
    };

function buildTree(paths: string[]) {
  const root: Record<string, unknown> = {};
  for (const path of paths) {
    const parts = path.split("/").filter(Boolean);
    let cursor: Record<string, unknown> = root;
    for (const part of parts) {
      if (!cursor[part]) cursor[part] = {};
      cursor = cursor[part] as Record<string, unknown>;
    }
  }
  return root;
}

function renderTree(
  node: Record<string, unknown>,
  prefix = ""
): ReactElement[] {
  return Object.keys(node)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => {
      const value = node[key] as Record<string, unknown>;
      const full = prefix ? `${prefix}/${key}` : key;
      const childKeys = Object.keys(value);
      return (
        <li key={full} className="ml-4 list-disc">
          <span className="font-mono text-sm">{key}</span>
          {childKeys.length > 0 && (
            <ul className="mt-1">{renderTree(value, full)}</ul>
          )}
        </li>
      );
    });
}

function getContentType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".fit") || name.endsWith(".fits")) return "image/fits";
  if (name.endsWith(".zip")) return "application/zip";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export function IntegrationAssetUpload({ integrationSetId, assets }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const tree = useMemo(
    () => buildTree(assets.map((asset) => asset.relativePath)),
    [assets]
  );

  const addFiles = useCallback(
    (files: FileList | null, fromFolder: boolean) => {
      if (!files || files.length === 0) return;
      const next: UploadEntry[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath =
          fromFolder && file.webkitRelativePath
            ? file.webkitRelativePath
            : file.name;
        next.push({
          clientId: `${Date.now()}-${i}-${Math.random()}`,
          file,
          relativePath,
          status: "pending",
        });
      }
      setEntries((prev) => [...prev, ...next]);
    },
    []
  );

  const uploadAll = useCallback(async () => {
    const pending = entries.filter((entry) => entry.status === "pending");
    if (pending.length === 0) return;
    setIsUploading(true);
    try {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.status === "pending"
            ? { ...entry, status: "uploading" as const }
            : entry
        )
      );

      const presignRes = await fetch("/api/uploads/presign-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: pending.map((entry) => ({
            clientId: entry.clientId,
            kind: "INTEGRATION",
            integrationSetId,
            relativePath: entry.relativePath,
            contentType: getContentType(entry.file),
            contentLength: entry.file.size,
          })),
        }),
      });
      const presignData = (await presignRes.json()) as {
        message?: string;
        results: BatchPresignResult[];
      };
      if (!presignRes.ok)
        throw new Error(presignData.message ?? "Presign failed");

      const map = new Map<
        string,
        { ok: boolean; uploadUrl?: string; assetId?: string; error?: string }
      >(presignData.results.map((result) => [result.clientId, result]));

      const completeItems: Array<{
        clientId: string;
        assetId: string;
        sizeBytes: number;
      }> = [];

      for (const entry of pending) {
        const item = map.get(entry.clientId);
        if (!item || !item.ok || !item.uploadUrl || !item.assetId) {
          setEntries((prev) =>
            prev.map((existing) =>
              existing.clientId === entry.clientId
                ? {
                    ...existing,
                    status: "error" as const,
                    error: item?.error ?? "Presign failed",
                  }
                : existing
            )
          );
          continue;
        }
        const uploadRes = await fetch(item.uploadUrl, {
          method: "PUT",
          body: entry.file,
          headers: { "Content-Type": getContentType(entry.file) },
        });
        if (!uploadRes.ok) {
          setEntries((prev) =>
            prev.map((existing) =>
              existing.clientId === entry.clientId
                ? {
                    ...existing,
                    status: "error" as const,
                    error: "Upload failed",
                  }
                : existing
            )
          );
          continue;
        }
        completeItems.push({
          clientId: entry.clientId,
          assetId: item.assetId,
          sizeBytes: entry.file.size,
        });
      }

      if (completeItems.length > 0) {
        const completeRes = await fetch("/api/uploads/complete-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: completeItems }),
        });
        const completeData = (await completeRes.json()) as {
          message?: string;
          results: BatchCompleteResult[];
        };
        if (!completeRes.ok) {
          throw new Error(completeData.message ?? "Complete failed");
        }
        const doneMap = new Map<string, { ok: boolean; error?: string }>(
          completeData.results.map((result) => [result.clientId, result])
        );
        setEntries((prev) =>
          prev.map((entry) => {
            const done = doneMap.get(entry.clientId);
            if (!done) return entry;
            if (!done.ok) {
              return {
                ...entry,
                status: "error" as const,
                error: done.error ?? "Complete failed",
              };
            }
            return { ...entry, status: "done" as const, error: undefined };
          })
        );
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setEntries((prev) =>
        prev.map((entry) =>
          entry.status === "uploading"
            ? { ...entry, status: "error" as const, error: message }
            : entry
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [entries, integrationSetId, router]);

  const topFolders = useMemo(() => {
    const map = new Map<string, number>();
    for (const asset of assets) {
      const top = asset.relativePath.split("/")[0] ?? asset.relativePath;
      map.set(top, (map.get(top) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [assets]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files, false);
            e.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files, true);
            e.target.value = "";
          }}
          {...({ webkitdirectory: "" } as Record<string, string>)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" /> Add files
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => folderInputRef.current?.click()}
          className="gap-2"
        >
          <FolderOpen className="h-4 w-4" /> Add folder
        </Button>
        <Button
          type="button"
          onClick={() => void uploadAll()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload queued files"
          )}
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="rounded border p-3">
          <h3 className="mb-2 text-sm font-semibold">Upload queue</h3>
          <ul className="space-y-1 text-sm">
            {entries.map((entry) => (
              <li
                key={entry.clientId}
                className="flex items-center justify-between"
              >
                <span className="font-mono">{entry.relativePath}</span>
                <span className="text-muted-foreground">
                  {entry.status}
                  {entry.error ? ` (${entry.error})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border p-3">
          <h3 className="mb-2 text-sm font-semibold">Top folders</h3>
          <ul className="space-y-1 text-sm">
            {topFolders.map(([name, count]) => (
              <li key={name} className="flex justify-between">
                <span className="font-mono">{name}</span>
                <span className="text-muted-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded border p-3">
          <h3 className="mb-2 text-sm font-semibold">Folder tree</h3>
          <ul>{renderTree(tree)}</ul>
        </div>
      </div>

      <div className="rounded border p-3">
        <h3 className="mb-2 text-sm font-semibold">Files</h3>
        <ul className="space-y-1 text-sm">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate font-mono">{asset.relativePath}</span>
              <a
                href={`/api/assets/${asset.id}/download`}
                className="text-primary hover:underline"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
