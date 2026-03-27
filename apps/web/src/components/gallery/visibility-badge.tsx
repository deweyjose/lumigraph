import { cn } from "@/lib/utils";

export type PostStatus = "DRAFT" | "PUBLISHED";

const visibilityConfig: Record<
  PostStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "border-amber-400/35 bg-amber-400/14 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  },
  PUBLISHED: {
    label: "Published",
    className:
      "border-emerald-400/35 bg-emerald-400/14 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  },
};

export function VisibilityBadge({
  visibility: status,
  className,
}: {
  visibility: PostStatus;
  className?: string;
}) {
  const config = visibilityConfig[status] ?? visibilityConfig.DRAFT;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase backdrop-blur-md",
        config.className,
        className
      )}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
