import Link from "next/link";
import { Telescope } from "lucide-react";
import { UserNav } from "@/components/user-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <Telescope className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none">Lumigraph</span>
              <span className="text-xs font-normal tracking-[0.16em] text-muted-foreground uppercase">
                Astrophotography workspace
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm md:flex">
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Link
              href="/gallery"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Browse Posts
            </Link>
            <Link
              href="/#workspace"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Workspace
            </Link>
            <Link
              href="/#features"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
          </nav>
        </div>
        <UserNav />
      </div>
    </header>
  );
}
