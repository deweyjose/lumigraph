export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative py-4">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t border-white/8" />
      </div>
      <p className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
    </div>
  );
}
