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
import { VisibilityBadge } from "@/components/gallery/visibility-badge";
import { PostLinkedIntegrationSummaries } from "@/components/posts/post-linked-integration-summaries";
import { mapPostIntegrationSetsForSummary } from "@/lib/post-integration-preview";
import { getLatestAutoThumbJobForPostOwner } from "@/server/services/auto-thumb-jobs";
import { listMyIntegrationSets } from "@/server/services/integration-sets";
import { getPostBySlugForOwnerEdit } from "@/server/services/posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return { title: `Edit — ${slug}` };
  }
  const post = await getPostBySlugForOwnerEdit(slug, session.user.id);
  if (!post) {
    return { title: `Edit — ${slug}` };
  }
  const scope = post.status === "DRAFT" ? "Draft" : "Published post";
  return { title: `Edit ${scope}: ${post.title}` };
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

  const isDraft = post.status === "DRAFT";
  const pageTitle = isDraft ? "Edit draft" : "Edit published post";
  const pageSubline = isDraft
    ? "Only you can see this until you publish."
    : "Changes show on your public post in the gallery.";
  const viewLabel = isDraft ? "View draft" : "View public post";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/posts/${post.slug}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {viewLabel}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/drafts">Back to workspace</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {pageTitle}
        </h1>
        <VisibilityBadge visibility={post.status} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{pageSubline}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground/90">{post.title}</span>
        {" · "}
        <code className="text-xs">{post.slug}</code>
      </p>

      <PostEditorForm
        postId={post.id}
        postStatus={post.status}
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
          {isDraft
            ? "Deleting removes this draft and its final images. Integration sets stay in your library."
            : "Deleting removes this published post from the gallery and deletes its final images. Integration sets stay in your library."}
        </p>
        <div className="mt-3">
          <DeletePostButton postId={post.id} postTitle={post.title} />
        </div>
      </div>
    </div>
  );
}
