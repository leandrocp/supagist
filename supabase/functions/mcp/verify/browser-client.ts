import {
  createHighlightedSvg,
  renderToFile,
  EXPORT_BRAND_BACKGROUNDS,
} from "../../../../lib/export-utils.ts";
import { BRAND_PRESETS } from "../../../../lib/brand-presets.ts";

try {
  const fixtures = await (await fetch("/m0-fixtures")).json();
  for (const fixture of fixtures) {
    const brand =
      fixture.fixture === "plain"
        ? undefined
        : BRAND_PRESETS.find((preset) => preset.id === "vercel");
    const background = brand
      ? EXPORT_BRAND_BACKGROUNDS.find((preset) => preset.brandId === "vercel")
      : undefined;
    const settings = brand?.settings;
    const avatars = fixture.fixture === "avatars";
    const avatar1 = `${location.origin}/m0-avatar-1.png`;
    const avatar2 = `${location.origin}/m0-avatar-2.png`;
    const reactions = avatars
      ? {
          3: [
            {
              emoji: "+1",
              reactors: [
                { username: "Ada", avatarUrl: avatar1 },
                { username: "Grace", avatarUrl: avatar2 },
              ],
            },
          ],
          15: [{ emoji: "+1", reactors: [{ username: "Grace", avatarUrl: avatar2 }] }],
          30: [{ emoji: "+1", reactors: [{ username: "Ada", avatarUrl: avatar1 }] }],
        }
      : undefined;
    const options = {
      code: fixture.code,
      filename: "snippet",
      theme: "github_dark",
      background,
      outerPadding: settings?.outerPadding,
      lineNumbers: true,
      fontId: "jetbrains",
      language: "javascript",
      reactions,
      showReactions: avatars,
      footerAuthorUsername: "Ada",
      footerAuthorAvatarUrl: avatars ? avatar1 : undefined,
      windowDecoration: settings?.windowDecoration ?? "macos",
      cornerRadius: settings?.cornerRadius,
      innerPadding: settings?.innerPadding ?? 16,
      header: settings?.header,
      footer: avatars ? { enabled: true } : settings?.footer,
      fontSize: 14,
    } as const;
    for (const ratio of [1, 2]) {
      const file = await renderToFile({ ...options, outFilename: "m0.png", pixelRatio: ratio });
      const svg = await createHighlightedSvg(options);
      for (const [format, body] of [
        ["png", file],
        ["svg", svg],
      ] as const) {
        const response = await fetch(`/m0-capture/${fixture.fixture}-${ratio}x-browser.${format}`, {
          method: "POST",
          body,
        });
        if (!response.ok) throw new Error("Could not save browser export");
      }
    }
  }
  document.querySelector("#status")!.textContent =
    "PASS: all 12 browser exports saved using the unchanged app renderer";
} catch (error) {
  document.querySelector("#status")!.textContent = `FAIL: ${error}`;
  throw error;
}
