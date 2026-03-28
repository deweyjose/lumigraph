import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "auth";
import { ImageIcon, Pencil } from "lucide-react";
import { PostDescriptionMarkdown } from "@/components/posts/post-description-markdown";
import { PostImageInspector } from "@/components/posts/post-image-inspector";
import { PostLinkedIntegrationSummaries } from "@/components/posts/post-linked-integration-summaries";
import { PublishButton } from "@/components/posts/publish-button";
import { Button } from "@/components/ui/button";
import { VisibilityBadge } from "@/components/gallery/visibility-badge";
import { formatShortUsDate } from "@/lib/format-date";
import { mapPostIntegrationSetsForSummary } from "@/lib/post-integration-preview";
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
  const integrationSummarySets = mapPostIntegrationSetsForSummary(
    post.integrationSets
  );

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
        <p className="text-muted-foreground mt-1">
          {[
            post.targetName,
            post.captureDate ? formatShortUsDate(post.captureDate) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {isOwner && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" className="gap-2">
            <Link href={`/posts/${post.slug}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit post
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/drafts">Back to Drafts</Link>
          </Button>
        </div>
      )}

      <div className="mt-6">
        {imageAssetId || thumbAssetId ? (
          <PostImageInspector
            alt={post.title}
            className="w-full overflow-hidden rounded-[1.4rem] border border-white/10 bg-muted/50 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)]"
            src={`/api/assets/${imageAssetId ?? thumbAssetId}/view`}
          />
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-[1.6rem] border border-dashed border-white/12 bg-white/[0.03] shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <ImageIcon className="text-muted-foreground/50 h-16 w-16" />
          </div>
        )}
      </div>

      {post.description && (
        <div className="mt-6">
          <PostDescriptionMarkdown source={post.description} />
        </div>
      )}

      {isOwner && post.status === "DRAFT" && (
        <div className="mt-8 rounded-[1.6rem] border border-amber-500/30 bg-amber-500/8 p-4 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            This post is a draft. Publish to make it public.
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            Add images and edit copy on the{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href={`/posts/${post.slug}/edit`}
            >
              edit post
            </Link>{" "}
            page.
          </p>
          <PublishButton postId={post.id} className="mt-3" />
        </div>
      )}

      <PostLinkedIntegrationSummaries
        sets={integrationSummarySets}
        showOwnerLinks={isOwner}
        className="mt-10"
      />
    </div>
  );
}
