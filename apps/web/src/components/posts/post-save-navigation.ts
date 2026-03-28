export function getPostSaveNavigation(
  currentSlug: string,
  savedSlug: string,
  options?: { mode?: "view" | "edit" }
): "refresh" | { replace: string } {
  const mode = options?.mode ?? "view";
  const pathFor = (slug: string) =>
    mode === "edit" ? `/posts/${slug}/edit` : `/posts/${slug}`;

  if (savedSlug === currentSlug) {
    return "refresh";
  }

  return { replace: pathFor(savedSlug) };
}
