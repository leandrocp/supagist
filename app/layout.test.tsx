// @vitest-environment happy-dom

import { existsSync, readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "./layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "geist" }),
  Source_Code_Pro: () => ({ variable: "source-code-pro" }),
}));
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./providers", () => ({
  Providers: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/notifications-listener", () => ({
  NotificationsListener: () => null,
}));
vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));
vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => <script data-testid="vercel-analytics" />,
}));

const config = vi.hoisted(() => ({ hasEnvVars: false }));
vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/utils")>()),
  get hasEnvVars() {
    return config.hasEnvVars;
  },
}));

afterEach(cleanup);

describe("RootLayout", () => {
  it.each([false, true])("mounts analytics once with Supabase configured: %s", (hasEnvVars) => {
    config.hasEnvVars = hasEnvVars;
    render(
      <RootLayout>
        <main>Page content</main>
      </RootLayout>,
      { container: document },
    );

    expect(screen.getByRole("main").textContent).toBe("Page content");
    expect(screen.getAllByTestId("vercel-analytics")).toHaveLength(1);
    expect(document.body.contains(screen.getByTestId("vercel-analytics"))).toBe(true);
  });
});

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path: string) {
  const png = readFileSync(path);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("head assets", () => {
  it("serves every icon and manifest the head points at", () => {
    const icons = metadata.icons as { icon: { url: string }[]; apple: string };
    const manifest = JSON.parse(readFileSync(`public${metadata.manifest}`, "utf8")) as {
      icons: { src: string; sizes: string }[];
    };
    const urls = [
      ...icons.icon.map((i) => i.url),
      icons.apple,
      ...manifest.icons.map((i) => i.src),
    ];

    for (const url of urls) expect(existsSync(`public${url}`), url).toBe(true);
    for (const icon of manifest.icons) {
      const { width, height } = pngSize(`public${icon.src}`);
      expect(`${width}x${height}`).toBe(icon.sizes);
    }
    expect(pngSize("public/apple-touch-icon.png")).toEqual({ width: 180, height: 180 });
  });

  it("declares 1200x630 default share images that match the file", () => {
    const shared = [metadata.openGraph?.images, metadata.twitter?.images].flat() as {
      url: string;
      width: number;
      height: number;
      alt: string;
    }[];

    expect(shared).toHaveLength(2);
    for (const image of shared) {
      expect(image.alt).not.toBe("");
      expect({ width: image.width, height: image.height }).toEqual({ width: 1200, height: 630 });
      expect(pngSize(`public${image.url}`)).toEqual({ width: 1200, height: 630 });
    }
  });
});
