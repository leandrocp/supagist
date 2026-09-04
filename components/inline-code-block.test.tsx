// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineCodeBlock } from "./inline-code-block";

const { mockLoadLanguage } = vi.hoisted(() => ({
  mockLoadLanguage: vi.fn(async () => undefined),
}));

vi.mock("@/lib/lumis-client", () => ({
  clientHighlighterPromise: Promise.resolve({
    loadLanguage: mockLoadLanguage,
    highlightIter: vi.fn((code: string, _language: string, _theme: unknown, cb) => cb(code)),
  }),
}));

vi.mock("@/lib/theme-loader", () => ({
  loadTheme: vi.fn(async () => ({
    data: {
      appearance: "dark",
      highlights: {
        normal: { bg: "#111111", fg: "#eeeeee" },
      },
    },
  })),
}));

afterEach(() => {
  cleanup();
  mockLoadLanguage.mockClear();
});

const baseProps = {
  filename: "snippet.ts",
  code: "alpha\nbeta",
  theme: "github_dark",
  comments: {},
  reactions: {},
  selectedCommentLine: null,
  selectedReactionLine: null,
  onCodeChange: vi.fn(),
  onSelectCommentLine: vi.fn(),
  onSelectReactionLine: vi.fn(),
  onPickReaction: vi.fn(),
};

