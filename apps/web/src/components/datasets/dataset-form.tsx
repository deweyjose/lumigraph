"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DatasetFormPost = { id: string; slug: string; title: string };

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Private" },
  { value: "UNLISTED", label: "Unlisted" },
  { value: "PUBLIC", label: "Public" },
] as const;

type DatasetFormProps = {
  mode: "create" | "edit";
  datasetId?: string;
  initialTitle?: string;
  initialDescription?: string | null;
  initialVisibility?: "PRIVATE" | "UNLISTED" | "PUBLIC";
  initialImagePostId?: string | null;
  /** User's posts for optional "Link to post" dropdown */
  myPosts: DatasetFormPost[];
};

export function DatasetForm({
  mode,
  datasetId,
  initialTitle = "",
  initialDescription = "",
  initialVisibility = "PRIVATE",
  initialImagePostId = "",
  myPosts,
}: DatasetFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [visibility, setVisibility] = useState<
    "PRIVATE" | "UNLISTED" | "PUBLIC"
  >(initialVisibility);
  const [imagePostId, setImagePostId] = useState(initialImagePostId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const titleTrim = title.trim();
    if (!titleTrim) {
      setFieldErrors((prev) => ({ ...prev, title: "Title is required" }));
      return;
    }

    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/datasets"
          : `/api/datasets/${datasetId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const body = {
        title: titleTrim,
        ...(description.trim() && { description: description.trim() }),
        visibility,
        ...(imagePostId.trim()
          ? { imagePostId: imagePostId.trim() }
          : { imagePostId: null }),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/signin?callbackUrl=" + encodeURIComponent(window.location.pathname));
          return;
        }
        if (res.status === 404) {
          setError("Dataset not found or you don't have permission to edit it.");
          return;
        }
        if (data.code === "VALIDATION_ERROR") {
          setFieldErrors((prev) => ({ ...prev, title: data.message ?? "Invalid input" }));
          return;
        }
        setError(data.message ?? "Something went wrong");
        return;
      }

      if (mode === "create") {
        router.push(`/datasets/${data.id}`);
      } else {
        router.refresh();
        setError(null);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const cancelHref = mode === "create" ? "/datasets" : `/datasets/${datasetId}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "New dataset" : "Edit dataset"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {mode === "create"
            ? "Create a dataset to store integration files (FITS, stacks, etc.). You can link it to an image post later."
            : "Update title, description, visibility, or linked post."}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField
            id="title"
            label="Title"
            placeholder="e.g. M31 integration data"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            error={fieldErrors.title}
          />
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Brief description of the dataset…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(
                "border-input placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              aria-describedby={error ? "form-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              id="visibility"
              name="visibility"
              value={visibility}
              onChange={(e) =>
                setVisibility(
                  e.target.value as "PRIVATE" | "UNLISTED" | "PUBLIC"
                )
              }
              aria-describedby="visibility-description"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <p id="visibility-description" className="text-xs text-muted-foreground">
              Private: only you. Unlisted: anyone with the link. Public: discoverable.
            </p>
          </div>
          {myPosts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="imagePostId">Link to post (optional)</Label>
              <Select
                id="imagePostId"
                name="imagePostId"
                value={imagePostId}
                onChange={(e) => setImagePostId(e.target.value)}
                aria-describedby="imagePostId-description"
              >
                <option value="">None</option>
                {myPosts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.title} ({post.slug})
                  </option>
                ))}
              </Select>
              <p id="imagePostId-description" className="text-xs text-muted-foreground">
                Associate this dataset with an image post.
              </p>
            </div>
          )}
          {error && (
            <p id="form-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "create"
                  ? "Creating…"
                  : "Saving…"
                : mode === "create"
                  ? "Create dataset"
                  : "Save changes"}
            </Button>
            <Button type="button" variant="secondary" asChild>
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
