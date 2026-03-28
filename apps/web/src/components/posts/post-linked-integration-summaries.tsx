import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PostDescriptionMarkdown } from "@/components/posts/post-description-markdown";
import {
  estimateS3MonthlyUsd,
  formatBytes,
  formatUsd,
  summarizeIntegrationAssets,
} from "@/lib/integration-asset-summary";
import type { LinkedIntegrationSetForSummary } from "@/lib/post-integration-preview";

type Props = {
  sets: LinkedIntegrationSetForSummary[];
  /** Show “Open set” and “All integration sets” when true. */
  showOwnerLinks?: boolean;
  className?: string;
};

/**
 * Folder + file-type summaries for integration sets linked to a post.
 * Used on post view, post edit, and anywhere else we mirror that summary.
 */
export function PostLinkedIntegrationSummaries({
  sets,
  showOwnerLinks = false,
  className = "",
}: Props) {
  if (sets.length === 0) return null;

  return (
    <section className={className}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold">Integration data</h2>
        {showOwnerLinks && (
          <Link
            className="text-primary text-sm hover:underline"
            href="/integration-sets"
          >
            All integration sets
          </Link>
        )}
      </div>
      <div className="mt-4 space-y-5">
        {sets.map((set) => {
          const inv = summarizeIntegrationAssets(set.assets);
          const monthly = estimateS3MonthlyUsd(inv.totalBytes);
          return (
            <div
              key={set.id}
              className="rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-white">{set.title}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {inv.totalFiles} {inv.totalFiles === 1 ? "file" : "files"} ·{" "}
                    {formatBytes(inv.totalBytes)} · ~{formatUsd(monthly)}
                    /mo S3 (est.)
                  </p>
                </div>
                {showOwnerLinks ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/integration-sets/${set.id}`}>Open set</Link>
                  </Button>
                ) : null}
              </div>
              <div className="mt-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Notes
                </p>
                {set.notes?.trim() ? (
                  <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
                    <PostDescriptionMarkdown
                      variant="inline"
                      source={set.notes.trim()}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {showOwnerLinks ? (
                      <>
                        No notes saved for this set yet. Add them on the{" "}
                        <Link
                          className="text-primary underline-offset-4 hover:underline"
                          href={`/integration-sets/${set.id}`}
                        >
                          integration set
                        </Link>{" "}
                        page.
                      </>
                    ) : (
                      "No notes were added for this linked set."
                    )}
                  </p>
                )}
              </div>
              {inv.byFolder.length > 0 && (
                <div className="mt-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Folders
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                    {inv.byFolder.slice(0, 8).map((f) => (
                      <li key={f.folder} className="flex justify-between gap-2">
                        <span className="font-mono text-xs text-white/85">
                          {f.folder}
                        </span>
                        <span>
                          {f.fileCount} · {formatBytes(f.totalBytes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {inv.byType.length > 0 && (
                <div className="mt-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    File types
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                    {inv.byType.slice(0, 10).map((t) => (
                      <li key={t.label} className="flex justify-between gap-2">
                        <span className="text-white/85">{t.label}</span>
                        <span>
                          {t.fileCount} · {formatBytes(t.totalBytes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
