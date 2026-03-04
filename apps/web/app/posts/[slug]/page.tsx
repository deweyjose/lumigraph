import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "auth";
import { Download, ImageIcon } from "lucide-react";
import {
  canDownloadFromDataset,
  getPostBySlugForView,
} from "@/server/services/image-post";
import { getFinalImageDisplayUrl } from "@/lib/image-url";
import { VisibilityBadge } from "@/components/gallery/visibility-badge";
import { PublishButton } from "@/components/posts/publish-button";
import { FinalImageUpload } from "@/components/posts/final-image-upload";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number((bytes / Math.pow(k, i)).toFixed(1))} ${["B", "KB", "MB", "GB"][i]}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Post` };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  const post = await getPostBySlugForView(slug, session?.user?.id);
  if (!post) notFound();

  const isOwner = session?.user?.id === post.userId;
  const isDraft = post.visibility === "DRAFT";
  const userId = session?.user?.id ?? null;
  const downloadableDatasets =
    post.datasets?.filter((d) => canDownloadFromDataset(d, userId)) ?? [];

  const imageDisplayUrl = getFinalImageDisplayUrl(
    post.id,
    post.finalImageUrl,
    "image"
  );
  const thumbDisplayUrl = getFinalImageDisplayUrl(
    post.id,
    post.finalImageThumbUrl,
    "thumb"
  );
  const primaryImageUrl = imageDisplayUrl ?? thumbDisplayUrl;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <VisibilityBadge visibility={post.visibility} />
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-muted-foreground">
          {post.slug}
        </code>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
      {(post.targetName || post.captureDate) && (
        <p className="mt-1 text-muted-foreground">
          {[post.targetName, post.captureDate?.toLocaleDateString()]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {post.description && (
        <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
          {post.description}
        </p>
      )}

      {primaryImageUrl && (
        <figure className="mt-6 overflow-hidden rounded-lg border bg-muted/30">
          <div className="relative flex min-h-[200px] items-center justify-center">
            <img
              src={primaryImageUrl}
              alt={post.title}
              className="max-h-[70vh] w-full object-contain"
            />
          </div>
        </figure>
      )}
      {!primaryImageUrl && (
        <div
          className="mt-6 flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/20"
          aria-hidden
        >
          <ImageIcon
            className="h-16 w-16 text-muted-foreground/50"
            strokeWidth={1}
          />
        </div>
      )}

      {isOwner && (
        <FinalImageUpload
          postId={post.id}
          currentImageKey={post.finalImageUrl}
          currentThumbKey={post.finalImageThumbUrl}
          className="mt-6"
        />
      )}

      {isOwner && isDraft && (
        <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            This post is a draft. Publish it to make it visible in the community
            gallery.
          </p>
          <PublishButton postId={post.id} className="mt-4" />
        </div>
      )}

      {downloadableDatasets.length > 0 && (
        <section className="mt-8" aria-labelledby="datasets-heading">
          <h2 id="datasets-heading" className="text-lg font-semibold">
            Datasets
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Download integration files (FITS, stacks, etc.) for this post.
          </p>
          <div className="mt-4 space-y-6">
            {downloadableDatasets.map((dataset) => (
              <div key={dataset.id}>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {dataset.title}
                </h3>
                <ul className="mt-2 space-y-2" role="list">
                  {dataset.artifacts.map((artifact) => (
                    <li
                      key={artifact.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {artifact.filename}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatBytes(Number(artifact.sizeBytes))}
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/api/artifacts/${artifact.id}/download`}
                          download
                          className="inline-flex items-center gap-2"
                        >
                          <Download className="size-4" aria-hidden />
                          Download
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex gap-3">
        <Button asChild variant="secondary">
          <Link href="/gallery">Back to Gallery</Link>
        </Button>
        {isOwner && (
          <Button asChild variant="outline">
            <Link href="/posts/new">New draft</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
