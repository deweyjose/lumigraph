"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

type PublishButtonProps = {
  postId: string;
  className?: string;
};

export function PublishButton({ postId, className }: PublishButtonProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setIsPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/image-posts/${postId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Failed to publish");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className={className}>
      <Button
        onClick={handlePublish}
        disabled={isPublishing}
        size="lg"
        className="gap-2"
      >
        <Send className="size-4" aria-hidden />
        {isPublishing ? "Publishing…" : "Publish"}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
