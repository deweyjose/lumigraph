import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { CalendarClock, Files, FolderOpen, Link2, Plus } from "lucide-react";
import { listMyIntegrationSets } from "@/server/services/integration-sets";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Integration Sets",
  description: "Your astrophotography integration data in S3.",
};

type IntegrationSetListItem = Awaited<
  ReturnType<typeof listMyIntegrationSets>
>[number];

function formatUpdatedAt(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function IntegrationSetsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/integration-sets");
  }
  const sets = await listMyIntegrationSets(session.user.id);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <header className="mb-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium tracking-[0.24em] text-cyan-200 uppercase">
              Data Bay
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Integration Sets
            </h1>
            <p className="mt-2 text-muted-foreground">
              Organize lights, darks, flats, and calibration data for each
              imaging session.
            </p>
          </div>
          <Button asChild className="mt-2 w-fit gap-2 sm:mt-0">
            <Link href="/integration-sets/new">
              <Plus className="size-4" aria-hidden />
              New integration set
            </Link>
          </Button>
        </div>
      </header>

      {sets.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-16"
          role="status"
          aria-label="No integration sets yet"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 text-center text-sm font-medium text-foreground">
            No integration sets yet
          </p>
          <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
            Start a set to organize source frames, track notes, and prepare
            exports for processing or delivery.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/integration-sets/new">Create your first set</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sets.map((set: IntegrationSetListItem) => (
            <li key={set.id}>
              <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/4 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors hover:border-white/15 hover:bg-white/[0.055]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-[0.24em] text-cyan-200 uppercase">
                      Integration set
                    </p>
                    <h2 className="mt-2 truncate text-lg font-semibold text-white">
                      {set.title}
                    </h2>
                  </div>
                  <div className="rounded-full border border-cyan-200/15 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-50">
                    {set._count.assets}{" "}
                    {set._count.assets === 1 ? "file" : "files"}
                  </div>
                </div>

                {set.notes ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {set.notes}
                  </p>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    No notes yet. Add capture details, calibration context, or
                    processing reminders.
                  </p>
                )}

                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
                    <Files className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                        Assets
                      </dt>
                      <dd className="mt-1 text-slate-200">
                        {set._count.assets} stored{" "}
                        {set._count.assets === 1 ? "file" : "files"}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
                    <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                        Linked post
                      </dt>
                      <dd className="mt-1 text-slate-200">
                        {set.post ? set.post.title : "Not linked yet"}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                        Updated
                      </dt>
                      <dd className="mt-1 text-slate-200">
                        {formatUpdatedAt(set.updatedAt)}
                      </dd>
                    </div>
                  </div>
                </dl>

                <div className="mt-6 flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-slate-500">
                    Open to manage files, notes, and exports.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/integration-sets/${set.id}`}>Open</Link>
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
