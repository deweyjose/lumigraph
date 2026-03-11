import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "auth";
import { Download, ImageIcon } from "lucide-react";
import { FinalImageUpload } from "@/components/posts/final-image-upload";
import { PublishButton } from "@/components/posts/publish-button";
import { PostEditorForm } from "@/components/posts/post-editor-form";
import { Button } from "@/components/ui/button";
import { VisibilityBadge } from "@/components/gallery/visibility-badge";
import { getLatestAutoThumbJobForPostOwner } from "@/server/services/auto-thumb-jobs";
import { getPostBySlugForView } from "@/server/services/posts";

type Props = { params: Promise<{ slug: string }> };

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
  const imageAssetId = post.finalImageAssetId ?? null;
  const thumbAssetId = post.finalThumbAssetId ?? null;
  const autoThumbJob =
    isOwner && session?.user?.id
      ? await getLatestAutoThumbJobForPostOwner(session.user.id, post.id)
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <VisibilityBadge visibility={post.status} />
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-muted-foreground">
          {post.slug}
        </code>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
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

      {imageAssetId || thumbAssetId ? (
        <figure className="mt-6 overflow-hidden rounded-lg border bg-muted/30">
          <img
            src={`/api/assets/${imageAssetId ?? thumbAssetId}/view`}
            alt={post.title}
            className="max-h-[70vh] w-full object-contain"
          />
        </figure>
      ) : (
        <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
          <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
        </div>
      )}

      {isOwner && (
        <>
          <PostEditorForm
            postId={post.id}
            initialTitle={post.title}
            initialSlug={post.slug}
            initialDescription={post.description}
          />
          <FinalImageUpload
            postId={post.id}
            currentImageAssetId={post.finalImageAssetId}
            currentThumbAssetId={post.finalThumbAssetId}
            initialAutoThumbJob={
              autoThumbJob
                ? {
                    id: autoThumbJob.id,
                    status: autoThumbJob.status,
                    attempts: autoThumbJob.attempts,
                    errorMessage: autoThumbJob.errorMessage,
                    updatedAt: autoThumbJob.updatedAt,
                  }
                : null
            }
            className="mt-6"
          />
        </>
      )}

      {isOwner && post.status === "DRAFT" && (
        <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            This post is a draft. Publish to make it public.
          </p>
          <PublishButton postId={post.id} className="mt-3" />
        </div>
      )}

      {post.integrationSets.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Integration Sets</h2>
          <div className="mt-3 space-y-4">
            {post.integrationSets.map((set) => (
              <div key={set.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{set.title}</h3>
                  {isOwner && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/integration-sets/${set.id}`}>Manage</Link>
                    </Button>
                  )}
                </div>
                {set.assets.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {set.assets.map((asset) => (
                      <li
                        key={asset.id}
                        className="flex items-center justify-between gap-2 rounded border bg-muted/20 px-3 py-2"
                      >
                        <span className="truncate font-mono text-sm">
                          {asset.relativePath}
                        </span>
                        <a
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          href={`/api/assets/${asset.id}/download`}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
