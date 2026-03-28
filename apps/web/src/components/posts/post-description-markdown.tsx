import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Props = {
  source: string;
  className?: string;
  /**
   * `inline` = compact typography for integration-set notes panels and cards.
   * `post` = full write-up on the post page.
   */
  variant?: "post" | "inline";
  /**
   * When true, markdown links render as styled text (no `<a>`). Use in tight UI
   * like post cards to guarantee no nested anchors next to surrounding links.
   */
  suppressLinks?: boolean;
};

/**
 * Renders user markdown (headings + paragraphs + GFM). Disallows raw HTML.
 */
export function PostDescriptionMarkdown({
  source,
  className,
  variant = "post",
  suppressLinks = false,
}: Props) {
  const inline = variant === "inline";
  return (
    <div
      className={cn("max-w-none", inline ? "text-sm" : "text-base", className)}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h2: ({ children, ...props }) => (
            <h2
              {...props}
              className={cn(
                "scroll-mt-20 border-b border-white/10 font-semibold tracking-tight text-white first:mt-0",
                inline ? "mt-3 pb-1 text-base" : "mt-8 pb-2 text-xl"
              )}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              {...props}
              className={cn(
                "font-medium tracking-tight text-white",
                inline ? "mt-2.5 text-sm" : "mt-5 text-lg"
              )}
            >
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p
              {...props}
              className={cn(
                "leading-relaxed",
                inline ? "mt-2 text-slate-200/95" : "mt-3 text-muted-foreground"
              )}
            >
              {children}
            </p>
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- node from mdast
          a: ({ node: _n, children, href, className: _aClass, ...rest }) =>
            suppressLinks ? (
              <span
                className="text-primary underline decoration-primary/55 underline-offset-4"
                title={typeof href === "string" ? href : undefined}
              >
                {children}
              </span>
            ) : (
              <a
                {...rest}
                href={href}
                className="text-primary underline-offset-4 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                {children}
              </a>
            ),
          strong: ({ children, ...props }) => (
            <strong {...props} className="font-semibold text-white/95">
              {children}
            </strong>
          ),
          ul: ({ children, ...props }) => (
            <ul
              {...props}
              className={cn(
                "list-disc pl-5 text-muted-foreground",
                inline ? "mt-2" : "mt-3"
              )}
            >
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol
              {...props}
              className={cn(
                "list-decimal pl-5 text-muted-foreground",
                inline ? "mt-2" : "mt-3"
              )}
            >
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className="mt-1">
              {children}
            </li>
          ),
          code: ({ children, className: codeClass, ...props }) => {
            const isBlock = Boolean(codeClass?.includes("language-"));
            if (isBlock) {
              return (
                <code
                  {...props}
                  className={cn(
                    codeClass,
                    "block bg-transparent p-0 font-mono text-inherit"
                  )}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                {...props}
                className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em] text-slate-200"
              >
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <pre
              {...props}
              className="mt-2 overflow-x-auto rounded-md border border-white/10 bg-black/35 p-2 font-mono text-xs leading-relaxed text-slate-200"
            >
              {children}
            </pre>
          ),
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}
