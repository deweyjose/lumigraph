import type { ReactNode } from "react";

export const metadata = {
  title: "Lumigraph",
  description: "Astrophotography journal and dataset platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
