import { Suspense } from "react";
import { getOrGenerateDailyCanvas } from "@/server/services/daily-canvas";
import { DailyCanvas } from "./daily-canvas";
import { ChatWidget } from "./chat-widget";

/**
 * Logged-in home: astrophotography content hub.
 * Renders DailyCanvas (from NASA/Open Notify/SpaceX + OpenAI) + ChatWidget.
 */
export function AstroHub() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Today&apos;s Astro Hub
          </h1>
          <p className="mt-2 text-muted-foreground">
            Current events, astro calendar, and astronomy highlights.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Loading today&apos;s content…
              </p>
            </div>
          }
        >
          <DailyCanvasLoader />
        </Suspense>
      </div>
      <ChatWidget />
    </>
  );
}

async function DailyCanvasLoader() {
  const content = await getOrGenerateDailyCanvas(new Date());
  return <DailyCanvas content={content} />;
}
