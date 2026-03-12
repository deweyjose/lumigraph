export function getPostSaveNavigation(
  currentSlug: string,
  savedSlug: string
): "refresh" | { replace: string } {
  if (savedSlug === currentSlug) {
    return "refresh";
  }

  return { replace: `/posts/${savedSlug}` };
}