describe("InlineCodeBlock preview mode", () => {
  it("can hide the editor gutter for export-preview layouts", () => {
    render(<InlineCodeBlock {...baseProps} showGutter={false} />);

    expect(screen.queryByText("1")).toBeNull();
    expect(screen.queryByText("2")).toBeNull();
    expect(screen.getByLabelText("Code")).toBeTruthy();
  });

  it("shows annotation actions at the line start without a number gutter", () => {
    const { container } = render(
      <InlineCodeBlock {...baseProps} showGutter showLineNumbers={false} />,
    );

    expect(screen.queryByText("1")).toBeNull();
    expect(screen.queryByText("2")).toBeNull();
    const textarea = screen.getByLabelText("Code");
    expect(textarea).toBeTruthy();
    expect(container.querySelector(".border-r")).toBeNull();

    fireEvent.mouseMove(textarea, { clientY: 20 });

    expect(screen.getByRole("button", { name: "Add a reaction" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a comment" })).toBeTruthy();
    expect(screen.getByTestId("annotation-toolbar-1").parentElement?.style.left).toBe("16px");
    expect(screen.getByTestId("source-line-1").style.paddingLeft).toBe("");
  });

  it("uses a supplied body height instead of the fixed editor height", () => {
    render(<InlineCodeBlock {...baseProps} bodyHeight={216} showGutter={false} />);

    const textarea = screen.getByLabelText("Code");
    const body = textarea.parentElement?.parentElement;
    expect(body?.style.height).toBe("216px");
  });

  it("does not reserve horizontal gutter space when line numbers are hidden", () => {
    const { container } = render(
      <InlineCodeBlock {...baseProps} showGutter showLineNumbers={false} />,
    );

    const body = container.querySelector(".grid.overflow-hidden") as HTMLElement;
    expect(body.style.gridTemplateColumns).toBe("1fr");
  });

  it("right-aligns single- and multi-digit line numbers to the same edge", () => {
    const code = Array.from({ length: 10 }, (_value, index) => `line ${index + 1}`).join("\n");
    render(<InlineCodeBlock {...baseProps} code={code} showGutter showLineNumbers compactGutter />);

    const nine = screen.getByText("9");
    const ten = screen.getByText("10");

    expect(nine.className).toContain("text-right");
    expect(ten.className).toContain("text-right");
    expect((nine as HTMLElement).style.width).toBe("18px");
    expect((ten as HTMLElement).style.width).toBe("18px");
  });

  it("uses export-preview line number geometry when comment actions are hidden", () => {
    const { container } = render(
      <InlineCodeBlock {...baseProps} showGutter showLineNumbers compactGutter />,
    );

    const body = container.querySelector(".grid.overflow-hidden") as HTMLElement;
    const textarea = screen.getByLabelText("Code") as HTMLTextAreaElement;
    expect(body.style.gridTemplateColumns).toBe("54px 1fr");
    expect(textarea.style.paddingLeft).toBe("16px");
    expect(textarea.style.paddingRight).toBe("16px");
  });

  it("keeps the horizontal gutter fixed while padding the code body", () => {
    const { container } = render(
      <InlineCodeBlock
        {...baseProps}
        bodyHeight={96}
        innerPadding={24}
        showGutter
        showLineNumbers
        compactGutter
      />,
    );

    const body = container.querySelector(".grid.overflow-hidden") as HTMLElement;
    const gutter = body.firstElementChild as HTMLElement;
    const textarea = screen.getByLabelText("Code") as HTMLTextAreaElement;
    expect(body.style.gridTemplateColumns).toBe("54px 1fr");
    expect(gutter.style.paddingBlock).toBe("24px");
    expect(textarea.style.paddingLeft).toBe("24px");
    expect(textarea.style.paddingTop).toBe("24px");
    expect(textarea.style.paddingRight).toBe("24px");
    expect(textarea.style.paddingBottom).toBe("24px");
  });

  it("applies sizing styles to the outer frame", () => {
    const { container } = render(
      <InlineCodeBlock {...baseProps} style={{ width: 640, maxWidth: "100%" }} />,
    );

    const frame = container.firstElementChild as HTMLElement;
    expect(frame?.style.width).toBe("640px");
    expect(frame?.style.maxWidth).toBe("100%");
  });

  it("gives source text a readable fallback color before highlighting finishes", () => {
    render(<InlineCodeBlock {...baseProps} showGutter={false} />);

    expect(screen.getByTestId("highlight-layer").style.color).toBe("#222222");
  });

  it("renders highlighted source as text instead of injectable HTML", async () => {
    const code = '<img src="x" onerror="alert(1)">';
    const { container } = render(<InlineCodeBlock {...baseProps} code={code} showGutter={false} />);

    await vi.waitFor(() => expect(container.textContent).toContain(code));
    expect(container.querySelector("img")).toBeNull();
  });

  it("can hide operational chrome actions from the exported artifact preview", () => {
    render(<InlineCodeBlock {...baseProps} showChromeActions={false} />);

    expect(screen.queryByRole("button", { name: /copy code/i })).toBeNull();
    expect(screen.getByText("snippet.ts")).toBeTruthy();
  });

  it("positions filename and language independently by default", () => {
    render(<InlineCodeBlock {...baseProps} showChromeActions={false} />);

    expect(screen.getByText("snippet.ts").parentElement?.parentElement?.className).toContain(
      "justify-center",
    );
    expect(screen.getByText("TypeScript").parentElement?.parentElement?.className).toContain(
      "justify-end",
    );
  });

  it("supports granular header labels and positioning", () => {
    render(
      <InlineCodeBlock
        {...baseProps}
        header={{
          enabled: true,
          showFilename: false,
          showLanguage: true,
          filenamePosition: "center",
          languagePosition: "right",
        }}
        showChromeActions={false}
      />,
    );

    expect(screen.queryByText("snippet.ts")).toBeNull();
    expect(screen.getByText("TypeScript").parentElement?.parentElement?.className).toContain(
      "justify-end",
    );
  });

  it("can disable the header without affecting language inference", async () => {
    render(
      <InlineCodeBlock
        {...baseProps}
        header={{
          enabled: false,
          showFilename: true,
          showLanguage: true,
          filenamePosition: "center",
          languagePosition: "right",
        }}
      />,
    );

    expect(screen.queryByText("snippet.ts")).toBeNull();
    expect(screen.queryByText("TypeScript")).toBeNull();
    await vi.waitFor(() => expect(mockLoadLanguage).toHaveBeenCalledWith("typescript"));
  });

  it("can hide the chrome filename without losing filename-based language inference", async () => {
    render(<InlineCodeBlock {...baseProps} showFilename={false} />);

    expect(screen.queryByText("snippet.ts")).toBeNull();
    await vi.waitFor(() => expect(mockLoadLanguage).toHaveBeenCalledWith("typescript"));
  });

  it("can hide editor scrollbars for export-preview layouts", () => {
    render(<InlineCodeBlock {...baseProps} showScrollbars={false} />);

    expect(screen.getByLabelText("Code").className).toContain("overflow-hidden");
  });

  it("can hide line comment actions from export-preview layouts", () => {
    render(<InlineCodeBlock {...baseProps} showGutter showCommentActions={false} />);

    fireEvent.mouseEnter(screen.getByText("1").parentElement!);

    expect(screen.queryByRole("button", { name: /add a comment/i })).toBeNull();
  });

  it("renders inline comments with a language-neutral marker", () => {
    render(
      <InlineCodeBlock
        {...baseProps}
        comments={{ 1: { author: "dev", body: "check this branch" } }}
        showInlineComments
      />,
    );

    expect(screen.getByText(/↳ check this branch/)).toBeTruthy();
  });

  it("renders optional artifact footer content inside the frame", () => {
    render(<InlineCodeBlock {...baseProps} footer={<span>2 lines · 10 / 8,000</span>} />);

    expect(screen.getByText("2 lines · 10 / 8,000")).toBeTruthy();
  });

  it("renders brand header-strip chrome and card fill independently of window dots", () => {
    const { container } = render(
      <InlineCodeBlock
        {...baseProps}
        windowDecoration="none"
        brandFrame={{
          showDots: false,
          showCenteredFilename: false,
          headerStrip: { showLanguage: true },
          cardFill: "#171717",
        }}
      />,
    );

    expect(screen.getByTestId("brand-header-strip")).toBeTruthy();
    expect(screen.getByText("snippet.ts")).toBeTruthy();
    expect(screen.getByText("TypeScript")).toBeTruthy();
    expect((container.firstElementChild as HTMLElement).style.backgroundColor).toBe("#171717");
  });

  it("renders the Minimal window decoration without control dots", () => {
    render(<InlineCodeBlock {...baseProps} windowDecoration="minimal" />);

    const header = screen.getByText("snippet.ts").closest(".border-b");
    expect(header?.firstElementChild?.children).toHaveLength(0);
  });

  it("keeps an explicitly selected macOS decoration visible on Brand frames", () => {
    render(
      <InlineCodeBlock
        {...baseProps}
        windowDecoration="macos"
        brandFrame={{ showDots: false, cardFill: "#000000" }}
      />,
    );

    const header = screen.getByText("snippet.ts").closest(".border-b");
    expect(header?.firstElementChild?.children).toHaveLength(3);
  });

  it("renders muted control dots for the macOS Subtle window decoration", () => {
    render(<InlineCodeBlock {...baseProps} windowDecoration="macos-subtle" />);

    const header = screen.getByText("snippet.ts").closest(".border-b");
    expect(header?.firstElementChild?.children).toHaveLength(3);
  });

  it("reserves header space only on the decoration side", () => {
    const { unmount } = render(
      <InlineCodeBlock {...baseProps} windowDecoration="macos" showChromeActions={false} />,
    );
    const macosMetadata =
      screen.getByText("snippet.ts").parentElement?.parentElement?.parentElement;
    expect(macosMetadata?.className).toContain("pl-20");
    expect(macosMetadata?.className).toContain("pr-4");
    unmount();

    render(<InlineCodeBlock {...baseProps} windowDecoration="windows" showChromeActions={false} />);
    const windowsMetadata =
      screen.getByText("snippet.ts").parentElement?.parentElement?.parentElement;
    expect(windowsMetadata?.className).toContain("pl-4");
    expect(windowsMetadata?.className).toContain("pr-20");
    expect(windowsMetadata?.className).not.toContain("pl-20");
  });

  it("renders Windows-style window controls", () => {
    render(<InlineCodeBlock {...baseProps} windowDecoration="windows" showChromeActions={false} />);

    expect(screen.getByText("─")).toBeTruthy();
    expect(screen.getByText("□")).toBeTruthy();
    expect(screen.getByText("×")).toBeTruthy();
    expect(screen.queryByText("Copied")).toBeNull();
  });

  it("lays out lines at the 14px default font size", () => {
    render(<InlineCodeBlock {...baseProps} />);

    const textarea = screen.getByLabelText("Code");
    expect(textarea.style.fontSize).toBe("14px");
    expect(textarea.style.lineHeight).toBe("24px");
    expect((screen.getByTestId("source-line-1") as HTMLElement).style.height).toBe("24px");
  });

  it("scales line height with a larger font size", () => {
    render(<InlineCodeBlock {...baseProps} fontSize={20} />);

    const textarea = screen.getByLabelText("Code");
    expect(textarea.style.fontSize).toBe("20px");
    expect(textarea.style.lineHeight).toBe("34px");
    expect((screen.getByTestId("source-line-1") as HTMLElement).style.height).toBe("34px");
    expect((screen.getByTestId("highlight-layer") as HTMLElement).style.fontSize).toBe("20px");
  });

  it("snaps an unsupported font size to the nearest supported one", () => {
    render(<InlineCodeBlock {...baseProps} fontSize={15} />);

    expect(screen.getByLabelText("Code").style.fontSize).toBe("16px");
  });
});
