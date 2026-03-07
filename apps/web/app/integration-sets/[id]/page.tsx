import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "auth";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMyPosts } from "@/server/services/posts";
import { getIntegrationSetForOwner } from "@/server/services/integration-sets";
import { listAssetsByIntegrationSetForOwner } from "@/server/services/assets";
import { listDownloadJobsForIntegrationSetForOwner } from "@/server/services/download-jobs";
import { IntegrationSetForm } from "@/components/integration-sets/integration-set-form";
import { IntegrationAssetUpload } from "@/components/integration-sets/integration-asset-upload";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Integration Set ${id}` };
}

export default async function IntegrationSetDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/integration-sets/${id}`);
  }

  const [set, posts, assets, downloadJobs] = await Promise.all([
    getIntegrationSetForOwner(id, session.user.id),
    listMyPosts(session.user.id),
    listAssetsByIntegrationSetForOwner(id, session.user.id),
    listDownloadJobsForIntegrationSetForOwner(id, session.user.id),
  ]);
  if (!set || !assets || !downloadJobs) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/integration-sets" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to integration sets
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">{set.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Private integration set. Upload files or folders and browse by path.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <IntegrationAssetUpload
          integrationSetId={set.id}
          assets={assets.map((asset) => ({
            id: asset.id,
            relativePath: asset.relativePath,
            filename: asset.filename,
            contentType: asset.contentType,
            sizeBytes: Number(asset.sizeBytes),
            kind: asset.kind,
            createdAt: asset.createdAt.toISOString(),
          }))}
          downloadJobs={downloadJobs}
        />

        <IntegrationSetForm
          mode="edit"
          integrationSetId={set.id}
          initialTitle={set.title}
          initialNotes={set.notes}
          initialPostId={set.postId}
          postOptions={posts.map((post) => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
          }))}
        />
      </div>
    </div>
  );
}
