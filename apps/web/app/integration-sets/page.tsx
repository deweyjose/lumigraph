import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { Plus, FolderOpen } from "lucide-react";
import { listMyIntegrationSets } from "@/server/services/integration-sets";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Integration Sets",
  description: "Your astrophotography integration data in S3.",
};

export default async function IntegrationSetsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/integration-sets");
  }
  const sets = await listMyIntegrationSets(session.user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Integration Sets
          </h1>
          <p className="mt-1 text-muted-foreground">
            Organize lights, darks, flats, and calibration data.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/integration-sets/new">
            <Plus className="size-4" /> New integration set
          </Link>
        </Button>
      </header>

      {sets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No integration sets yet.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {sets.map((set) => (
            <li key={set.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{set.title}</h2>
                <span className="text-xs text-muted-foreground">
                  {set._count.assets} files
                </span>
              </div>
              {set.notes && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {set.notes}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {set.post ? `Linked post: ${set.post.title}` : "Not linked"}
              </p>
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/integration-sets/${set.id}`}>Open</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
