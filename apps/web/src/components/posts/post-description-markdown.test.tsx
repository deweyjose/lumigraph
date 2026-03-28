import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PostDescriptionMarkdown } from "./post-description-markdown";

describe("PostDescriptionMarkdown", () => {
  it("renders markdown headings and links; does not emit raw HTML tags", () => {
    const html = renderToStaticMarkup(
      <PostDescriptionMarkdown
        source={`## Section

[Example](https://example.com/path)

<script>alert(1)</script>
<p>raw</p>`}
      />
    );

    expect(html).toContain("Section");
    expect(html).toContain("https://example.com/path");
    expect(html).toContain("Example");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("raw</p>");
  });

  it("suppressLinks avoids anchor tags while keeping link text", () => {
    const html = renderToStaticMarkup(
      <PostDescriptionMarkdown
        suppressLinks
        variant="inline"
        source="[Wiki](https://en.wikipedia.org/wiki/M32)"
      />
    );

    expect(html).toContain("Wiki");
    expect(html).toContain("https://en.wikipedia.org/wiki/M32");
    expect(html).not.toContain("<a ");
  });
});
