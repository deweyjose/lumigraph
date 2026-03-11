import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { listMyPosts } from "@/server/services/posts";
import { PostCard, type PostCardPost } from "@/components/gallery/post-card";
import { Button } from "@/components/ui/button";
import { FileImage, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Drafts",
  description:
    "Your drafts and published posts. Create and manage your astrophotography posts.",
};

export default async function DraftsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/drafts");
  }

  const myPosts = await listMyPosts(session.user.id);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <header className="mb-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium tracking-[0.24em] text-cyan-200 uppercase">
              Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Drafts
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your drafts and published posts in one place.
            </p>
          </div>
          <Button asChild className="mt-2 w-fit gap-2 sm:mt-0">
            <Link href="/posts/new">
              <Plus className="size-4" aria-hidden />
              New draft
            </Link>
          </Button>
        </div>
      </header>

      {myPosts.length > 0 ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {myPosts.map((post: PostCardPost) => (
            <li key={post.id}>
              <PostCard
                post={{
                  id: post.id,
                  slug: post.slug,
                  title: post.title,
                  status: post.status,
                  finalImageAssetId: post.finalImageAssetId,
                  finalThumbAssetId: post.finalThumbAssetId,
                  targetName: post.targetName,
                  targetType: post.targetType,
                  captureDate: post.captureDate,
                  updatedAt: post.updatedAt,
                }}
                hrefBase="/posts"
                tone="workspace"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-16"
          role="status"
          aria-label="No posts yet"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileImage className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 text-center text-sm font-medium text-foreground">
            You don&apos;t have any posts yet
          </p>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Create a draft to start publishing your astrophotography.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/posts/new">New draft</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
