import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatasetVisibilityBadge, type DatasetVisibility } from "./dataset-visibility-badge";
import { Database } from "lucide-react";

export type DatasetCardDataset = {
  id: string;
  title: string;
  description: string | null;
  visibility: DatasetVisibility;
  updatedAt: Date;
};

type DatasetCardProps = {
  dataset: DatasetCardDataset;
};

export function DatasetCard({ dataset }: DatasetCardProps) {
  const descriptionSnippet = dataset.description
    ? dataset.description.slice(0, 120) + (dataset.description.length > 120 ? "…" : "")
    : null;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <Link
        href={`/datasets/${dataset.id}`}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl"
        aria-label={`View dataset: ${dataset.title}`}
      >
        <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-6 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Database className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <DatasetVisibilityBadge visibility={dataset.visibility} />
            </div>
          </div>
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2 text-base font-semibold">
            {dataset.title}
          </CardTitle>
          {descriptionSnippet && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {descriptionSnippet}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Updated{" "}
            <time dateTime={dataset.updatedAt.toISOString()}>
              {new Date(dataset.updatedAt).toLocaleDateString()}
            </time>
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}
