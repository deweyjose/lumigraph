import { cn } from "@/lib/utils";

export type DatasetVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

const visibilityConfig: Record<
  DatasetVisibility,
  { label: string; className: string }
> = {
  PRIVATE: {
    label: "Private",
    className: "bg-muted text-muted-foreground border border-border",
  },
  UNLISTED: {
    label: "Unlisted",
    className: "bg-secondary text-secondary-foreground border border-border",
  },
  PUBLIC: {
    label: "Public",
    className:
      "bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400 border border-emerald-500/30",
  },
};

export function DatasetVisibilityBadge({
  visibility,
  className,
}: {
  visibility: DatasetVisibility;
  className?: string;
}) {
  const config = visibilityConfig[visibility] ?? visibilityConfig.PRIVATE;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
      aria-label={`Visibility: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
