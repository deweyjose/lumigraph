import Link from "next/link";
import { Telescope } from "lucide-react";
import { UserNav } from "@/components/user-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/6 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-cyan-100">
              <Telescope className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none text-white">Lumigraph</span>
              <span className="text-xs font-normal tracking-[0.16em] text-slate-400 uppercase">
                Astrophotography workspace
              </span>
            </div>
          </Link>

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
