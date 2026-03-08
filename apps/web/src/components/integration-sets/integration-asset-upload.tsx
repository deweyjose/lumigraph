"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type NodeApi, type NodeRendererProps, Tree } from "react-arborist";
import {
  Upload,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Folder,
  File,
  ChevronRight,
  Download,
  Archive,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const EXPORT_POLL_INTERVAL_MS = 5000;

type UploadEntry = {
  clientId: string;
  file: File;
  relativePath: string;
  status: "pending" | "uploading" | "uploaded" | "error";
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

type DownloadJobRow = {
  id: string;
  status: "PENDING" | "RUNNING" | "READY" | "FAILED" | "CANCELLED";
  selectedPaths: string[];
  totalFiles: number | null;
  completedFiles: number;
  lastProgressAt: string | null;
  outputS3Key: string | null;
  outputSizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  downloadUrl?: string;
  isExpired?: boolean;
};

type Props = {
  integrationSetId: string;
  assets: AssetRow[];
  downloadJobs: DownloadJobRow[];
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

type ExplorerFileNode = {
  id: string;
  kind: "file";
  name: string;
  path: string;
  assetId: string;
  sizeBytes: number;
};

type ExplorerFolderNode = {
  id: string;
  kind: "folder";
  name: string;
  path: string;
  children: ExplorerNode[];
};

type ExplorerNode = ExplorerFileNode | ExplorerFolderNode;

type BuilderFolder = {
  name: string;
  path: string;
  folders: Map<string, BuilderFolder>;
  files: ExplorerFileNode[];
};

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

function isIgnoredUploadPath(relativePath: string): boolean {
  const parts = relativePath.split("/").filter(Boolean);
  return parts.some((part) => part.toLowerCase() === ".ds_store");
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = value;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function buildTreeNodes(assets: AssetRow[]): ExplorerNode[] {
  const root: BuilderFolder = {
    name: "",
    path: "",
    folders: new Map(),
    files: [],
  };

  for (const asset of assets) {
    const parts = asset.relativePath.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let cursor = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]!;
      const currentPath = parts.slice(0, i + 1).join("/");
      const isFile = i === parts.length - 1;

      if (isFile) {
        cursor.files.push({
          id: `file:${asset.id}`,
          kind: "file",
          name: part,
          path: asset.relativePath,
          assetId: asset.id,
          sizeBytes: asset.sizeBytes,
        });
        continue;
      }

      let folder = cursor.folders.get(part);
      if (!folder) {
        folder = {
          name: part,
          path: currentPath,
          folders: new Map(),
          files: [],
        };
        cursor.folders.set(part, folder);
      }
      cursor = folder;
    }
  }

  const toNodes = (folder: BuilderFolder): ExplorerNode[] => {
    const folderNodes = Array.from(folder.folders.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map<ExplorerFolderNode>((child) => ({
        id: `folder:${child.path}`,
        kind: "folder",
        name: child.name,
        path: child.path,
        children: toNodes(child),
      }));

    const fileNodes = [...folder.files]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map<ExplorerFileNode>((file) => ({ ...file }));

    return [...folderNodes, ...fileNodes];
  };

  return toNodes(root);
}

function collectNodeMap(
  nodes: ExplorerNode[],
  map = new Map<string, ExplorerNode>()
) {
  for (const node of nodes) {
    map.set(node.id, node);
    if (node.kind === "folder") collectNodeMap(node.children, map);
  }
  return map;
}

function deriveSelectedAssets(
  selectedPaths: string[],
  assets: AssetRow[]
): { fileCount: number; totalBytes: number } {
  const selected = new Set<string>();
  for (const asset of assets) {
    for (const path of selectedPaths) {
      if (
        asset.relativePath === path ||
        asset.relativePath.startsWith(`${path}/`)
      ) {
        selected.add(asset.id);
        break;
      }
    }
  }

  let totalBytes = 0;
  for (const asset of assets) {
    if (selected.has(asset.id)) totalBytes += asset.sizeBytes;
  }
  return { fileCount: selected.size, totalBytes };
}

function statusTone(status: DownloadJobRow["status"]): string {
  if (status === "READY") return "text-green-500";
  if (status === "FAILED") return "text-red-500";
  if (status === "CANCELLED") return "text-amber-500";
  if (status === "RUNNING") return "text-blue-500";
  return "text-muted-foreground";
}

function runningProgress(job: DownloadJobRow): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = Math.max(0, job.totalFiles ?? 0);
  const completed = Math.max(0, job.completedFiles);
  if (total <= 0) return { completed, total: 0, percent: 0 };
  const bounded = Math.min(completed, total);
  const percent = Math.min(100, Math.round((bounded / total) * 100));
  return { completed: bounded, total, percent };
}

function mergeJobsFromList(
  existing: DownloadJobRow[],
  incoming: DownloadJobRow[]
): DownloadJobRow[] {
  const existingById = new Map(existing.map((job) => [job.id, job]));
  const merged = incoming.map((job) => {
    const prev = existingById.get(job.id);
    if (!prev) return job;

    const shouldKeepUrl =
      job.status === "READY" && !job.downloadUrl && Boolean(prev.downloadUrl);
    return {
      ...job,
      ...(shouldKeepUrl && { downloadUrl: prev.downloadUrl }),
      ...(typeof prev.isExpired === "boolean" && { isExpired: prev.isExpired }),
    };
  });

  const incomingIds = new Set(incoming.map((job) => job.id));
  for (const prev of existing) {
    if (!incomingIds.has(prev.id)) merged.push(prev);
  }

  return merged;
}

function NodeRow({ node, style, dragHandle }: NodeRendererProps<ExplorerNode>) {
  const data = node.data;

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`flex items-center justify-between gap-2 rounded px-2 text-sm ${
        node.isSelected ? "bg-muted" : ""
      }`}
      onClick={() => node.selectMulti()}
    >
      <div className="flex min-w-0 items-center gap-2">
        {data.kind === "folder" ? (
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              node.toggle();
            }}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                node.isOpen ? "rotate-90" : ""
              }`}
            />
          </button>
        ) : (
          <span className="inline-flex h-5 w-5" />
        )}

        {data.kind === "folder" ? (
          <Folder className="h-4 w-4 text-muted-foreground" />
        ) : (
          <File className="h-4 w-4 text-muted-foreground" />
        )}

        <span className="truncate font-mono">{data.name}</span>
      </div>

      {data.kind === "file" && (
        <a
          href={`/api/assets/${data.assetId}/download`}
          className="shrink-0 text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Download
        </a>
      )}
    </div>
  );
}

export function IntegrationAssetUpload({
  integrationSetId,
  assets,
  downloadJobs,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [displayAssets, setDisplayAssets] = useState<AssetRow[]>(assets);
  const [displayJobs, setDisplayJobs] =
    useState<DownloadJobRow[]>(downloadJobs);
  const [isUploading, setIsUploading] = useState(false);
  const [isStartingExport, setIsStartingExport] = useState(false);
  const [cancelingJobIds, setCancelingJobIds] = useState<string[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [treeWidth, setTreeWidth] = useState(800);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [treeResetToken, setTreeResetToken] = useState(0);

  useEffect(() => {
    setDisplayAssets(assets);
  }, [assets]);

  useEffect(() => {
    setDisplayJobs(downloadJobs);
  }, [downloadJobs]);

  useEffect(() => {
    if (!treeContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setTreeWidth(Math.floor(width));
    });
    observer.observe(treeContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const treeData = useMemo(
    () => buildTreeNodes(displayAssets),
    [displayAssets]
  );

  const nodeMap = useMemo(() => collectNodeMap(treeData), [treeData]);

  const selectedNodes = useMemo(
    () =>
      selectedNodeIds
        .map((id) => nodeMap.get(id))
        .filter((node): node is ExplorerNode => Boolean(node)),
    [nodeMap, selectedNodeIds]
  );

  const selectedPaths = useMemo(
    () => Array.from(new Set(selectedNodes.map((node) => node.path))),
    [selectedNodes]
  );

  const selectedSummary = useMemo(
    () => deriveSelectedAssets(selectedPaths, displayAssets),
    [displayAssets, selectedPaths]
  );
  const hasActiveJobs = useMemo(
    () =>
      displayJobs.some(
        (job) => job.status === "PENDING" || job.status === "RUNNING"
      ),
    [displayJobs]
  );

  const singleSelectedFileAssetId = useMemo(() => {
    if (selectedNodes.length !== 1) return null;
    const node = selectedNodes[0];
    if (!node || node.kind !== "file") return null;
    return node.assetId;
  }, [selectedNodes]);

  const addFiles = useCallback(
    (files: FileList | null, fromFolder: boolean) => {
      if (!files || files.length === 0) return;
      const next: UploadEntry[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (!file) continue;
        const relativePath =
          fromFolder && file.webkitRelativePath
            ? file.webkitRelativePath
            : file.name;
        if (isIgnoredUploadPath(relativePath)) continue;
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

  const refreshJob = useCallback(
    async (jobId: string) => {
      const res = await fetch(
        `/api/integration-sets/${integrationSetId}/export-jobs/${jobId}`
      );
      const data = (await res.json()) as {
        job?: DownloadJobRow;
        message?: string;
      };
      if (!res.ok || !data.job) {
        throw new Error(data.message ?? "Failed to refresh export job");
      }
      setDisplayJobs((prev) =>
        prev.map((job) => (job.id === data.job?.id ? data.job : job))
      );
    },
    [integrationSetId]
  );

  const cancelJob = useCallback(
    async (jobId: string) => {
      setExportError(null);
      setCancelingJobIds((prev) =>
        prev.includes(jobId) ? prev : [...prev, jobId]
      );
      try {
        const res = await fetch(
          `/api/integration-sets/${integrationSetId}/export-jobs/${jobId}`,
          { method: "POST" }
        );
        const data = (await res.json()) as {
          job?: DownloadJobRow;
          message?: string;
        };
        if (!res.ok || !data.job) {
          throw new Error(data.message ?? "Failed to cancel export job");
        }
        setDisplayJobs((prev) =>
          prev.map((job) => (job.id === data.job!.id ? data.job! : job))
        );
      } catch (err) {
        setExportError(
          err instanceof Error ? err.message : "Failed to cancel export job"
        );
      } finally {
        setCancelingJobIds((prev) => prev.filter((id) => id !== jobId));
      }
    },
    [integrationSetId]
  );

  useEffect(() => {
    if (!hasActiveJobs) return;

    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(
          `/api/integration-sets/${integrationSetId}/export-jobs`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as { jobs?: DownloadJobRow[] };
        if (cancelled || !res.ok || !data.jobs) return;
        setDisplayJobs((prev) => mergeJobsFromList(prev, data.jobs!));
      } catch {
        return;
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const timer = setInterval(() => {
      void tick();
    }, EXPORT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hasActiveJobs, integrationSetId]);

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
      if (!presignRes.ok) {
        throw new Error(presignData.message ?? "Presign failed");
      }

      const map = new Map<
        string,
        { ok: boolean; uploadUrl?: string; assetId?: string; error?: string }
      >(presignData.results.map((result) => [result.clientId, result]));

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

        const completeRes = await fetch("/api/uploads/complete-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                clientId: entry.clientId,
                assetId: item.assetId,
                sizeBytes: entry.file.size,
              },
            ],
          }),
        });

        const completeData = (await completeRes.json()) as {
          message?: string;
          results: BatchCompleteResult[];
        };

        if (!completeRes.ok) {
          setEntries((prev) =>
            prev.map((existing) =>
              existing.clientId === entry.clientId
                ? {
                    ...existing,
                    status: "error" as const,
                    error: completeData.message ?? "Complete failed",
                  }
                : existing
            )
          );
          continue;
        }

        const done = completeData.results.find(
          (result) => result.clientId === entry.clientId
        );
        if (!done || !done.ok) {
          setEntries((prev) =>
            prev.map((existing) =>
              existing.clientId === entry.clientId
                ? {
                    ...existing,
                    status: "error" as const,
                    error: done?.error ?? "Complete failed",
                  }
                : existing
            )
          );
          continue;
        }

        setEntries((prev) =>
          prev.map((existing) =>
            existing.clientId === done.clientId
              ? { ...existing, status: "uploaded" as const, error: undefined }
              : existing
          )
        );

        const uploadedAsset: AssetRow = {
          id: done.assetId,
          relativePath: entry.relativePath,
          filename: entry.file.name,
          contentType: getContentType(entry.file),
          sizeBytes: entry.file.size,
          kind: "INTEGRATION",
          createdAt: new Date().toISOString(),
        };
        setDisplayAssets((prev) => {
          if (prev.some((asset) => asset.id === uploadedAsset.id)) return prev;
          return [...prev, uploadedAsset];
        });
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

  const startExport = useCallback(async () => {
    if (selectedPaths.length === 0) return;

    setExportError(null);
    setIsStartingExport(true);
    try {
      const res = await fetch(
        `/api/integration-sets/${integrationSetId}/export-jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedPaths }),
        }
      );
      const data = (await res.json()) as {
        message?: string;
        job?: DownloadJobRow;
      };
      if (!res.ok || !data.job) {
        throw new Error(data.message ?? "Failed to start export");
      }

      setDisplayJobs((prev) => [
        data.job!,
        ...prev.filter((job) => job.id !== data.job!.id),
      ]);
      setTreeResetToken((x) => x + 1);
      setSelectedNodeIds([]);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Failed to start export"
      );
    } finally {
      setIsStartingExport(false);
    }
  }, [integrationSetId, selectedPaths]);

  const counts = useMemo(() => {
    const result = { pending: 0, uploading: 0, uploaded: 0, error: 0 };
    for (const entry of entries) result[entry.status] += 1;
    return result;
  }, [entries]);

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
          <p className="mb-2 text-xs text-muted-foreground">
            Uploaded {counts.uploaded} / {entries.length}
            {counts.uploading > 0 ? ` • ${counts.uploading} uploading` : ""}
            {counts.error > 0 ? ` • ${counts.error} failed` : ""}
          </p>
          <ul className="space-y-1 text-sm">
            {entries.map((entry) => (
              <li
                key={entry.clientId}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate font-mono">{entry.relativePath}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {entry.status === "pending" && <Clock3 className="h-4 w-4" />}
                  {entry.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {entry.status === "uploaded" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {entry.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>
                    {entry.status === "uploaded" ? "uploaded" : entry.status}
                    {entry.error ? ` (${entry.error})` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded border p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Explorer</h3>
            <p className="text-xs text-muted-foreground">
              Selected {selectedSummary.fileCount} file
              {selectedSummary.fileCount === 1 ? "" : "s"}
              {selectedSummary.fileCount > 0
                ? ` • ${formatBytes(selectedSummary.totalBytes)}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {singleSelectedFileAssetId && (
              <Button asChild variant="outline" size="sm">
                <a href={`/api/assets/${singleSelectedFileAssetId}/download`}>
                  <Download className="mr-2 h-4 w-4" /> Download file
                </a>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTreeResetToken((x) => x + 1);
                setSelectedNodeIds([]);
              }}
            >
              Clear selection
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedPaths.length === 0 || isStartingExport}
              onClick={() => void startExport()}
            >
              {isStartingExport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting export...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" /> Export selected as ZIP
                </>
              )}
            </Button>
          </div>
        </div>

        {exportError && (
          <p className="mb-3 text-sm text-red-500" role="alert">
            {exportError}
          </p>
        )}

        <div
          ref={treeContainerRef}
          className="h-[360px] overflow-hidden rounded border"
        >
          {treeData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No files uploaded yet.
            </div>
          ) : (
            <Tree
              key={treeResetToken}
              data={treeData}
              width={treeWidth}
              height={360}
              rowHeight={32}
              indent={20}
              openByDefault={false}
              overscanCount={8}
              onSelect={(nodes: NodeApi<ExplorerNode>[]) => {
                setSelectedNodeIds(nodes.map((node) => String(node.id)));
              }}
            >
              {(props) => <NodeRow {...props} />}
            </Tree>
          )}
        </div>
      </div>

      <div className="rounded border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Exports</h3>
          <span className="text-xs text-muted-foreground">
            {displayJobs.length} jobs
          </span>
        </div>

        {displayJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exports yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {displayJobs.map((job) => {
              const progress = runningProgress(job);
              const isActive =
                job.status === "PENDING" || job.status === "RUNNING";
              const hasDeterminateProgress =
                job.status === "RUNNING" && progress.total > 0;
              const progressLabel =
                job.status === "PENDING"
                  ? "Queued - waiting for worker"
                  : hasDeterminateProgress
                    ? `${progress.completed}/${progress.total} files`
                    : `${progress.completed} files`;
              return (
                <li
                  key={job.id}
                  className="flex flex-col gap-2 rounded border p-2 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{job.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()} •{" "}
                      {job.selectedPaths.length} selected path
                      {job.selectedPaths.length === 1 ? "" : "s"}
                    </p>
                    {isActive && (
                      <div className="mt-2 max-w-sm">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{progressLabel}</span>
                          <span>
                            {hasDeterminateProgress
                              ? `${progress.percent}%`
                              : ""}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                          <div
                            className={`h-full bg-blue-500 transition-[width] duration-200 ${
                              hasDeterminateProgress ? "" : "animate-pulse"
                            }`}
                            style={{
                              width: hasDeterminateProgress
                                ? `${progress.percent}%`
                                : "35%",
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {job.errorMessage && (
                      <p className="mt-1 text-xs text-red-500">
                        {job.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-medium ${statusTone(job.status)}`}
                    >
                      {job.status}
                      {job.isExpired ? " (expired)" : ""}
                    </span>

                    {(job.status === "PENDING" || job.status === "RUNNING") && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}

                    {(job.status === "PENDING" || job.status === "RUNNING") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={cancelingJobIds.includes(job.id)}
                        onClick={() => void cancelJob(job.id)}
                      >
                        {cancelingJobIds.includes(job.id) ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Cancel
                      </Button>
                    )}

                    {job.status === "READY" && job.downloadUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={job.downloadUrl}>
                          <Download className="mr-2 h-4 w-4" /> Download ZIP
                        </a>
                      </Button>
                    ) : job.status === "READY" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void refreshJob(job.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Prepare download
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
