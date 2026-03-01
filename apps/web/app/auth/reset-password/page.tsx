"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { AuthLayout, FormField } from "@/components/auth";
import { Button } from "@/components/ui/button";

const MIN_PASSWORD_LENGTH = 8;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  function validate(): boolean {
    const errors: { password?: string; confirmPassword?: string } = {};
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!token) {
      setError(
        "Invalid or missing reset link. Request a new one from the sign-in page."
      );
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/auth/signin?reset=1");
        return;
      }
      if (res.status === 501 && data.code === "NOT_IMPLEMENTED") {
        setError("Password reset is not yet available.");
        return;
      }
      setError(
        data.message ?? "Failed to reset password. The link may have expired."
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Invalid reset link"
        description="This link is missing or invalid. Request a new password reset from the sign-in page."
      >
        <Button asChild size="lg" className="h-12 w-full">
          <Link href="/auth/forgot-password">Request new reset link</Link>
        </Button>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/auth/signin"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set new password"
      description="Enter your new password below. You'll be able to sign in with it after saving."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}
        <FormField
          id="password"
          label="New password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((p) => ({ ...p, password: undefined }));
          }}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoComplete="new-password"
          required
          error={fieldErrors.password}
        />
        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
          }}
          placeholder="Repeat your new password"
          autoComplete="new-password"
          required
          error={fieldErrors.confirmPassword}
        />
        <Button
          type="submit"
          size="lg"
          className="h-12"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/auth/signin"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[80vh] items-center justify-center"
          aria-busy="true"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
            aria-hidden
          />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
