import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
};

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
      <p className="mt-2 text-muted-foreground">
        Community astrophotography — coming soon.
      </p>
      <div className="mt-12 flex items-center justify-center rounded-lg border border-dashed border-border/60 py-24">
        <p className="text-sm text-muted-foreground">
          Image posts will appear here once the first post is published.
        </p>
      </div>
    </div>
  );
}
