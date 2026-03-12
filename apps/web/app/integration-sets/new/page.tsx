import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { listMyPosts } from "@/server/services/posts";
import { IntegrationSetForm } from "@/components/integration-sets/integration-set-form";

export const metadata: Metadata = {
  title: "New Integration Set",
};

type PostOption = Awaited<ReturnType<typeof listMyPosts>>[number];

export default async function NewIntegrationSetPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/integration-sets/new");
  }
  const posts = await listMyPosts(session.user.id);
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <IntegrationSetForm
        mode="create"
        postOptions={posts.map((post: PostOption) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
        }))}
      />
    </div>
  );
}
