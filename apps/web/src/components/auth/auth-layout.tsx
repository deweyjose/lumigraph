import Link from "next/link";
import {
  Telescope,
  ArrowLeft,
  Orbit,
  FileStack,
  GalleryVerticalEnd,
} from "lucide-react";

type AuthLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Optional icon override; defaults to Telescope */
  icon?: React.ReactNode;
};

export function AuthLayout({
  title,
  description,
  children,
  icon,
}: AuthLayoutProps) {
  return (
    <div
      className="relative flex min-h-[calc(100vh-8rem)] items-center px-4 py-10"
      suppressHydrationWarning
    >
      <div
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_24%),linear-gradient(180deg,rgba(6,12,25,1),rgba(9,14,23,1))]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]"
        aria-hidden
      />

      <div className="w-full max-w-6xl" suppressHydrationWarning>
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          suppressHydrationWarning
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to home
        </Link>

        <div className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(8,15,28,0.88))] shadow-[0_30px_90px_rgba(2,8,23,0.55)] lg:grid lg:grid-cols-[0.92fr_1.08fr]">
          <section className="relative hidden border-r border-white/8 p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_32%)]" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/10 bg-white/5">
                  <Telescope className="size-7 text-cyan-100" aria-hidden />
                </span>
                <div>
                  <p className="text-2xl font-semibold text-white">Lumigraph</p>
                  <p className="text-sm text-slate-400">
                    Astrophotography workspace
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-4">
                <p className="text-xs font-medium tracking-[0.24em] text-cyan-100 uppercase">
                  Workspace access
                </p>
                <h2 className="max-w-md text-4xl font-semibold tracking-tight text-white">
                  The same mission-control shell starts here.
                </h2>
                <p className="max-w-md text-base leading-7 text-slate-400">
                  Sign in to manage drafts, publish finished images, keep source
                  data organized, and return to Astro Hub with your observing
                  context intact.
                </p>
              </div>
            </div>

            <div className="relative grid gap-3">
              <AuthFeature
                icon={<Orbit className="size-4" />}
                title="Astro Hub"
                detail="Daily sky context, live modules, and target awareness."
              />
              <AuthFeature
                icon={<FileStack className="size-4" />}
                title="Drafts and posts"
                detail="Move from working notes to published astrophotography."
              />
              <AuthFeature
                icon={<GalleryVerticalEnd className="size-4" />}
                title="Integration sets"
                detail="Keep frames, exports, and calibration data attached to the work."
              />
            </div>
          </section>

          <section className="relative p-6 sm:p-8 lg:p-10">
            <div
              className="mb-8 text-center lg:text-left"
              suppressHydrationWarning
            >
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[22px] border border-cyan-200/20 bg-cyan-400/10 text-cyan-100">
                {icon ?? <Telescope className="size-7" aria-hidden />}
              </div>
              <h1
                className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
                suppressHydrationWarning
              >
                {title}
              </h1>
              {description && (
                <p
                  className="mt-3 max-w-xl text-base leading-7 text-slate-400"
                  suppressHydrationWarning
                >
                  {description}
                </p>
              )}
            </div>

            <div className="rounded-[28px] border border-white/8 bg-black/10 p-5 sm:p-6">
              {children}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AuthFeature({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-400/10 text-cyan-100">
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}
