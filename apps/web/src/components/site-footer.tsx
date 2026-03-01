export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Lumigraph</p>
        <p>Astrophotography journal &amp; dataset platform</p>
      </div>
    </footer>
  );
}
