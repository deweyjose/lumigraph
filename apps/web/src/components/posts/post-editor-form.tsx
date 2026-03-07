"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  initialTitle: string;
  initialSlug: string;
  initialDescription?: string | null;
};

export function PostEditorForm({
  postId,
  initialTitle,
  initialSlug,
  initialDescription,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Failed to save draft");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="mt-6 space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Post editor</h2>
      <FormField
        id="post-title"
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <FormField
        id="post-slug"
        label="Slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />
      <div className="space-y-2">
        <Label htmlFor="post-description">Write-up</Label>
        <textarea
          id="post-description"
          rows={5}
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
      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save draft"}
      </Button>
    </form>
  );
}
