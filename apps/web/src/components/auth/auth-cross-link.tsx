import Link from "next/link";

type AuthCrossLinkProps = {
  prompt: string;
  href: string;
  label: string;
};

export function AuthCrossLink({ prompt, href, label }: AuthCrossLinkProps) {
  return (
    <p className="mt-6 text-center text-sm text-slate-400">
      {prompt}{" "}
      <Link
        href={href}
        className="font-medium text-cyan-100 underline-offset-4 hover:underline"
      >
        {label}
      </Link>
    </p>
  );
}
