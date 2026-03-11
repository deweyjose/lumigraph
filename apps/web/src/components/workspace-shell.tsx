"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ChartNoAxesCombined,
  FilePenLine,
  GalleryVerticalEnd,
  Telescope,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { UserNav } from "@/components/user-nav";
import { cn } from "@/lib/utils";

type WorkspaceShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    href: "/",
    label: "Astro Hub",
    description: "Live astronomy context",
    icon: Telescope,
  },
  {
    href: "/drafts",
    label: "Drafts",
    description: "Your working images",
    icon: FilePenLine,
  },
  {
    href: "/gallery",
    label: "Posts",
    description: "Published work",
    icon: GalleryVerticalEnd,
  },
  {
    href: "/integration-sets",
    label: "Integration Sets",
    description: "Frames and exports",
    icon: ChartNoAxesCombined,
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_22%),linear-gradient(180deg,rgba(6,12,25,1),rgba(9,14,23,1))]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/6 bg-black/20 lg:flex lg:flex-col">
          <div className="flex h-20 items-center border-b border-white/6 px-6">
            <BrandMark />
          </div>

          <div className="flex-1 px-4 py-5">
            <p className="px-3 text-[11px] font-medium tracking-[0.24em] text-slate-500 uppercase">
              Workspace
            </p>
            <nav className="mt-4 space-y-1.5">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors",
                      active
                        ? "bg-white/8 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "text-slate-400 hover:bg-white/4 hover:text-slate-100"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border",
                        active
                          ? "border-cyan-200/20 bg-cyan-400/10 text-cyan-100"
                          : "border-white/8 bg-white/3 text-slate-300"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {item.label}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-white/6 px-5 py-4">
            <div className="mb-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
              <p className="text-xs font-medium text-slate-300">
                Mission control
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                One shell for Astro Hub, posts, drafts, and integration data.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-slate-200">Account</p>
                <p className="text-xs text-slate-500">Workspace settings</p>
              </div>
              <UserNav />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-white/8 bg-black/20 lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <BrandMark compact subtitle="Mission control" />
              <UserNav />
            </div>
            <nav className="flex gap-2 overflow-x-auto px-4 pb-4">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                      active
                        ? "border-cyan-200/20 bg-cyan-400/12 text-cyan-50"
                        : "border-white/8 bg-white/4 text-slate-300"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-5">
            <div className="min-h-full overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(8,15,28,0.88))] shadow-[0_18px_70px_rgba(2,8,23,0.45)]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
