"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getPostSaveNavigation } from "./post-save-navigation";
import { PostWriteupAssistDialog } from "./post-writeup-assist-dialog";
import type { PostStatus } from "@/components/gallery/visibility-badge";

type IntegrationSetOption = { id: string; title: string };

type Props = {
  postId: string;
  /** Shapes labels (e.g. Save draft vs Save changes) and the form panel heading. */
  postStatus: PostStatus;
  initialTitle: string;
  initialSlug: string;
  initialDescription?: string | null;
  /** Where to navigate after a slug change (default: public post view). */
  saveRedirect?: "view" | "edit";
  /** When set, post save syncs which integration sets link to this post. */
  integrationSetOptions?: IntegrationSetOption[];
  initialIntegrationSetIds?: string[];
  /** When true, PUT always includes integrationSetIds (edit page). */
  includeIntegrationSetIdsInSave?: boolean;
};

export function PostEditorForm({
  postId,
  postStatus,
  initialTitle,
  initialSlug,
  initialDescription,
  saveRedirect = "view",
  integrationSetOptions,
  initialIntegrationSetIds = [],
  includeIntegrationSetIdsInSave = false,
}: Props) {
  const isDraft = postStatus === "DRAFT";
  const editorHeading = isDraft ? "Draft editor" : "Published post editor";
  const integrationLegend = isDraft
    ? "Integration sets on this draft"
    : "Integration sets on this post";
  const saveLabel = isDraft ? "Save draft" : "Save changes";
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [linkedIntegrationSetIds, setLinkedIntegrationSetIds] = useState(
    () => new Set(initialIntegrationSetIds)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [writeupAssistOpen, setWriteupAssistOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
      };
      if (includeIntegrationSetIdsInSave) {
        payload.integrationSetIds = Array.from(linkedIntegrationSetIds);
      }

      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Failed to save draft");
        return;
      }
      const savedSlug = typeof data.slug === "string" ? data.slug : slug.trim();
      const navigation = getPostSaveNavigation(initialSlug, savedSlug, {
        mode: saveRedirect,
      });

      if (navigation === "refresh") {
        router.refresh();
        return;
      }

      router.replace(navigation.replace);
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  async function onRefineWriteup() {
    const trimmed = description.trim();
    if (!trimmed) {
      setError("Add some write-up text before refining.");
      return;
    }
    setError(null);
    setIsRefining(true);
    try {
      const res = await fetch(`/api/posts/${postId}/writeup-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refine",
          description: trimmed,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        description?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Failed to refine write-up");
        return;
      }
      if (typeof data.description === "string" && data.description.trim()) {
        setDescription(data.description.trim());
      } else {
        setError("Refined write-up was empty");
      }
    } catch {
      setError("Failed to refine write-up");
    } finally {
      setIsRefining(false);
    }
  }

  async function onExpandWriteup() {
    const trimmed = description.trim();
    if (!trimmed) {
      setError("Add some write-up text before expanding.");
      return;
    }
    setError(null);
    setIsExpanding(true);
    try {
      const res = await fetch(`/api/posts/${postId}/writeup-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "expand",
          description: trimmed,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        description?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Failed to expand write-up");
        return;
      }
      if (typeof data.description === "string" && data.description.trim()) {
        setDescription(data.description.trim());
      } else {
        setError("Expanded write-up was empty");
      }
    } catch {
      setError("Failed to expand write-up");
    } finally {
      setIsExpanding(false);
    }
  }

  return (
    <form onSubmit={onSave} className="mt-6 space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">{editorHeading}</h2>
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
      {integrationSetOptions !== undefined &&
        integrationSetOptions.length > 0 && (
          <fieldset className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">
              {integrationLegend}
            </legend>
            <p className="text-muted-foreground text-xs">
              Choose which of your integration sets appear here. Manage files on
              each set&apos;s own page.
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {integrationSetOptions.map((opt) => (
                <li key={opt.id} className="flex items-start gap-2">
                  <input
                    id={`iset-${opt.id}`}
                    type="checkbox"
                    className="border-input mt-0.5 size-4 shrink-0 rounded border"
                    checked={linkedIntegrationSetIds.has(opt.id)}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setLinkedIntegrationSetIds((prev) => {
                        const next = new Set(prev);
                        if (on) next.add(opt.id);
                        else next.delete(opt.id);
                        return next;
                      });
                    }}
                  />
                  <label
                    htmlFor={`iset-${opt.id}`}
                    className="cursor-pointer text-sm leading-tight"
                  >
                    {opt.title}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="post-description">Write-up</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setWriteupAssistOpen(true)}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Guided write-up
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onExpandWriteup()}
              disabled={
                isExpanding || isRefining || isSaving || !description.trim()
              }
              className="inline-flex items-center gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {isExpanding ? "Expanding..." : "Expand"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onRefineWriteup()}
              disabled={
                isRefining || isExpanding || isSaving || !description.trim()
              }
              className="inline-flex items-center gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {isRefining ? "Refining..." : "Refine"}
            </Button>
          </div>
        </div>
        <textarea
          id="post-description"
          rows={16}
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
        {isSaving ? "Saving..." : saveLabel}
      </Button>
      <PostWriteupAssistDialog
        postId={postId}
        open={writeupAssistOpen}
        onOpenChange={setWriteupAssistOpen}
        onApplyDescription={(next) => setDescription(next)}
      />
    </form>
  );
}
