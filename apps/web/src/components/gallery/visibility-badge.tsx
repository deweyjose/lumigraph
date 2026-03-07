import { cn } from "@/lib/utils";

export type PostStatus = "DRAFT" | "PUBLISHED";

const visibilityConfig: Record<
  PostStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "bg-amber-500/20 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400 border border-amber-500/30",
  },
  PUBLISHED: {
    label: "Published",
    className:
      "bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400 border border-emerald-500/30",
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
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
