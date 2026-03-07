import Link from "next/link";
import { Telescope } from "lucide-react";
import { UserNav } from "@/components/user-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Telescope className="h-5 w-5 text-primary" />
            <span>Lumigraph</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link
              href="/integration-sets"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Integration Sets
            </Link>
            <Link
              href="/drafts"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Drafts
            </Link>
            <Link
              href="/gallery"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Posts
            </Link>
          </nav>
        </div>
        <UserNav />
      </div>
    </header>
  );
}
