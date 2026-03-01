import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VisibilityBadge, type PostVisibility } from "./visibility-badge";
import { ImageIcon } from "lucide-react";

export type PostCardPost = {
  id: string;
  slug: string;
  title: string;
  visibility: PostVisibility;
  finalImageThumbUrl: string | null;
  targetName: string | null;
  targetType: string | null;
  captureDate: Date | null;
  updatedAt: Date;
};

type PostCardProps = {
  post: PostCardPost;
  /** Base path for the post link (e.g. /posts). Slug is appended. */
  hrefBase?: string;
};

export function PostCard({ post, hrefBase = "/posts" }: PostCardProps) {
  const href = `${hrefBase}/${post.slug}`;
  const subtitle = [post.targetName, post.captureDate?.toLocaleDateString()]
    .filter(Boolean)
    .join(" · ") || undefined;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <Link
        href={href}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl"
        aria-label={`View post: ${post.title}`}
      >
        <div className="relative aspect-video w-full bg-muted/50">
          {post.finalImageThumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- thumb URLs are external (S3/presigned)
            <img
              src={post.finalImageThumbUrl}
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
            <VisibilityBadge visibility={post.visibility} />
          </div>
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2 text-base font-semibold">
            {post.title}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            <span className="sr-only">Slug: </span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
              {post.slug}
            </code>
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}
