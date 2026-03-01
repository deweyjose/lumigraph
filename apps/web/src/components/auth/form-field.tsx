import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  type?: React.ComponentProps<"input">["type"];
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** For password fields, set to true to show "Show password" affordance later if needed */
  inputClassName?: string;
} & Omit<
  React.ComponentProps<"input">,
  "id" | "type" | "name" | "value" | "onChange" | "placeholder" | "required" | "disabled" | "aria-invalid" | "aria-describedby"
>;

export function FormField({
  id,
  label,
  type = "text",
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  required,
  disabled,
  error,
  inputClassName,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={required ? "after:content-['*'] after:ml-0.5 after:text-destructive" : undefined}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        name={name ?? id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn("h-12 bg-card/80 text-base", inputClassName)}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
