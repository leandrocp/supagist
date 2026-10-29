// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { CodeBlock } from "@lumis-sh/react";
import { renderCodeBlock } from "@lumis-sh/react/server";
import { createHighlighter, type Highlighter } from "@lumis-sh/lumis";
import { htmlInline } from "@lumis-sh/lumis/formatters";
import full from "@lumis-sh/wasm-bundle-full";
import githubLight from "@lumis-sh/themes/github_light";
import githubDark from "@lumis-sh/themes/github_dark";

let highlighter: Highlighter;
beforeAll(async () => {
  highlighter = await createHighlighter({ languages: [full] });
});
afterEach(cleanup);

describe("published Lumis React integration", () => {
  it("loads a lazy parser and updates the code and theme", async () => {
    const { rerender, container } = render(
      <CodeBlock
        highlighter={highlighter}
        formatter={htmlInline({ language: "typescript", theme: githubLight })}
      >
        {'const label = "<script>🔥</script>";'}
      </CodeBlock>,
    );
    const keyword = await screen.findByText("const");
    expect(keyword.style.color).toBe(githubLight.highlights.keyword.fg);
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toBe('const label = "<script>🔥</script>";');

    rerender(
      <CodeBlock
        highlighter={highlighter}
        formatter={htmlInline({ language: "python", theme: githubDark })}
      >
        {'def greet():\n    return "hello"'}
      </CodeBlock>,
    );
    const nextKeyword = await screen.findByText("def");
    expect(nextKeyword.style.color).toBe(githubDark.highlights.keyword.fg);
    expect(container.textContent).toBe('def greet():\n    return "hello"');
  });

  it("server-renders escaped code with real syntax colors", async () => {
    const node = await renderCodeBlock({
      children: 'const label = "<b>🔥</b>";',
      formatter: htmlInline({ language: "typescript", theme: githubLight }),
      highlighter,
    });
    const html = renderToStaticMarkup(node);
    expect(html).toContain(`color:${githubLight.highlights.keyword.fg}`);
    expect(html).toContain("&lt;b&gt;🔥&lt;/b&gt;");
    expect(html).not.toContain("<b>");
  });
});
