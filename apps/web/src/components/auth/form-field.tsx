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
  | "id"
  | "type"
  | "name"
  | "value"
  | "onChange"
  | "placeholder"
  | "required"
  | "disabled"
  | "aria-invalid"
  | "aria-describedby"
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
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium text-slate-100",
          required
            ? "after:content-['*'] after:ml-0.5 after:text-destructive"
            : undefined
        )}
      >
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
        className={cn(
          "h-12 rounded-2xl border-white/10 bg-white/[0.03] text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-200/20 focus-visible:ring-cyan-200/15",
          inputClassName
        )}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-300/90" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
