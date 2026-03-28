import type { IntegrationInventorySummary } from "@/lib/integration-asset-summary";
import {
  estimateS3MonthlyUsd,
  formatBytes,
  formatUsd,
  getS3StandardPricePerGbMonth,
} from "@/lib/integration-asset-summary";

type Props = {
  summary: IntegrationInventorySummary;
};

export function IntegrationInventoryPanel({ summary }: Props) {
  const monthly = estimateS3MonthlyUsd(summary.totalBytes);
  const rate = getS3StandardPricePerGbMonth();

  if (summary.totalFiles === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
        Upload files to see folder summaries and storage estimates.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Inventory</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {summary.totalFiles} {summary.totalFiles === 1 ? "file" : "files"} ·{" "}
          {formatBytes(summary.totalBytes)} stored
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Approx. S3 Standard cost:{" "}
          <span className="font-medium text-white/90">
            {formatUsd(monthly)}/mo
          </span>{" "}
          at ~${rate.toFixed(3)}/GB-mo (list price; see{" "}
          <code className="rounded bg-white/10 px-1">
            AWS_S3_STANDARD_USD_PER_GB_MONTH
          </code>{" "}
          env).
        </p>
      </div>

      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          By folder
        </h4>
        <ul className="mt-2 space-y-1.5 text-sm">
          {summary.byFolder.map((f) => (
            <li
              key={f.folder}
              className="flex flex-wrap justify-between gap-2 border-b border-white/5 py-1.5 last:border-0"
            >
              <span className="font-mono text-xs text-white/90">
                {f.folder}
              </span>
              <span className="text-xs text-muted-foreground">
                {f.fileCount} files · {formatBytes(f.totalBytes)}
                {f.topExtensions.length > 0
                  ? ` · ${f.topExtensions.join(", ")}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          By file type
        </h4>
        <ul className="mt-2 space-y-1.5 text-sm">
          {summary.byType.map((t) => (
            <li
              key={t.label}
              className="flex flex-wrap justify-between gap-2 border-b border-white/5 py-1.5 last:border-0"
            >
              <span className="text-xs text-white/90">{t.label}</span>
              <span className="text-xs text-muted-foreground">
                {t.fileCount} · {formatBytes(t.totalBytes)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
