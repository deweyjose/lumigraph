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
      className="h-12 w-full border-border/60 bg-card/80 text-base font-medium shadow-sm transition hover:border-primary/30 hover:bg-card"
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
