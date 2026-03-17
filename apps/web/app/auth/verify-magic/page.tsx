"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth";
import { Button } from "@/components/ui/button";

function VerifyMagicContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    void signIn("magic-link", {
      token,
      callbackUrl,
      redirect: false,
    }).then((result) => {
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (result?.error) setStatus("error");
    });
  }, [token, callbackUrl]);

  if (!token) {
    return (
      <AuthLayout
        title="Invalid link"
        description="This sign-in link is missing or invalid. Request a new one from the sign-in page."
      >
        <Button asChild size="lg" className="h-12 w-full rounded-2xl">
          <Link href="/auth/signin">Back to sign in</Link>
        </Button>
      </AuthLayout>
    );
  }

  if (status === "error") {
    return (
      <AuthLayout
        title="Link expired or invalid"
        description="This sign-in link may have expired or already been used. Request a new one from the sign-in page."
      >
        <Button asChild size="lg" className="h-12 w-full rounded-2xl">
          <Link href="/auth/signin">Back to sign in</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Signing you in…"
      description="Please wait while we sign you in."
    >
      <div className="flex h-12 items-center justify-center" aria-busy="true">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-100"
          aria-hidden
        />
      </div>
    </AuthLayout>
  );
}

export default function VerifyMagicPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
            aria-hidden
          />
        </div>
      }
    >
      <VerifyMagicContent />
    </Suspense>
  );
}
