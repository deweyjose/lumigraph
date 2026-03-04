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

  if (session?.user) {
    return <AstroHub />;
  }

  return <SplashContent />;
}
