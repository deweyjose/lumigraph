export type IntegrationAssetSummaryInput = {
  relativePath: string;
  filename: string;
  contentType: string;
  sizeBytes: bigint | number;
};

export type FolderBucketSummary = {
  folder: string;
  fileCount: number;
  totalBytes: number;
  topExtensions: string[];
};

export type FileTypeSummary = {
  label: string;
  fileCount: number;
  totalBytes: number;
};

export type IntegrationInventorySummary = {
  totalFiles: number;
  totalBytes: number;
  byFolder: FolderBucketSummary[];
  byType: FileTypeSummary[];
};

function toNumber(bytes: bigint | number): number {
  return typeof bytes === "bigint" ? Number(bytes) : bytes;
}

function topFolder(relativePath: string): string {
  const trimmed = relativePath.trim();
  if (!trimmed) return "(root)";
  const i = trimmed.indexOf("/");
  return i === -1 ? "(root)" : trimmed.slice(0, i);
}

function normalizeExt(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "(no extension)";
  return base.slice(dot).toLowerCase();
}

function typeLabel(contentType: string, filename: string): string {
  const ct = contentType.trim().toLowerCase();
  if (ct && ct !== "application/octet-stream") {
    const primary = ct.split(";")[0]?.trim() ?? ct;
    if (primary.length <= 40) return primary;
  }
  const ext = normalizeExt(filename);
  return ext === "(no extension)" ? "Unknown type" : ext;
}

/**
 * Aggregates integration-set assets by top-level folder and by file type label.
 */
export function summarizeIntegrationAssets(
  assets: IntegrationAssetSummaryInput[]
): IntegrationInventorySummary {
  let totalBytes = 0;
  const folderMap = new Map<
    string,
    { count: number; bytes: number; extCounts: Map<string, number> }
  >();
  const typeMap = new Map<string, { count: number; bytes: number }>();

  for (const a of assets) {
    const bytes = toNumber(a.sizeBytes);
    totalBytes += bytes;

    const folder = topFolder(a.relativePath);
    let f = folderMap.get(folder);
    if (!f) {
      f = { count: 0, bytes: 0, extCounts: new Map() };
      folderMap.set(folder, f);
    }
    f.count += 1;
    f.bytes += bytes;
    const ext = normalizeExt(a.filename);
    f.extCounts.set(ext, (f.extCounts.get(ext) ?? 0) + 1);

    const tlabel = typeLabel(a.contentType, a.filename);
    let t = typeMap.get(tlabel);
    if (!t) {
      t = { count: 0, bytes: 0 };
      typeMap.set(tlabel, t);
    }
    t.count += 1;
    t.bytes += bytes;
  }

  const byFolder: FolderBucketSummary[] = [...folderMap.entries()]
    .map(([folder, v]) => {
      const topExtensions = [...v.extCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([ext]) => ext);
      return {
        folder,
        fileCount: v.count,
        totalBytes: v.bytes,
        topExtensions,
      };
    })
    .sort((a, b) => b.totalBytes - a.totalBytes);

  const byType: FileTypeSummary[] = [...typeMap.entries()]
    .map(([label, v]) => ({
      label,
      fileCount: v.count,
      totalBytes: v.bytes,
    }))
    .sort((a, b) => b.totalBytes - a.totalBytes);

  return {
    totalFiles: assets.length,
    totalBytes,
    byFolder,
    byType,
  };
}

/** US East–style S3 Standard list price per GB-month (override via env). */
export function getS3StandardPricePerGbMonth(): number {
  const raw = process.env.AWS_S3_STANDARD_USD_PER_GB_MONTH;
  if (raw === undefined || raw === "") return 0.023;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0.023;
}

export function estimateS3MonthlyUsd(totalBytes: number): number {
  const gb = totalBytes / 1024 ** 3;
  return gb * getS3StandardPricePerGbMonth();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(2) : gb.toFixed(1)} GB`;
}

export function formatUsd(amount: number): string {
  if (amount < 0.01 && amount > 0) return "< $0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount < 1 ? 2 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
