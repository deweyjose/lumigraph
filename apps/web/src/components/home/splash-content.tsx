import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Telescope, Upload, Eye } from "lucide-react";

/**
 * Logged-out splash screen. Per contracts/home-page-ui.md:
 * - Hero with title, tagline, primary CTA
 * - Primary CTA: "Browse Posts" only (no login button in main content)
 * - Login is in header (UserNav) only
 */
export function SplashContent() {
  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        <div className="flex flex-col items-center gap-4">
          <Telescope className="h-12 w-12 text-primary" strokeWidth={1.5} />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Lumigraph
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
            Publish your astrophotography. Share integration data. Document your
            processing journey.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/gallery">Browse Posts</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-20 md:grid-cols-3">
        <FeatureCard
          icon={<Telescope className="h-8 w-8" />}
          title="Publish"
          description="Share your final processed images with rich metadata — target info, acquisition details, and Bortle class."
        />
        <FeatureCard
          icon={<Upload className="h-8 w-8" />}
          title="Upload"
          description="Store integration masters, calibration frames, and intermediate stacks in organized integration sets with folder browsing."
        />
        <FeatureCard
          icon={<Eye className="h-8 w-8" />}
          title="Discover"
          description="Browse a curated gallery of astrophotography from the community. Explore targets, posts, and integration data."
        />
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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-6 text-center">
      <div className="text-primary">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
