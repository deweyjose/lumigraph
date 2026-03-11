import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { UserNav } from "@/components/user-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/6 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <BrandMark />

          <nav className="hidden items-center gap-5 text-sm md:flex">
            <Link
              href="/"
              className="text-slate-400 transition-colors hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/gallery"
              className="text-slate-400 transition-colors hover:text-white"
            >
              Browse Posts
            </Link>
            <Link
              href="/#workspace"
              className="text-slate-400 transition-colors hover:text-white"
            >
              Workspace
            </Link>
            <Link
              href="/#features"
              className="text-slate-400 transition-colors hover:text-white"
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
