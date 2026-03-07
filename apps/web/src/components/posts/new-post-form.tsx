"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function NewPostForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    slug?: string;
  }>({});

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setTitle(value);
    if (!slug || slug === slugFromTitle(title)) {
      setSlug(slugFromTitle(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const titleTrim = title.trim();
    const slugTrim = slug.trim();
    if (!titleTrim) {
      setFieldErrors((prev) => ({ ...prev, title: "Title is required" }));
      return;
    }
    if (!slugTrim) {
      setFieldErrors((prev) => ({ ...prev, slug: "Slug is required" }));
      return;
    }
    if (!SLUG_REGEX.test(slugTrim)) {
      setFieldErrors((prev) => ({
        ...prev,
        slug: "Use only letters, numbers, and hyphens (e.g. m31-andromeda)",
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleTrim,
          slug: slugTrim,
          ...(description.trim() && { description: description.trim() }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/signin?callbackUrl=/posts/new");
          return;
        }
        if (data.code === "SLUG_TAKEN") {
          setFieldErrors((prev) => ({
            ...prev,
            slug: "This slug is already in use",
          }));
          return;
        }
        setError(data.message ?? "Failed to create post");
        return;
      }
      router.push(`/posts/${data.slug}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">New draft</h1>
      <p className="mt-1 text-muted-foreground">
        Create a draft. You can add images and publish later.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Draft details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              id="title"
              label="Title"
              placeholder="e.g. M31 Andromeda Galaxy"
              value={title}
              onChange={(e) => handleTitleChange(e)}
              required
              error={fieldErrors.title}
            />
            <FormField
              id="slug"
              label="URL slug"
              placeholder="e.g. m31-andromeda"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              error={fieldErrors.slug}
            />
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                rows={3}
                placeholder="A short description of the image or target…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={cn(
                  "border-input placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create draft"}
              </Button>
              <Button type="button" variant="secondary" asChild>
                <Link href="/gallery">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
