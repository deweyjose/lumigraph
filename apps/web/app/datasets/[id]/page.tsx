import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "auth";
import { getById } from "@/server/services/dataset";
import { listMyPosts } from "@/server/services/image-post";
import { DatasetVisibilityBadge } from "@/components/datasets/dataset-visibility-badge";
import { DatasetForm } from "@/components/datasets/dataset-form";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const dataset = await getById(id);
  if (!dataset) return { title: "Dataset" };
  return { title: `${dataset.title} | Dataset` };
}

export default async function DatasetDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const dataset = await getById(id);

  if (!dataset) notFound();
  const isOwner = session?.user?.id === dataset.userId;
  if (!isOwner) notFound();

  const myPosts = await listMyPosts(session!.user!.id);
  const formPosts = myPosts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <DatasetVisibilityBadge visibility={dataset.visibility} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{dataset.title}</h1>
      {dataset.description && (
        <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
          {dataset.description}
        </p>
      )}

      {isOwner && (
        <>
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Edit dataset</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update title, description, visibility, or linked post.
            </p>
            <div className="mt-4">
              <DatasetForm
                mode="edit"
                datasetId={dataset.id}
                initialTitle={dataset.title}
                initialDescription={dataset.description}
                initialVisibility={dataset.visibility}
                initialImagePostId={dataset.imagePostId ?? ""}
                myPosts={formPosts}
              />
            </div>
          </div>
          <div className="mt-10 flex gap-3">
            <Button asChild variant="secondary">
              <Link href="/datasets">Back to Datasets</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/datasets/new">New dataset</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
