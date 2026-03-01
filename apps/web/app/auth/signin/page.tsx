"use client";

import { signIn, getProviders } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  AuthLayout,
  AuthDivider,
  AuthCrossLink,
  FormField,
  ProviderButton,
} from "@/components/auth";
import { Github, Mail } from "lucide-react";

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

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");
  const registered = searchParams.get("registered") === "1";
  const reset = searchParams.get("reset") === "1";
  const [providers, setProviders] = useState<Providers>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const emailProvider = providers
    ? Object.values(providers).find((p) => p.type === "email")
    : null;
  const hasCredentialsProvider = providers
    ? Object.values(providers).some((p) => p.type === "credentials")
    : false;
  const hasNoOAuthOrEmail =
    providers !== null &&
    Object.keys(providers).filter((k) => providers[k]?.type !== "credentials")
      .length === 0;
  const isLoading = providers === null;

  function validateCredentials(): boolean {
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
    return Object.keys(errors).length === 0;
  }

  async function handleCredentialsSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCredentials()) return;
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setFieldErrors({
          password: "Invalid email or password. Please try again.",
        });
      } else if (result?.url) {
        window.location.href = result.url;
        return;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!magicEmail.trim()) return;
    signIn("email", { email: magicEmail.trim(), callbackUrl });
    setEmailSent(true);
  }

  const errorMessage =
    error === "OAuthAccountNotLinked"
      ? "This email is already linked to another sign-in method. Use that method instead."
      : error
        ? "Something went wrong. Please try again."
        : null;

  return (
    <AuthLayout
      title="Sign in to Lumigraph"
      description="Use your email and password, or sign in with Google or GitHub. You can also use a one-time email link."
    >
      {registered && (
        <div
          className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          Account created. Sign in below.
        </div>
      )}
      {reset && (
        <div
          className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          Password reset. Sign in with your new password.
        </div>
      )}
      {errorMessage && (
        <div
          className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-4">
        {isLoading && (
          <div className="flex flex-col gap-4">
            <div className="h-12 w-full animate-pulse rounded-lg bg-muted/60" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-muted/60" />
            <div className="mt-6 h-4 w-8 animate-pulse rounded bg-muted/60" />
          </div>
        )}

        {!isLoading && hasCredentialsProvider && (
          <>
            {/* Credentials: email + password */}
            <form
              onSubmit={handleCredentialsSignIn}
              className="flex flex-col gap-4"
              noValidate
            >
              <FormField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email)
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
                error={fieldErrors.email}
              />
              <div className="space-y-2">
                <FormField
                  id="password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                  }}
                  autoComplete="current-password"
                  required
                  error={fieldErrors.password}
                />
                <div className="flex justify-end">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            {(oauthProviders.length > 0 || emailProvider) && (
              <AuthDivider label="or continue with" />
            )}

            {oauthProviders.length > 0 && (
              <div className="space-y-3">
                {oauthProviders.map((provider) => (
                  <ProviderButton
                    key={provider.id}
                    icon={
                      provider.id === "google" ? (
                        <GoogleIcon />
                      ) : provider.id === "github" ? (
                        <Github className="size-5" />
                      ) : null
                    }
                    label={`Continue with ${provider.name}`}
                    onClick={() => signIn(provider.id, { callbackUrl })}
                  />
                ))}
              </div>
            )}

            {emailProvider && (
              <>
                <AuthDivider />
                {emailSent ? (
                  <div
                    className="rounded-lg border border-primary/30 bg-primary/10 p-5 text-center"
                    role="status"
                  >
                    <Mail
                      className="mx-auto mb-2 size-6 text-primary"
                      aria-hidden
                    />
                    <p className="font-medium">Check your email</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We sent a sign-in link to{" "}
                      <strong className="text-foreground">{magicEmail}</strong>
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleEmailSignIn}
                    className="flex flex-col gap-3"
                  >
                    <FormField
                      id="magic-email"
                      label="Or continue with email link"
                      type="email"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="lg"
                      className="h-12 w-full border-border/60 bg-card/80 text-base font-medium shadow-sm transition hover:border-primary/30 hover:bg-card"
                    >
                      <Mail className="mr-3 size-5 shrink-0" aria-hidden />
                      Continue with Email
                    </Button>
                  </form>
                )}
              </>
            )}

            {hasNoOAuthOrEmail && (
              <p className="text-center text-xs text-muted-foreground">
                To enable Google or GitHub sign-in, add the relevant env vars
                and restart the app.
              </p>
            )}

            <AuthCrossLink
              prompt="Don't have an account?"
              href="/auth/signup"
              label="Sign up"
            />
          </>
        )}
      </div>
    </AuthLayout>
  );
}

export default function SignInPage() {
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
      <SignInContent />
    </Suspense>
  );
}
