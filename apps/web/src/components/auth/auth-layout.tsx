import Link from "next/link";
import { Telescope, ArrowLeft } from "lucide-react";

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
      className="relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-12"
      suppressHydrationWarning
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,var(--primary)/15%,transparent)]"
        aria-hidden
      />

      <div className="w-full max-w-[400px]" suppressHydrationWarning>
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          suppressHydrationWarning
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to home
        </Link>

        <div className="mb-8 text-center" suppressHydrationWarning>
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            {icon ?? <Telescope className="size-7 text-primary" aria-hidden />}
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
            suppressHydrationWarning
          >
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-muted-foreground" suppressHydrationWarning>
              {description}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
