import Link from "next/link";
import { Telescope } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
};

export function BrandMark({
  href = "/",
  subtitle = "Astrophotography workspace",
  compact = false,
  className,
}: BrandMarkProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl border border-white/10 bg-white/5",
          compact ? "h-10 w-10" : "h-11 w-11"
        )}
      >
        <Telescope
          className={cn(
            compact ? "h-4 w-4 text-cyan-200" : "h-5 w-5 text-cyan-200"
          )}
        />
      </span>
      <span>
        <span
          className={cn(
            "block font-semibold text-white",
            compact ? "text-sm" : "text-sm"
          )}
        >
          Lumigraph
        </span>
        <span className="block text-xs text-slate-400">{subtitle}</span>
      </span>
    </Link>
  );
}
