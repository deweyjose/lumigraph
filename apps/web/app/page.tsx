<<<<<<< 001-home-astro-hub
import { auth } from "auth";
import { SplashContent } from "@/components/home/splash-content";
import { AstroHub } from "@/components/home/astro-hub";

/**
 * Auth-aware home page.
 * - Logged out: Splash (Browse Posts only; no login in main content)
 * - Logged in: Astro hub (daily canvas + chatbot)
 */
export default async function HomePage() {
  const session = await auth();
=======
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { Button } from "@/components/ui/button";
import { Telescope, Upload, Eye } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (session) {
    redirect("/gallery");
  }

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
>>>>>>> main

  if (session?.user) {
    return <AstroHub />;
  }

  return <SplashContent />;
}
