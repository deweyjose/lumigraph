import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisibilityBadge, type PostStatus } from "./visibility-badge";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
};

export function PostCard({
  post,
  hrefBase = "/posts",
  tone = "default",
}: PostCardProps) {
  const href = `${hrefBase}/${post.slug}`;
  const subtitle =
    [post.targetName, post.captureDate?.toLocaleDateString()]
      .filter(Boolean)
      .join(" · ") || undefined;
  const previewAssetId = post.finalThumbAssetId ?? post.finalImageAssetId;
  const isWorkspaceTone = tone === "workspace";
  const writeupExcerpt = post.description?.replace(/\s+/g, " ").trim() ?? "";
  const metaText = subtitle ?? post.slug;

  return (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden border-white/10 bg-white/[0.03] py-0 transition-all duration-300 hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_28px_90px_-45px_rgba(0,0,0,0.95)]",
        isWorkspaceTone &&
          "gap-0 rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-white shadow-[0_20px_70px_-38px_rgba(0,0,0,0.9)] backdrop-blur-sm hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))]"
      )}
    >
      <Link
        href={href}
        className={cn(
          "flex min-h-0 flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          isWorkspaceTone && "rounded-[1.75rem]"
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
        <CardContent
          className={cn(
            "mt-auto flex flex-1 flex-col justify-between px-5 pb-5 pt-4",
            isWorkspaceTone && "gap-4"
          )}
        >
          {writeupExcerpt ? (
            <p
              className={cn(
                "line-clamp-3 text-sm leading-6 text-muted-foreground",
                isWorkspaceTone && "text-slate-300/95"
              )}
            >
              {writeupExcerpt}
            </p>
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
        </CardContent>
      </Link>
    </Card>
  );
}
