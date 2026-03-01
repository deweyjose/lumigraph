import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { listMyDatasets } from "@/server/services/dataset";
import { DatasetCard } from "@/components/datasets/dataset-card";
import { Button } from "@/components/ui/button";
import { Database, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Datasets",
  description:
    "Manage your integration datasets. Create and edit datasets, then upload artifacts.",
};

export default async function DatasetsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/datasets");
  }

  const datasets = await listMyDatasets(session.user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Datasets</h1>
        <p className="mt-2 text-muted-foreground">
          Create and manage datasets for integration files (FITS, stacks, etc.).
          You can link a dataset to an image post or keep it standalone.
        </p>
      </header>

      <section aria-labelledby="your-datasets-heading" className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="your-datasets-heading" className="text-xl font-semibold">
            Your datasets
          </h2>
          <Button asChild className="w-fit gap-2 sm:mt-0 mt-2">
            <Link href="/datasets/new">
              <Plus className="size-4" aria-hidden />
              New dataset
            </Link>
          </Button>
        </div>

        {datasets.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {datasets.map((d) => (
              <li key={d.id}>
                <DatasetCard
                  dataset={{
                    id: d.id,
                    title: d.title,
                    description: d.description,
                    visibility: d.visibility,
                    updatedAt: d.updatedAt,
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 py-16 px-4"
            role="status"
            aria-label="No datasets yet"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-foreground">
              You don&apos;t have any datasets yet
            </p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Create a dataset to upload integration artifacts.
            </p>
            <Button asChild className="mt-6" size="lg">
              <Link href="/datasets/new">New dataset</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
