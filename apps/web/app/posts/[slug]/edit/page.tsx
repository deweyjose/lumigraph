import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "auth";
import { ArrowLeft } from "lucide-react";
import { FinalImageUpload } from "@/components/posts/final-image-upload";
import { PostEditorForm } from "@/components/posts/post-editor-form";
import { PublishButton } from "@/components/posts/publish-button";
import { Button } from "@/components/ui/button";
import { DeletePostButton } from "@/components/posts/delete-post-button";
import { PostLinkedIntegrationSummaries } from "@/components/posts/post-linked-integration-summaries";
import { mapPostIntegrationSetsForSummary } from "@/lib/post-integration-preview";
import { getLatestAutoThumbJobForPostOwner } from "@/server/services/auto-thumb-jobs";
import { listMyIntegrationSets } from "@/server/services/integration-sets";
import { getPostBySlugForOwnerEdit } from "@/server/services/posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Edit ${slug} — Post` };
}

export default async function PostEditPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/posts/${slug}/edit`);
  }

  const [post, allSets] = await Promise.all([
    getPostBySlugForOwnerEdit(slug, session.user.id),
    listMyIntegrationSets(session.user.id),
  ]);

  if (!post) notFound();

  const autoThumbJob = await getLatestAutoThumbJobForPostOwner(
    session.user.id,
    post.id
  );

  const linkedSetIds = post.integrationSets.map((s) => s.id);
  const integrationSummarySets = mapPostIntegrationSetsForSummary(
    post.integrationSets
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/posts/${post.slug}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            View post
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/drafts">Back to Drafts</Link>
        </Button>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Edit post
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {post.title} · <code className="text-xs">{post.slug}</code>
      </p>

      <PostEditorForm
        postId={post.id}
        initialTitle={post.title}
        initialSlug={post.slug}
        initialDescription={post.description}
        saveRedirect="edit"
        includeIntegrationSetIdsInSave
        integrationSetOptions={allSets.map((s) => ({
          id: s.id,
          title: s.title,
        }))}
        initialIntegrationSetIds={linkedSetIds}
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

      <PostLinkedIntegrationSummaries
        sets={integrationSummarySets}
        showOwnerLinks
        className="mt-10"
      />

      {post.status === "DRAFT" && (
        <div className="mt-8 rounded-[1.6rem] border border-amber-500/30 bg-amber-500/8 p-4 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            This post is still a draft. Publish when you are ready to make it
            public.
          </p>
          <PublishButton postId={post.id} className="mt-3" />
        </div>
      )}

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-sm font-medium text-destructive">Danger zone</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Deleting removes this post and its final images. Published posts can
          be deleted the same way; they disappear from the public gallery.
        </p>
        <div className="mt-3">
          <DeletePostButton postId={post.id} postTitle={post.title} />
        </div>
      </div>
    </div>
  );
}
