"use client";

import { signIn, getProviders } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  AuthLayout,
  AuthDivider,
  AuthCrossLink,
  FormField,
  ProviderButton,
} from "@/components/auth";
import { Button } from "@/components/ui/button";
import { normalizeCallbackUrl } from "@/server/auth-callback";
import { Github } from "lucide-react";

type Providers = Awaited<ReturnType<typeof getProviders>>;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = normalizeCallbackUrl(
    searchParams.get("callbackUrl"),
    typeof window === "undefined" ? undefined : window.location.origin
  );
  const [providers, setProviders] = useState<Providers>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  const oauthProviders = providers
    ? Object.values(providers).filter((p) => p.type === "oauth")
    : [];
  const isLoading = providers === null;

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setFieldErrors(errors);
    setSubmitError(null);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(
          `/auth/signin?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`
        );
        return;
      }
      if (res.status === 409 && data.code === "EMAIL_TAKEN") {
        setSubmitError(
          "An account with this email already exists. Sign in or use a different email."
        );
        return;
      }
      if (res.status === 501 && data.code === "NOT_IMPLEMENTED") {
        setSubmitError(
          "Registration is not yet available. Use Google or GitHub below to create an account."
        );
        return;
      }
      setSubmitError(data.message ?? "Registration failed. Please try again.");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Sign up with email and password, or use Google or GitHub. Your account will be created on first sign-in with OAuth."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {submitError && (
          <div
            className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {submitError}
          </div>
        )}

        <FormField
          id="name"
          label="Name (optional)"
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email)
              setFieldErrors((p) => ({ ...p, email: undefined }));
          }}
          placeholder="you@example.com"
          autoComplete="email"
          required
          error={fieldErrors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password)
              setFieldErrors((p) => ({ ...p, password: undefined }));
          }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          error={fieldErrors.password}
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 rounded-2xl border border-cyan-200/20 bg-cyan-400/12 text-cyan-50 hover:bg-cyan-400/20"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <AuthDivider label="or sign up with" />

      <div className="space-y-3">
        {isLoading && (
          <>
            <div className="h-12 w-full animate-pulse rounded-lg bg-muted/60" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-muted/60" />
          </>
        )}
        {!isLoading &&
          oauthProviders.map((provider) => (
            <ProviderButton
              key={provider.id}
              icon={
                provider.id === "google" ? (
                  <GoogleIcon />
                ) : provider.id === "github" ? (
                  <Github className="size-5" />
                ) : null
              }
              label={`Sign up with ${provider.name}`}
              onClick={() => signIn(provider.id, { callbackUrl })}
            />
          ))}
      </div>

      <AuthCrossLink
        prompt="Already have an account?"
        href="/auth/signin"
        label="Sign in"
      />
    </AuthLayout>
  );
}

export default function SignUpPage() {
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
      <SignUpContent />
    </Suspense>
  );
}
