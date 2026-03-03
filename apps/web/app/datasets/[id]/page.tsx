import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "auth";
import { Download } from "lucide-react";
import { getById } from "@/server/services/dataset";
import { listArtifactsByDatasetId } from "@/server/services/artifact";
import { listMyPosts } from "@/server/services/image-post";
import { DatasetVisibilityBadge } from "@/components/datasets/dataset-visibility-badge";
import { DatasetArtifactUpload } from "@/components/datasets/dataset-artifact-upload";
import { DatasetForm } from "@/components/datasets/dataset-form";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number((bytes / Math.pow(k, i)).toFixed(1))} ${["B", "KB", "MB", "GB"][i]}`;
}

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
  const artifacts = await listArtifactsByDatasetId(dataset.id);

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

      {artifacts.length > 0 && (
        <section className="mt-8" aria-labelledby="artifacts-heading">
          <h2 id="artifacts-heading" className="text-lg font-semibold">
            Artifacts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Download integration files (FITS, stacks, etc.).
          </p>
          <ul className="mt-4 space-y-2" role="list">
            {artifacts.map((artifact) => (
              <li
                key={artifact.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3"
              >
                <span className="min-w-0 truncate font-medium">
                  {artifact.filename}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatBytes(Number(artifact.sizeBytes))}
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/api/artifacts/${artifact.id}/download`}
                    download
                    className="inline-flex items-center gap-2"
                  >
                    <Download className="size-4" aria-hidden />
                    Download
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner && (
        <>
          <div className="mt-8">
            <DatasetArtifactUpload datasetId={dataset.id} />
          </div>
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
