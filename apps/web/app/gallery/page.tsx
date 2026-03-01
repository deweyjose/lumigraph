import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "auth";
import { listMyPosts, listPublicPosts } from "@/server/services/image-post";
import { PostCard, type PostCardPost } from "@/components/gallery/post-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Users, FileImage, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Browse astrophotography from the community and manage your own posts.",
};

export default async function GalleryPage() {
  const session = await auth();
  const [myPosts, publicPosts] = await Promise.all([
    session?.user?.id ? listMyPosts(session.user.id) : Promise.resolve([]),
    listPublicPosts({ limit: 50 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
        <p className="mt-2 text-muted-foreground">
          {session
            ? "Your posts and community astrophotography."
            : "Community astrophotography from Lumigraph."}
        </p>
      </header>

      {session && (
        <>
          <section aria-labelledby="your-posts-heading" className="mb-14">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="your-posts-heading" className="text-xl font-semibold">
                  Your posts
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your drafts and published posts in one place.
                </p>
              </div>
              <Button asChild className="w-fit gap-2 sm:mt-0 mt-2">
                <Link href="/posts/new">
                  <Plus className="size-4" aria-hidden />
                  New draft
                </Link>
              </Button>
            </div>
            {myPosts.length > 0 ? (
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {myPosts.map((post: PostCardPost) => (
                  <li key={post.id}>
                    <PostCard
                      post={{
                        id: post.id,
                        slug: post.slug,
                        title: post.title,
                        visibility: post.visibility,
                        finalImageThumbUrl: post.finalImageThumbUrl,
                        targetName: post.targetName,
                        targetType: post.targetType,
                        captureDate: post.captureDate,
                        updatedAt: post.updatedAt,
                      }}
                      hrefBase="/posts"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div
                className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 py-16 px-4"
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
          </section>

          <Separator className="my-12" />
        </>
      )}

      <section aria-labelledby="community-heading">
        <h2 id="community-heading" className="text-xl font-semibold">
          Community
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Public posts from everyone on Lumigraph.
        </p>
        {publicPosts.length > 0 ? (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publicPosts.map((post: PostCardPost) => (
              <li key={post.id}>
                <PostCard
                  post={{
                    id: post.id,
                    slug: post.slug,
                    title: post.title,
                    visibility: post.visibility,
                    finalImageThumbUrl: post.finalImageThumbUrl,
                    targetName: post.targetName,
                    targetType: post.targetType,
                    captureDate: post.captureDate,
                    updatedAt: post.updatedAt,
                  }}
                  hrefBase="/posts"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 py-16 px-4"
            role="status"
            aria-label="No public posts yet"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-foreground">
              No public posts yet
            </p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              When someone publishes an image, it will appear here.
            </p>
            {!session && (
              <Button asChild className="mt-6" size="lg">
                <Link href="/auth/signin">Sign in to get started</Link>
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
