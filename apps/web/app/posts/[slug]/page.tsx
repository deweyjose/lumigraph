import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "auth";
import { getPostBySlugForView } from "@/server/services/image-post";
import { VisibilityBadge } from "@/components/gallery/visibility-badge";
import { PublishButton } from "@/components/posts/publish-button";
import { Button } from "@/components/ui/button";

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
  const isDraft = post.visibility === "DRAFT";

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

      {isOwner && isDraft && (
        <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            This post is a draft. Publish it to make it visible in the community
            gallery.
          </p>
          <PublishButton postId={post.id} className="mt-4" />
        </div>
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
