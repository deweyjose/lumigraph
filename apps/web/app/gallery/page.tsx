import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "auth";
import { listPublicPosts } from "@/server/services/image-post";
import { getFinalImageDisplayUrl } from "@/lib/image-url";
import { PostCard, type PostCardPost } from "@/components/gallery/post-card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Posts",
  description: "Browse public astrophotography from the Lumigraph community.",
};

export default async function GalleryPage() {
  const session = await auth();
  const publicPosts = await listPublicPosts({ limit: 50 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
        <p className="mt-2 text-muted-foreground">
          Public astrophotography from the Lumigraph community.
        </p>
      </header>

      <section aria-labelledby="posts-heading">
        <h2 id="posts-heading" className="sr-only">
          Post cards
        </h2>
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
                    finalImageThumbUrl:
                      getFinalImageDisplayUrl(
                        post.id,
                        post.finalImageThumbUrl,
                        "thumb"
                      ) ?? post.finalImageThumbUrl,
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
