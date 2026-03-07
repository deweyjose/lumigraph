import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { listMyPosts } from "@/server/services/posts";
import { IntegrationSetForm } from "@/components/integration-sets/integration-set-form";

export const metadata: Metadata = {
  title: "New Integration Set",
};

export default async function NewIntegrationSetPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/integration-sets/new");
  }
  const posts = await listMyPosts(session.user.id);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <IntegrationSetForm
        mode="create"
        postOptions={posts.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
        }))}
      />
    </div>
  );
}
