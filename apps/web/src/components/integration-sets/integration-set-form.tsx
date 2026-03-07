"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PostOption = { id: string; title: string; slug: string };

type IntegrationSetFormProps = {
  mode: "create" | "edit";
  integrationSetId?: string;
  initialTitle?: string;
  initialNotes?: string | null;
  initialPostId?: string | null;
  postOptions: PostOption[];
};

export function IntegrationSetForm({
  mode,
  integrationSetId,
  initialTitle = "",
  initialNotes = "",
  initialPostId = "",
  postOptions,
}: IntegrationSetFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [postId, setPostId] = useState(initialPostId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const titleTrim = title.trim();
    if (!titleTrim) {
      setError("Title is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/integration-sets"
          : `/api/integration-sets/${integrationSetId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleTrim,
          notes: notes.trim() || null,
          postId: postId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Failed to save integration set");
        return;
      }
      if (mode === "create") {
        router.push(`/integration-sets/${data.id}`);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "New Integration Set" : "Edit Integration Set"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <FormField
            id="title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. M31 Jan 2026"
            required
          />
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(
                "border-input placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postId">Linked post (optional)</Label>
            <Select
              id="postId"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
            >
              <option value="">None</option>
              {postOptions.map((post) => (
                <option key={post.id} value={post.id}>
                  {post.title} ({post.slug})
                </option>
              ))}
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create"
                  : "Save"}
            </Button>
            <Button type="button" variant="secondary" asChild>
              <Link
                href={
                  mode === "create"
                    ? "/integration-sets"
                    : `/integration-sets/${integrationSetId}`
                }
              >
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
