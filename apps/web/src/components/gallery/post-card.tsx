import Link from "next/link";
import { PostDescriptionMarkdown } from "@/components/posts/post-description-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisibilityBadge, type PostStatus } from "./visibility-badge";
import { formatShortUsDate } from "@/lib/format-date";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LinkedIntegrationCardPreview } from "@/lib/post-integration-preview";

export type PostCardPost = {
  id: string;
  slug: string;
  title: string;
  /** Write-up body; shown as a short excerpt on the card when set. */
  description?: string | null;
  status: PostStatus;
  finalImageAssetId: string | null;
  finalThumbAssetId: string | null;
  targetName: string | null;
  targetType: string | null;
  captureDate: Date | null;
  updatedAt: Date;
};

type PostCardProps = {
  post: PostCardPost;
  /** Base path for the post link (e.g. /posts). Slug is appended. */
  hrefBase?: string;
  tone?: "default" | "workspace";
  /** Workspace: compact integration-set summaries when linked to this post. */
  linkedIntegrations?: LinkedIntegrationCardPreview[];
};

export function PostCard({
  post,
  hrefBase = "/posts",
  tone = "default",
  linkedIntegrations,
}: PostCardProps) {
  const href = `${hrefBase}/${post.slug}`;
  const subtitle =
    [
      post.targetName,
      post.captureDate ? formatShortUsDate(post.captureDate) : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;
  const previewAssetId = post.finalThumbAssetId ?? post.finalImageAssetId;
  const isWorkspaceTone = tone === "workspace";
  const writeupSource = post.description?.trim() ?? "";
  const metaText = subtitle ?? post.slug;

  return (
    <Card
      className={cn(
        "group flex h-full flex-col gap-0 overflow-hidden border-white/10 bg-white/[0.03] py-0 transition-all duration-300 hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_28px_90px_-45px_rgba(0,0,0,0.95)]",
        isWorkspaceTone &&
          "rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-white shadow-[0_20px_70px_-38px_rgba(0,0,0,0.9)] backdrop-blur-sm hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))]"
      )}
    >
      <Link
        href={href}
        className={cn(
          "block shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          isWorkspaceTone && "rounded-t-[1.75rem]"
        )}
        aria-label={`View post: ${post.title}`}
      >
        <div
          className={cn(
            "relative w-full shrink-0 overflow-hidden bg-muted/50",
            isWorkspaceTone
              ? "aspect-[1.16/1] rounded-b-[1.4rem]"
              : "aspect-[4/3] rounded-b-3xl"
          )}
        >
          {previewAssetId ? (
            <img
              src={`/api/assets/${previewAssetId}/view`}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_55%),linear-gradient(180deg,rgba(30,41,59,0.95),rgba(15,23,42,0.98))] text-slate-400"
              aria-hidden
            >
              <ImageIcon className="h-12 w-12" strokeWidth={1.25} />
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,22,0.12),rgba(6,10,22,0.2)_35%,rgba(6,10,22,0.92)_100%)]" />
          <div className="absolute right-3 top-3">
            <VisibilityBadge visibility={post.status} className="shadow-lg" />
          </div>
          <CardHeader className="absolute inset-x-0 bottom-0 gap-1 px-5 pb-4 pt-12">
            <p className="line-clamp-1 text-[11px] font-medium tracking-[0.16em] text-white/68 uppercase">
              {metaText}
            </p>
            <CardTitle
              className={cn(
                "line-clamp-2 text-balance font-semibold tracking-tight text-white",
                isWorkspaceTone
                  ? "text-[1.65rem] leading-[1.02]"
                  : "text-xl leading-tight"
              )}
            >
              {post.title}
            </CardTitle>
          </CardHeader>
        </div>
      </Link>
      <CardContent
        className={cn(
          "mt-auto flex min-h-0 flex-1 flex-col justify-between px-5 pb-5 pt-4",
          isWorkspaceTone && "gap-4 rounded-b-[1.75rem]"
        )}
      >
        {writeupSource ? (
          <div
            className={cn(
              "max-h-[4.75rem] overflow-hidden text-sm leading-6",
              isWorkspaceTone ? "text-slate-300/95" : "text-muted-foreground"
            )}
          >
            <PostDescriptionMarkdown
              variant="inline"
              suppressLinks
              source={writeupSource}
              className={cn(
                "[&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0 [&_p:first-child]:mt-0",
                isWorkspaceTone
                  ? "[&_h2]:!text-white [&_h3]:!text-white [&_li]:!text-slate-400 [&_p]:!text-slate-300/95"
                  : "[&_h2]:!text-foreground [&_h3]:!text-foreground [&_li]:!text-muted-foreground [&_p]:!text-muted-foreground"
              )}
            />
          </div>
        ) : (
          <p
            className={cn(
              "text-sm leading-6 text-muted-foreground",
              isWorkspaceTone && "text-slate-400"
            )}
          >
            Add a write-up to give this capture more context in the gallery.
          </p>
        )}
        {post.targetType ? (
          <p
            className={cn(
              "pt-1 text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground/80",
              isWorkspaceTone && "text-slate-500"
            )}
          >
            {post.targetType}
          </p>
        ) : null}
        {linkedIntegrations && linkedIntegrations.length > 0 ? (
          <div
            className={cn(
              "mt-3 border-t border-white/10 pt-3",
              isWorkspaceTone && "border-white/10"
            )}
          >
            <p
              className={cn(
                "text-[10px] font-medium tracking-wide text-muted-foreground uppercase",
                isWorkspaceTone && "text-slate-500"
              )}
            >
              Integration data
            </p>
            <ul className="mt-2 space-y-2">
              {linkedIntegrations.map((row) => (
                <li key={row.setId} className="text-xs leading-snug">
                  <span
                    className={cn(
                      "font-medium text-white/90",
                      isWorkspaceTone && "text-white"
                    )}
                  >
                    {row.setTitle}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {row.fileCount} {row.fileCount === 1 ? "file" : "files"} ·{" "}
                    {row.sizeLabel} · ~{row.monthlyCostLabel}/mo S3
                  </span>
                  {row.folderLine ? (
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px] text-muted-foreground",
                        isWorkspaceTone && "text-slate-400"
                      )}
                    >
                      Folders: {row.folderLine}
                    </span>
                  ) : null}
                  {row.typeLine ? (
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px] text-muted-foreground",
                        isWorkspaceTone && "text-slate-400"
                      )}
                    >
                      Types: {row.typeLine}
                    </span>
                  ) : null}
                  {row.notes ? (
                    <div className="mt-1.5">
                      <p
                        className={cn(
                          "text-[10px] font-medium tracking-wide text-muted-foreground uppercase",
                          isWorkspaceTone && "text-slate-500"
                        )}
                      >
                        Notes
                      </p>
                      <div
                        className={cn(
                          "max-h-24 overflow-hidden text-muted-foreground",
                          isWorkspaceTone && "text-slate-400"
                        )}
                      >
                        <PostDescriptionMarkdown
                          variant="inline"
                          suppressLinks
                          source={row.notes}
                          className="[&_*]:text-[11px] [&_h2]:text-xs [&_h2]:font-semibold [&_h3]:text-[11px] [&_li]:mt-0.5 [&_p]:mt-1.5 [&_p]:leading-snug"
                        />
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
