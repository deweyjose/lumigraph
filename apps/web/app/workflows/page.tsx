import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listWorkflowDefinitionsForOwner } from "@/server/services/workflow-definitions";

export const metadata: Metadata = {
  title: "Workflows",
  description: "Private workflow definitions for astrophotography processing.",
};

export default async function WorkflowsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/workflows");
  }

  const definitions = await listWorkflowDefinitionsForOwner(session.user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="mt-2 text-muted-foreground">
            Capture repeatable astrophotography workflows for posts and
            integration sets.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/workflows/new">
            <Plus className="size-4" aria-hidden />
            New workflow
          </Link>
        </Button>
      </header>

      {definitions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No workflows yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start by defining a reusable checklist or processing sequence.
          </p>
          <Button asChild className="mt-6">
            <Link href="/workflows/new">Create workflow</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {definitions.map((definition) => (
            <li key={definition.id} className="rounded-lg border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{definition.title}</h2>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {definition.status} · {definition.subjectType ?? "GENERIC"}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {definition.stepCount} step
                  {definition.stepCount === 1 ? "" : "s"}
                </span>
              </div>
              {definition.description && (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                  {definition.description}
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Updated {new Date(definition.updatedAt).toLocaleString()}
              </p>
              <div className="mt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/workflows/${definition.id}`}>Open</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
