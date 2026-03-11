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
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-[0.24em] text-cyan-200 uppercase">
            Data Bay
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Integration Sets
          </h1>
          <p className="mt-2 text-muted-foreground">
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
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 p-10 text-center">
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
