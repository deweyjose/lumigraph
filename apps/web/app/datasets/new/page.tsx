import { redirect } from "next/navigation";
import { auth } from "auth";
import { listMyPosts } from "@/server/services/image-post";
import { DatasetForm } from "@/components/datasets/dataset-form";

export const metadata = {
  title: "New dataset",
  description: "Create a new dataset for integration files.",
};

export default async function NewDatasetPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/datasets/new");
  }

  const myPosts = await listMyPosts(session.user.id);
  const formPosts = myPosts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
  }));

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">New dataset</h1>
      <p className="mt-1 text-muted-foreground">
        Create a dataset to store integration artifacts. You can link it to an
        image post later.
      </p>
      <div className="mt-8">
        <DatasetForm mode="create" myPosts={formPosts} />
      </div>
    </div>
  );
}
