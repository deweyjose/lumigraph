import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Eye,
  FileStack,
  Orbit,
  Sparkles,
  Telescope,
  Upload,
} from "lucide-react";

/**
 * Logged-out splash screen. Per contracts/home-page-ui.md:
 * - Hero with title, tagline, and product-marketing CTA
 * - Logged-out state explains each workspace surface in-place
 */
export function SplashContent() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_28%)]" />

      <section
        id="astro-hub"
        className="mx-auto grid min-h-[76vh] max-w-7xl gap-14 px-5 pb-18 pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center"
      >
        <div className="flex flex-col gap-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200/15 bg-white/5 px-3 py-1 text-xs font-medium tracking-[0.2em] text-cyan-100 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Astrophotography workspace
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-3 text-cyan-100">
              <Telescope className="h-9 w-9" strokeWidth={1.6} />
              <span className="text-lg font-semibold tracking-[0.18em] uppercase text-white/85">
                Lumigraph
              </span>
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance text-white sm:text-6xl lg:text-7xl">
              Publish the sky with the story behind the image.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Lumigraph brings posts, integration data, drafts, and a
              mission-control home base into one astrophotography workspace.
              Capture the story behind each image before you decide what is
              ready to share.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full border border-cyan-200/20 bg-cyan-400/12 px-7 text-cyan-50 hover:bg-cyan-400/20"
            >
              <Link href="/auth/signin">
                Sign in to start
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/10 bg-white/4 px-7 text-slate-100 hover:bg-white/8 hover:text-white dark:border-white/10 dark:bg-white/4 dark:hover:bg-white/8"
            >
              <Link href="/#posts">See how posts work</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Astro Hub" value="Live home base" />
            <Metric label="Posts" value="Published stories" />
            <Metric label="Integration Sets" value="Private source data" />
          </div>
        </div>

        <section className="relative rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
          <div className="grid gap-4">
            <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,19,35,0.98),rgba(9,13,24,0.94))] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium tracking-[0.24em] text-cyan-100 uppercase">
                    Mission control
                  </p>
                  <h2 className="text-2xl font-semibold text-white">
                    Astro Hub
                  </h2>
                  <p className="max-w-sm text-sm leading-6 text-slate-400">
                    Start with today&apos;s sky, orbital telemetry, and your
                    next target instead of a blank dashboard.
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-200/20 bg-cyan-400/10 p-3 text-cyan-100">
                  <Orbit className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <PreviewTile
                  title="Daily sky brief"
                  meta="Sunset 7:18 PM"
                  detail="Lunar illumination 14% • Seeing fair • Transparency good"
                />
                <PreviewTile
                  title="ISS pass"
                  meta="Visible in 43 min"
                  detail="Max elevation 61° • WNW to SE"
                />
                <PreviewTile
                  title="Tonight's targets"
                  meta="M101, NGC 7000"
                  detail="Meridian transit window highlighted for your session plan"
                />
                <PreviewTile
                  title="Astronomy calendar"
                  meta="Next event: Lyrids"
                  detail="Peak forecast, moon phase, and local observing guidance"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Drafts and publishing
                    </p>
                    <p className="text-sm text-slate-400">
                      Write once, refine metadata, publish when the image is
                      ready.
                    </p>
                  </div>
                  <FileStack className="h-5 w-5 text-cyan-100" />
                </div>
                <div className="mt-4 space-y-3">
                  <WorkspaceRow
                    title="IC 1396 Narrowband"
                    status="Draft"
                    detail="Final image attached • Processing notes in progress"
                  />
                  <WorkspaceRow
                    title="Rosette Nebula"
                    status="Scheduled"
                    detail="Description polished • Metadata review remaining"
                  />
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Integration sets
                    </p>
                    <p className="text-sm text-slate-400">
                      Keep masters, stacks, and calibration assets attached to
                      the work.
                    </p>
                  </div>
                  <Upload className="h-5 w-5 text-cyan-100" />
                </div>
                <div className="mt-4 grid gap-3">
                  <CompactStat label="Folders indexed" value="128" />
                  <CompactStat label="Current target" value="Sh2-155" />
                  <CompactStat label="Export ready" value="Source package" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section id="drafts" className="mx-auto max-w-7xl px-5 pb-8 pt-4">
        <FeaturePanel
          eyebrow="Drafts"
          title="Keep working images private until they are ready."
          description="Drafts hold processing notes, pending metadata, and staging assets so you can iterate before publishing."
          accent={<FileStack className="h-5 w-5 text-cyan-100" />}
          cta={{ href: "/auth/signin", label: "Sign in to start drafting" }}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <PreviewTile
              title="Version notes"
              meta="Private"
              detail="Track edits, crop decisions, and processing changes before anything goes public."
            />
            <PreviewTile
              title="Metadata review"
              meta="Queued"
              detail="Target, telescope, camera, location, and acquisition details stay attached to the draft."
            />
            <PreviewTile
              title="Publish handoff"
              meta="Ready"
              detail="Move the finished image into the public gallery once the story and data are complete."
            />
          </div>
        </FeaturePanel>
      </section>

      <section id="posts" className="mx-auto max-w-7xl px-5 py-8">
        <FeaturePanel
          eyebrow="Posts"
          title="Posts turn a finished image into a proper published record."
          description="A post is where the final image, the observing story, and the core target metadata come together. Keep the draft private while you iterate, then publish when the work is ready."
          accent={<Eye className="h-5 w-5 text-cyan-100" />}
          cta={{ href: "/auth/signin", label: "Sign in to publish posts" }}
        >
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    Published image record
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    A post combines the final image with target details, capture
                    metadata, and the narrative behind the processing decisions.
                  </p>
                </div>
                <Eye className="h-5 w-5 text-cyan-100" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CompactStat
                  label="Target metadata"
                  value="Object, type, night, equipment"
                />
                <CompactStat
                  label="Final asset"
                  value="Processed image with thumbnail"
                />
                <CompactStat
                  label="Story"
                  value="Description and processing notes"
                />
                <CompactStat
                  label="Visibility"
                  value="Shared only when you publish"
                />
              </div>
            </div>
            <div className="grid gap-3">
              <PreviewTile
                title="Draft -> Post"
                meta="Review"
                detail="Work privately until the image, metadata, and copy are ready for the published version."
              />
              <PreviewTile
                title="Single source of truth"
                meta="Structured"
                detail="The published post carries the image, target facts, and narrative together instead of scattering them across tools."
              />
              <PreviewTile
                title="Later public gallery"
                meta="Planned"
                detail="Community browsing can come later. Right now Posts are part of the signed-in workspace flow."
              />
            </div>
          </div>
        </FeaturePanel>
      </section>

      <section id="integration-sets" className="mx-auto max-w-7xl px-5 py-8">
        <FeaturePanel
          eyebrow="Integration Sets"
          title="Organize source frames, calibration data, and exports in one place."
          description="Keep the raw side of the work close to the final image instead of burying it in local folders."
          accent={<Upload className="h-5 w-5 text-cyan-100" />}
          cta={{ href: "/auth/signin", label: "Sign in to manage frames" }}
        >
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    Source package
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Lights, darks, flats, masters, and intermediate exports
                    grouped by target.
                  </p>
                </div>
                <Upload className="h-5 w-5 text-cyan-100" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CompactStat
                  label="Folder structure"
                  value="Target / Night / Filters"
                />
                <CompactStat
                  label="Export package"
                  value="Ready for collaborators"
                />
                <CompactStat label="Link to post" value="Not published yet" />
                <CompactStat label="Retention" value="Private workspace data" />
              </div>
            </div>
            <div className="grid gap-3">
              <FeatureCard
                icon={<Upload className="h-8 w-8" />}
                title="Keep the source data"
                description="Store integration masters, calibration frames, and intermediate stacks in organized integration sets instead of scattering them across folders."
              />
            </div>
          </div>
        </FeaturePanel>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 pb-18 pt-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <FeatureCard
            icon={<Telescope className="h-8 w-8" />}
            title="Publish with context"
            description="Turn a finished image into a proper record with target metadata, acquisition details, processing notes, and final asset management."
          />
          <FeatureCard
            icon={<Upload className="h-8 w-8" />}
            title="Private data where it belongs"
            description="Separate public-facing posts from the source files and work-in-progress artifacts that support them."
          />
          <FeatureCard
            icon={<Eye className="h-8 w-8" />}
            title="Discover stronger work"
            description="Move from private drafts to published image stories without losing the richer workspace context behind them."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-7 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-400/10 text-cyan-100">
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function PreviewTile({
  title,
  meta,
  detail,
}: {
  title: string;
  meta: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-white">{title}</p>
        <span className="text-xs text-cyan-100">{meta}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

function WorkspaceRow({
  title,
  status,
  detail,
}: {
  title: string;
  status: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-white">{title}</p>
        <span className="rounded-full border border-cyan-200/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-100">
          {status}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
      <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function FeaturePanel({
  eyebrow,
  title,
  description,
  accent,
  cta,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent: React.ReactNode;
  cta: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/8 bg-white/[0.025] p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)] sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-cyan-100 uppercase">
            {accent}
            {eyebrow}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-400">
            {description}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="rounded-full border-white/10 bg-white/4 px-6 text-slate-100 hover:bg-white/8 hover:text-white dark:border-white/10 dark:bg-white/4 dark:hover:bg-white/8"
        >
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}
