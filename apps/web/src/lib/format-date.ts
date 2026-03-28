/** Stable locale for visible dates (avoids SSR/CSR locale drift). */
export function formatShortUsDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
