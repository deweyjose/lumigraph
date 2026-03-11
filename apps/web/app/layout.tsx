import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { auth } from "auth";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WorkspaceShell } from "@/components/workspace-shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Lumigraph",
    template: "%s | Lumigraph",
  },
  description:
    "Astrophotography journal and integration data platform. Publish images, manage integration sets, and explore Astro Hub.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.className} flex min-h-screen flex-col antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {session?.user ? (
            <WorkspaceShell>{children}</WorkspaceShell>
          ) : (
            <>
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
