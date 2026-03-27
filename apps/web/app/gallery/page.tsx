import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { listPublicPosts } from "@/server/services/posts";
import { PostCard, type PostCardPost } from "@/components/gallery/post-card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Posts",
  description: "Browse public astrophotography from the Lumigraph community.",
};

export default async function GalleryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/gallery");
  }
  const publicPosts = await listPublicPosts({ limit: 50 });

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <header className="mb-10 max-w-3xl">
        <p className="text-xs font-medium tracking-[0.24em] text-cyan-200 uppercase">
          Explore
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Posts
        </h1>
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
              <li key={post.id} className="h-full">
                <PostCard
                  post={{
                    id: post.id,
                    slug: post.slug,
                    title: post.title,
                    description: post.description,
                    status: post.status,
                    finalImageAssetId: post.finalImageAssetId,
                    finalThumbAssetId: post.finalThumbAssetId,
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
            className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-16"
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
            <Button asChild className="mt-6" size="lg">
              <Link href="/posts/new">Create the first post</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
