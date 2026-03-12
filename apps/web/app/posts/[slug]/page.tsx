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
type IntegrationSet = NonNullable<
  Awaited<ReturnType<typeof getPostBySlugForView>>
>["integrationSets"][number];
type IntegrationAsset = IntegrationSet["assets"][number];

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
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="mb-6 flex items-center gap-2">
        <VisibilityBadge visibility={post.status} />
        <code className="rounded bg-white/8 px-1.5 py-0.5 text-sm font-mono text-slate-300">
          {post.slug}
        </code>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {post.title}
      </h1>
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
        <figure className="mt-6 overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
          <img
            src={`/api/assets/${imageAssetId ?? thumbAssetId}/view`}
            alt={post.title}
            className="max-h-[70vh] w-full object-contain"
          />
        </figure>
      ) : (
        <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-[1.6rem] border border-dashed border-white/12 bg-white/[0.03] shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
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
        <div className="mt-8 rounded-[1.6rem] border border-amber-500/30 bg-amber-500/8 p-4 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
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
            {post.integrationSets.map((set: IntegrationSet) => (
              <div
                key={set.id}
                className="rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm"
              >
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
                    {set.assets.map((asset: IntegrationAsset) => (
                      <li
                        key={asset.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
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
