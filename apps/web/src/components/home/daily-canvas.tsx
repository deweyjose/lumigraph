import type { DailyCanvasContent } from "@/server/services/daily-canvas";

type Props = {
  content: DailyCanvasContent;
};

/**
 * Renders synthesized daily astro content (events, calendar, highlights).
 */
export function DailyCanvas({ content }: Props) {
  return (
    <div className="space-y-10">
      {content.events.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Today&apos;s Events</h2>
          <ul className="space-y-4">
            {content.events.map((event, i) => (
              <li
                key={i}
                className="rounded-lg border border-border/60 bg-card/50 p-4"
              >
                <h3 className="font-medium">{event.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.description}
                </p>
                {event.source && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Source: {event.source}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.calendar && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Astro Calendar</h2>
          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">{content.calendar}</p>
          </div>
        </section>
      )}

      {content.highlights.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Highlights</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {content.highlights.map((h, i) => (
              <li
                key={i}
                className="rounded-lg border border-border/60 bg-card/50 p-4"
              >
                <h3 className="font-medium">{h.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {h.summary}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
