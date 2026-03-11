import { Button } from "@/components/ui/button";

type ProviderButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function ProviderButton({
  icon,
  label,
  onClick,
  disabled,
}: ProviderButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-12 w-full rounded-2xl border-white/10 bg-white/[0.03] text-base font-medium text-slate-100 shadow-none transition hover:border-cyan-200/20 hover:bg-white/[0.06] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="mr-3 flex shrink-0 [&_svg]:size-5" aria-hidden>
        {icon}
      </span>
      {label}
    </Button>
  );
}
