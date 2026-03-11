import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisibilityBadge, type PostStatus } from "./visibility-badge";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PostCardPost = {
  id: string;
  slug: string;
  title: string;
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

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        isWorkspaceTone &&
          "gap-0 rounded-[1.75rem] border-white/10 bg-white/[0.035] text-white shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm hover:bg-white/[0.05]"
      )}
    >
      <Link
        href={href}
        className={cn(
          "block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          isWorkspaceTone && "rounded-[1.75rem]"
        )}
        aria-label={`View post: ${post.title}`}
      >
        <div
          className={cn(
            "relative aspect-video w-full bg-muted/50",
            isWorkspaceTone && "bg-white/[0.04]"
          )}
        >
          {previewAssetId ? (
            <img
              src={`/api/assets/${previewAssetId}/view`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-muted-foreground"
              aria-hidden
            >
              <ImageIcon className="h-12 w-12" strokeWidth={1.25} />
            </div>
          )}
          <div className="absolute right-2 top-2">
            <VisibilityBadge visibility={post.status} />
          </div>
        </div>
        <CardHeader className={cn("pb-2", isWorkspaceTone && "pb-1")}>
          <CardTitle
            className={cn(
              "line-clamp-2 text-base font-semibold",
              isWorkspaceTone && "text-2xl text-white"
            )}
          >
            {post.title}
          </CardTitle>
          {subtitle && (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                isWorkspaceTone && "text-slate-300"
              )}
            >
              {subtitle}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <p
            className={cn(
              "text-xs text-muted-foreground",
              isWorkspaceTone && "text-slate-400"
            )}
          >
            <span className="sr-only">Slug: </span>
            <code
              className={cn(
                "rounded bg-muted px-1.5 py-0.5 font-mono",
                isWorkspaceTone && "bg-white/8 text-slate-200"
              )}
            >
              {post.slug}
            </code>
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}
