import type { PostCardPost } from "@/components/gallery/post-card";
import {
  estimateS3MonthlyUsd,
  formatBytes,
  formatUsd,
  summarizeIntegrationAssets,
  type IntegrationAssetSummaryInput,
} from "@/lib/integration-asset-summary";
import type { PostWithLinkedIntegrationSummaries } from "@/server/services/posts";

export type LinkedIntegrationSetForSummary = {
  id: string;
  title: string;
  /** Integration-set notes (same field as on the set detail page). */
  notes: string | null;
  assets: IntegrationAssetSummaryInput[];
};

/** Normalize Prisma post → integrationSets (with assets) for summary components. */
export function mapPostIntegrationSetsForSummary(
  sets: Array<{
    id: string;
    title: string;
    notes?: string | null;
    assets: Array<{
      relativePath: string;
      filename: string;
      contentType: string;
      sizeBytes: bigint | number;
    }>;
  }>
): LinkedIntegrationSetForSummary[] {
  return sets.map((set) => ({
    id: set.id,
    title: set.title,
    notes: set.notes ?? null,
    assets: set.assets.map((a) => ({
      relativePath: a.relativePath,
      filename: a.filename,
      contentType: a.contentType,
      sizeBytes: a.sizeBytes,
    })),
  }));
}

/** Compact lines for workspace post cards (drafts). */
export type LinkedIntegrationCardPreview = {
  setId: string;
  setTitle: string;
  notes: string | null;
  fileCount: number;
  sizeLabel: string;
  monthlyCostLabel: string;
  folderLine: string;
  typeLine: string;
};

export function buildLinkedIntegrationCardPreviews(
  sets: LinkedIntegrationSetForSummary[]
): LinkedIntegrationCardPreview[] {
  return sets.map((set) => {
    const inv = summarizeIntegrationAssets(set.assets);
    const monthly = estimateS3MonthlyUsd(inv.totalBytes);
    const folderLine =
      inv.byFolder.length > 0
        ? inv.byFolder
            .slice(0, 4)
            .map((f) => `${f.folder} (${f.fileCount})`)
            .join(" · ")
        : "";
    const typeLine =
      inv.byType.length > 0
        ? inv.byType
            .slice(0, 5)
            .map((t) => `${t.label} ×${t.fileCount}`)
            .join(" · ")
        : "";
    return {
      setId: set.id,
      setTitle: set.title,
      notes: set.notes?.trim() ? set.notes.trim() : null,
      fileCount: inv.totalFiles,
      sizeLabel: formatBytes(inv.totalBytes),
      monthlyCostLabel: formatUsd(monthly),
      folderLine,
      typeLine,
    };
  });
}

/** Workspace drafts page: maps persisted posts to card props (keeps shaping out of the page). */
export function draftWorkspacePostsToCardViews(
  posts: PostWithLinkedIntegrationSummaries[]
): Array<{
  post: PostCardPost;
  linkedIntegrations: LinkedIntegrationCardPreview[] | undefined;
}> {
  return posts.map((post) => {
    const cardPost: PostCardPost = {
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
    };
    const linkedIntegrations = buildLinkedIntegrationCardPreviews(
      mapPostIntegrationSetsForSummary(post.integrationSets)
    );
    return {
      post: cardPost,
      linkedIntegrations:
        linkedIntegrations.length > 0 ? linkedIntegrations : undefined,
    };
  });
}
