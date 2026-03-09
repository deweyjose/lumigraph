export type ExportJobStatus =
  | "PENDING"
  | "RUNNING"
  | "READY"
  | "FAILED"
  | "CANCELLED";

export type ExportJobRow = {
  id: string;
  status: ExportJobStatus;
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

const ACTIVE_STATUSES = new Set<ExportJobStatus>(["PENDING", "RUNNING"]);
const TERMINAL_STATUSES = new Set<ExportJobStatus>([
  "READY",
  "FAILED",
  "CANCELLED",
]);

function parseTimestamp(value: string | null): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function isExportJobActive(status: ExportJobStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

function isExportJobTerminal(status: ExportJobStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function isExportJobExpired(
  job: Pick<ExportJobRow, "expiresAt" | "isExpired">
): boolean {
  if (job.isExpired === true) return true;
  const expiresAt = parseTimestamp(job.expiresAt);
  return expiresAt > 0 && expiresAt <= Date.now();
}

function shouldKeepExistingJob(
  existing: ExportJobRow,
  incoming: ExportJobRow
): boolean {
  const existingUpdatedAt = parseTimestamp(existing.updatedAt);
  const incomingUpdatedAt = parseTimestamp(incoming.updatedAt);

  if (
    existingUpdatedAt > 0 &&
    incomingUpdatedAt > 0 &&
    incomingUpdatedAt < existingUpdatedAt
  ) {
    return true;
  }

  if (
    isExportJobTerminal(existing.status) &&
    isExportJobActive(incoming.status) &&
    incomingUpdatedAt <= existingUpdatedAt
  ) {
    return true;
  }

  return false;
}

function mergeSingleJob(existing: ExportJobRow, incoming: ExportJobRow) {
  if (shouldKeepExistingJob(existing, incoming)) return existing;

  const shouldKeepCachedDownloadUrl =
    incoming.status === "READY" &&
    !incoming.downloadUrl &&
    existing.status === "READY" &&
    existing.outputS3Key === incoming.outputS3Key &&
    Boolean(existing.downloadUrl);

  return {
    ...incoming,
    ...(shouldKeepCachedDownloadUrl && { downloadUrl: existing.downloadUrl }),
  };
}

export function mergeExportJobsFromList(
  existing: ExportJobRow[],
  incoming: ExportJobRow[],
  deletedJobIds: ReadonlySet<string> = new Set()
): ExportJobRow[] {
  const existingById = new Map(existing.map((job) => [job.id, job]));
  const incomingVisible = incoming.filter((job) => !deletedJobIds.has(job.id));
  const incomingIds = new Set<string>();

  const merged = incomingVisible.map((job) => {
    incomingIds.add(job.id);
    const previous = existingById.get(job.id);
    if (!previous) return job;
    return mergeSingleJob(previous, job);
  });

  const retainedActiveJobs = existing.filter(
    (job) =>
      !deletedJobIds.has(job.id) &&
      !incomingIds.has(job.id) &&
      isExportJobActive(job.status)
  );

  return [...merged, ...retainedActiveJobs].sort(
    (a, b) => parseTimestamp(b.createdAt) - parseTimestamp(a.createdAt)
  );
}

export function downloadUnavailableMessage(job: ExportJobRow): string | null {
  if (job.status === "READY") {
    if (isExportJobExpired(job)) {
      return "Export has expired. Start a new export to download.";
    }
    return null;
  }
  if (job.status === "PENDING" || job.status === "RUNNING") {
    return "Export is still running. Wait for READY before downloading.";
  }
  if (job.status === "FAILED") {
    return "Export failed. Start a new export and try again.";
  }
  return "Export was cancelled. Start a new export to download.";
}
