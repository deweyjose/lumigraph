"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Props = {
  integrationSetId: string;
  title: string;
  afterDeleteHref?: string;
};

export function DeleteIntegrationSetButton({
  integrationSetId,
  title,
  afterDeleteHref = "/integration-sets",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/integration-sets/${integrationSetId}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        setOpen(false);
        router.push(afterDeleteHref);
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      setError(data.message ?? "Could not delete integration set");
    } catch {
      setError("Could not delete integration set");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4 shrink-0" aria-hidden />
          Delete integration set
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this integration set?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes “{title}”, all uploaded integration files,
            and export jobs for this set. Posts no longer list a deleted set,
            but the posts themselves are not removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => void confirmDelete()}
          >
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
