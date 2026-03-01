"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { AuthLayout, FormField } from "@/components/auth";
import { Button } from "@/components/ui/button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function validate(): boolean {
    if (!email.trim()) {
      setFieldError("Email is required.");
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setFieldError("Please enter a valid email address.");
      return false;
    }
    setFieldError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitted(true);
        return;
      }
      if (res.status === 501 && data.code === "NOT_IMPLEMENTED") {
        setError(
          "Password reset is not yet available. Use OAuth sign-in or contact support."
        );
        return;
      }
      setError(data.message ?? "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout
        title="Check your email"
        description="If an account exists for that email, we sent a link to reset your password."
      >
        <div
          className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-4 text-sm text-foreground"
          role="status"
        >
          <p>
            If you don&apos;t see the email, check your spam folder. The link
            will expire after a short time.
          </p>
        </div>
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
      title="Forgot password?"
      description="Enter your email and we'll send you a link to reset your password."
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
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(null);
          }}
          placeholder="you@example.com"
          autoComplete="email"
          required
          error={fieldError ?? undefined}
        />
        <Button
          type="submit"
          size="lg"
          className="h-12"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending…" : "Send reset link"}
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

export default function ForgotPasswordPage() {
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
      <ForgotPasswordContent />
    </Suspense>
  );
}
