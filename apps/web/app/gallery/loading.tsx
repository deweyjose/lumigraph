export default function GalleryLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 animate-pulse">
      <header className="mb-10">
        <div className="h-9 w-32 rounded bg-muted" />
        <div className="mt-2 h-5 w-80 rounded bg-muted" />
      </header>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <li key={i} className="rounded-lg border bg-muted/30">
            <div className="aspect-[4/3] rounded-t-lg bg-muted" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
