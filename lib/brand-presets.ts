import {
  createAmbientBrandScene,
  type BrandSceneAppearance,
  type BrandScenePreset,
} from "@/lib/brand-scenes";
import {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  type ExportFooterSettings,
  type ExportHeaderSettings,
} from "@/lib/export-metadata";

export {
  createAmbientBrandScene,
  createBrandCanvasBackground,
  createBrandFrameShadow,
  type BrandSceneGuide,
} from "@/lib/brand-scenes";
export {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  normalizeFooterSettings,
  normalizeHeaderSettings,
  visibleFooterItems,
} from "@/lib/export-metadata";

export type BrandWindowDecoration = "macos" | "macos-subtle" | "windows" | "minimal" | "none";

export type BrandFramePreset = {
  showDots?: boolean;
  showCenteredFilename?: boolean;
  headerStrip?: { showLanguage?: boolean };
  cardBorder?: { color: string; width: number } | null;
  cardRadius?: number;
  cardFill?: string;
};

export type BrandPresetShape = {
  id: string;
  name: string;
  /** Public path to the brand's official mark. Omitted for brands that have
   *  no logo to source — the picker falls back to an accent dot rather than
   *  us inventing a mark that could be mistaken for theirs. */
  logoUrl?: string;
  accent: string;
  appearance: BrandSceneAppearance;
  scene?: BrandScenePreset;
  background: {
    label: string;
    from: string;
    to: string;
    patternUrl?: string;
    brandId: string;
    frame?: BrandFramePreset;
  };
  settings: {
    theme: string;
    fontId: "system" | "jetbrains" | "fira" | "geist" | "hack";
    outerPadding: 0 | 16 | 32 | 64 | 96 | 128;
    innerPadding: 8 | 12 | 16 | 24 | 32 | 48;
    cornerRadius: 0 | 4 | 8 | 12 | 16;
    lineNumbers: boolean;
    header: ExportHeaderSettings;
    footer: ExportFooterSettings;
    windowDecoration: BrandWindowDecoration;
  };
};

const darkFrame = (fill: string, border: string, radius = 8): BrandFramePreset => ({
  showDots: false,
  cardBorder: { color: border, width: 1 },
  cardRadius: radius,
  cardFill: fill,
});

const lightFrame = (fill: string, border: string, radius = 8): BrandFramePreset => ({
  showDots: false,
  cardBorder: { color: border, width: 1 },
  cardRadius: radius,
  cardFill: fill,
});

type SceneOverrides = Partial<Omit<BrandScenePreset, "frame">> & {
  frame?: Partial<Omit<BrandScenePreset["frame"], "shadow">> & {
    shadow?: Partial<BrandScenePreset["frame"]["shadow"]>;
  };
};

function signatureScene(
  appearance: BrandSceneAppearance,
  accent: string,
  secondary: string,
  overrides: SceneOverrides,
): BrandScenePreset {
  const base = createAmbientBrandScene(appearance, accent, secondary);
  return {
    ...base,
    ...overrides,
    frame: {
      ...base.frame,
      ...overrides.frame,
      shadow: {
        ...base.frame.shadow,
        ...overrides.frame?.shadow,
      },
    },
  };
}

const SUPABASE_SCENE = signatureScene("dark", "#3ECF8E", "#1C7C54", {
  glows: [
    { x: 82, y: 4, radius: 62, color: "#3ECF8E", opacity: 0.3 },
    { x: 18, y: 92, radius: 74, color: "#1C7C54", opacity: 0.2 },
    { x: 48, y: 34, radius: 48, color: "#FFFFFF", opacity: 0.04 },
  ],
  canvasBorder: "rgba(62,207,142,0.24)",
  guide: "studio",
  guideColor: "rgba(62,207,142,0.28)",
  frame: {
    rimFrom: "rgba(62,207,142,0.48)",
    rimTo: "rgba(255,255,255,0.1)",
    shadow: { color: "#000000", opacity: 0.62, y: 14, blur: 28 },
  },
});

const VERCEL_SCENE = signatureScene("dark", "#FFFFFF", "#71717A", {
  glows: [
    { x: 50, y: 44, radius: 58, color: "#FFFFFF", opacity: 0.035 },
    { x: 100, y: 100, radius: 52, color: "#71717A", opacity: 0.08 },
  ],
  vignette: { color: "#000000", opacity: 0.72 },
  canvasBorder: "rgba(255,255,255,0.16)",
  guide: "registration",
  guideColor: "rgba(255,255,255,0.18)",
  frame: {
    rimFrom: "rgba(255,255,255,0.08)",
    rimTo: "rgba(255,255,255,0.02)",
    innerStroke: "rgba(255,255,255,0.05)",
    shadow: { color: "#000000", opacity: 0.78, y: 18, blur: 34 },
  },
});

const TAILWIND_SCENE = signatureScene("light", "#C084FC", "#22D3EE", {
  glows: [
    { x: 10, y: 8, radius: 62, color: "#D8B4FE", opacity: 0.52 },
    { x: 92, y: 84, radius: 72, color: "#67E8F9", opacity: 0.42 },
    { x: 52, y: 42, radius: 54, color: "#FFFFFF", opacity: 0.48 },
  ],
  vignette: { color: "#8B5CF6", opacity: 0.08 },
  canvasBorder: "rgba(100,116,139,0.28)",
  guide: "crosshair",
  guideColor: "rgba(71,85,105,0.3)",
  frame: {
    rimFrom: "rgba(255,255,255,0.95)",
    rimTo: "rgba(148,163,184,0.48)",
    innerStroke: "rgba(100,116,139,0.18)",
    shadow: { color: "#64748B", opacity: 0.24, y: 14, blur: 28 },
  },
});

const STRIPE_SCENE = signatureScene("dark", "#635BFF", "#11EFE3", {
  glows: [
    { x: 12, y: 0, radius: 68, color: "#635BFF", opacity: 0.4 },
    { x: 92, y: 90, radius: 72, color: "#11EFE3", opacity: 0.3 },
    { x: 76, y: 14, radius: 48, color: "#9966FF", opacity: 0.24 },
  ],
  canvasBorder: "rgba(99,91,255,0.42)",
  guide: "stripe-planes",
  guideColor: "rgba(255,255,255,0.16)",
  frame: {
    rimFrom: "#635BFF",
    rimTo: "#11EFE3",
    shadow: { color: "#020B16", opacity: 0.64, y: 14, blur: 28 },
  },
});

const OPENAI_SCENE = signatureScene("dark", "#10A37F", "#D2F3E8", {
  glows: [
    { x: 78, y: 10, radius: 66, color: "#10A37F", opacity: 0.22 },
    { x: 22, y: 88, radius: 70, color: "#D2F3E8", opacity: 0.1 },
    { x: 50, y: 45, radius: 44, color: "#FFFFFF", opacity: 0.055 },
  ],
  canvasBorder: "rgba(210,243,232,0.2)",
  guide: "halo",
  guideColor: "rgba(210,243,232,0.2)",
  frame: {
    rimFrom: "rgba(210,243,232,0.28)",
    rimTo: "rgba(16,163,127,0.42)",
    shadow: { color: "#000000", opacity: 0.64, y: 14, blur: 28 },
  },
});

const LINEAR_SCENE = signatureScene("dark", "#8B5CF6", "#4F46E5", {
  glows: [
    { x: 86, y: 4, radius: 70, color: "#8B5CF6", opacity: 0.42 },
    { x: 8, y: 96, radius: 78, color: "#4F46E5", opacity: 0.28 },
    { x: 52, y: 38, radius: 52, color: "#FFFFFF", opacity: 0.045 },
  ],
  canvasBorder: "rgba(139,92,246,0.34)",
  guide: "beam",
  guideColor: "rgba(196,181,253,0.35)",
  frame: {
    rimFrom: "rgba(139,92,246,0.68)",
    rimTo: "rgba(79,70,229,0.54)",
    shadow: { color: "#09051A", opacity: 0.68, y: 14, blur: 30 },
  },
});

// Paper-white canvas, near-invisible guides. The card carries the whole
// design, so the scene only has to stay out of its way.
const FLUE_SCENE = signatureScene("light", "#4F46E5", "#94A3B8", {
  glows: [
    { x: 88, y: 6, radius: 58, color: "#E0E7FF", opacity: 0.55 },
    { x: 6, y: 94, radius: 62, color: "#E2E8F0", opacity: 0.5 },
    { x: 50, y: 40, radius: 50, color: "#FFFFFF", opacity: 0.6 },
  ],
  vignette: { color: "#0F172A", opacity: 0.03 },
  canvasBorder: "rgba(15,23,42,0.07)",
  guide: "crosshair",
  guideColor: "rgba(15,23,42,0.07)",
  frame: {
    rimFrom: "rgba(228,228,231,0.9)",
    rimTo: "rgba(228,228,231,0.9)",
    innerStroke: "rgba(255,255,255,0.9)",
    highlight: "rgba(255,255,255,1)",
    shadow: { color: "#0F172A", opacity: 0.1, y: 12, blur: 26 },
  },
});

const FILES_SDK_SCENE = signatureScene("light", "#6366F1", "#A5B4FC", {
  glows: [
    { x: 6, y: 6, radius: 60, color: "#DDD6FE", opacity: 0.6 },
    { x: 94, y: 92, radius: 66, color: "#C7D2FE", opacity: 0.55 },
    { x: 50, y: 44, radius: 52, color: "#FFFFFF", opacity: 0.45 },
  ],
  vignette: { color: "#6366F1", opacity: 0.06 },
  canvasBorder: "rgba(99,102,241,0.16)",
  guide: "crosshair",
  guideColor: "rgba(99,102,241,0.2)",
  frame: {
    rimFrom: "rgba(255,255,255,0.95)",
    rimTo: "rgba(165,180,252,0.55)",
    innerStroke: "rgba(99,102,241,0.12)",
    highlight: "rgba(255,255,255,0.95)",
    shadow: { color: "#4338CA", opacity: 0.2, y: 16, blur: 34 },
  },
});

// Pure black with a single soft diagonal sheen — the `beam` guide painted at
// a few percent white, which is what reads as "sheen" rather than "stripe".
const RIVETKIT_SCENE = signatureScene("dark", "#FFFFFF", "#A1A1AA", {
  glows: [
    { x: 50, y: 6, radius: 54, color: "#FFFFFF", opacity: 0.05 },
    { x: 96, y: 10, radius: 44, color: "#FFFFFF", opacity: 0.035 },
  ],
  vignette: { color: "#000000", opacity: 0.6 },
  canvasBorder: "rgba(255,255,255,0.08)",
  guide: "beam",
  guideColor: "rgba(255,255,255,0.06)",
  frame: {
    rimFrom: "rgba(255,255,255,0.14)",
    rimTo: "rgba(255,255,255,0.04)",
    innerStroke: "rgba(255,255,255,0.05)",
    shadow: { color: "#000000", opacity: 0.8, y: 20, blur: 40 },
  },
});

// The signature here is two concentric teal hairlines: the canvas rim and the
// card border, kept close together by a deliberately tight outer padding.
const PLZ_SCENE = signatureScene("dark", "#2DD4BF", "#5EEAD4", {
  glows: [
    { x: 50, y: 0, radius: 60, color: "#2DD4BF", opacity: 0.08 },
    { x: 50, y: 100, radius: 60, color: "#0D9488", opacity: 0.06 },
  ],
  vignette: { color: "#000000", opacity: 0.34 },
  canvasBorder: "rgba(45,212,191,0.28)",
  canvasRadius: 18,
  guide: "none",
  guideColor: "rgba(45,212,191,0.2)",
  frame: {
    rimFrom: "rgba(45,212,191,0.3)",
    rimTo: "rgba(45,212,191,0.12)",
    innerStroke: "rgba(45,212,191,0.1)",
    shadow: { color: "#020F14", opacity: 0.7, y: 12, blur: 26 },
  },
});

const defaults = (
  theme: string,
  options: Partial<BrandPresetShape["settings"]> = {},
): BrandPresetShape["settings"] => ({
  theme,
  fontId: "geist",
  outerPadding: 32,
  innerPadding: 16,
  cornerRadius: 8,
  lineNumbers: false,
  header: DEFAULT_HEADER_SETTINGS,
  footer: {
    ...DEFAULT_FOOTER_SETTINGS,
    showCharCount: false,
    showAuthor: false,
  },
  windowDecoration: "minimal",
  ...options,
});

/**
 * Recognizable developer brands for people sharing code on social media.
 * A Brand is an atomic appearance preset. Theme remains an official Lumis
 * colorscheme and can be changed independently after a Brand is applied.
 */
export const BRAND_PRESETS = [
  {
    id: "supabase",
    name: "Supabase",
    logoUrl: "/brands/supabase.svg",
    accent: "#3ECF8E",
    appearance: "dark",
    scene: SUPABASE_SCENE,
    background: {
      label: "Supabase",
      from: "#121212",
      to: "#121212",
      brandId: "supabase",
      frame: {
        showDots: false,
        showCenteredFilename: false,
        headerStrip: { showLanguage: false },
        cardBorder: { color: "#292929", width: 1 },
        cardRadius: 8,
        cardFill: "#171717",
      },
    },
    settings: defaults("github_dark", {
      windowDecoration: "none",
      fontId: "geist",
      header: {
        ...DEFAULT_HEADER_SETTINGS,
        showLanguage: false,
        filenamePosition: "left",
      },
    }),
  },
  {
    id: "vercel",
    name: "Vercel",
    logoUrl: "/brands/vercel.svg",
    accent: "#FFFFFF",
    appearance: "dark",
    scene: VERCEL_SCENE,
    background: {
      label: "Vercel",
      from: "#000000",
      to: "#000000",
      brandId: "vercel",
      frame: {
        showDots: false,
        cardBorder: null,
        cardRadius: 0,
        cardFill: "#000000",
      },
    },
    settings: defaults("github_dark", {
      windowDecoration: "minimal",
      cornerRadius: 0,
      outerPadding: 64,
      fontId: "geist",
    }),
  },
  {
    id: "tailwind",
    name: "Tailwind",
    logoUrl: "/brands/tailwind.svg",
    accent: "#38BDF8",
    appearance: "light",
    scene: TAILWIND_SCENE,
    background: {
      label: "Tailwind",
      from: "#E9D5FF",
      to: "#CFFAFE",
      patternUrl: "/brands/tailwind-beams.png",
      brandId: "tailwind",
      frame: {
        showDots: true,
        cardBorder: { color: "rgba(255,255,255,0.35)", width: 1 },
        cardRadius: 8,
      },
    },
    settings: defaults("github_light", {
      windowDecoration: "macos-subtle",
      outerPadding: 32,
      fontId: "fira",
    }),
  },
  {
    id: "resend",
    name: "Resend",
    logoUrl: "/brands/resend.svg",
    accent: "#FFFFFF",
    appearance: "dark",
    background: {
      label: "Resend",
      from: "#B1B1B1",
      to: "#181818",
      patternUrl: "/brands/resend-dark.png",
      brandId: "resend",
      frame: {
        showDots: false,
        showCenteredFilename: false,
        headerStrip: { showLanguage: true },
        cardBorder: { color: "rgba(255,255,255,0.13)", width: 1 },
        cardRadius: 8,
        cardFill: "#111111",
      },
    },
    settings: defaults("github_dark", {
      windowDecoration: "none",
      fontId: "geist",
      header: { ...DEFAULT_HEADER_SETTINGS, filenamePosition: "left" },
    }),
  },
  {
    id: "stripe",
    name: "Stripe",
    logoUrl: "/brands/stripe.svg",
    accent: "#635BFF",
    appearance: "dark",
    scene: STRIPE_SCENE,
    background: {
      label: "Stripe",
      from: "#0A2540",
      to: "#0A2540",
      brandId: "stripe",
      frame: {
        showDots: false,
        cardBorder: { color: "#0F395E", width: 1 },
        cardRadius: 8,
        cardFill: "#0C2E4E",
      },
    },
    settings: defaults("material_oceanic", { windowDecoration: "minimal", fontId: "fira" }),
  },
  {
    id: "github",
    name: "GitHub",
    logoUrl: "/brands/github.svg",
    accent: "#F0F6FC",
    appearance: "dark",
    background: {
      label: "GitHub",
      from: "#0D1117",
      to: "#161B22",
      brandId: "github",
      frame: darkFrame("#0D1117", "#30363D", 8),
    },
    settings: defaults("github_dark", {
      windowDecoration: "macos-subtle",
      lineNumbers: true,
      fontId: "system",
    }),
  },
  {
    id: "openai",
    name: "OpenAI",
    logoUrl: "/brands/openai.svg",
    accent: "#10A37F",
    appearance: "dark",
    scene: OPENAI_SCENE,
    background: {
      label: "OpenAI",
      from: "#000000",
      to: "#18352E",
      brandId: "openai",
      frame: darkFrame("#111111", "#2D2D2D", 12),
    },
    settings: defaults("github_dark", { cornerRadius: 12, fontId: "geist" }),
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    logoUrl: "/brands/cloudflare.svg",
    accent: "#F48120",
    appearance: "dark",
    background: {
      label: "Cloudflare",
      from: "#111111",
      to: "#5B2A08",
      brandId: "cloudflare",
      frame: darkFrame("#151515", "#6B3A16", 8),
    },
    settings: defaults("darkplus", { windowDecoration: "minimal", fontId: "system" }),
  },
  {
    id: "linear",
    name: "Linear",
    logoUrl: "/brands/linear.svg",
    accent: "#8A8F98",
    appearance: "dark",
    scene: LINEAR_SCENE,
    background: {
      label: "Linear",
      from: "#15151A",
      to: "#4A3EA1",
      brandId: "linear",
      frame: darkFrame("#17171C", "#35343F", 12),
    },
    settings: defaults("tokyonight_night", { cornerRadius: 12, fontId: "geist" }),
  },
  {
    id: "cursor",
    name: "Cursor",
    logoUrl: "/brands/cursor.svg",
    accent: "#FFFFFF",
    appearance: "dark",
    background: {
      label: "Cursor",
      from: "#050505",
      to: "#303030",
      brandId: "cursor",
      frame: darkFrame("#101010", "#3A3A3A", 4),
    },
    settings: defaults("vscode_dark", {
      windowDecoration: "none",
      cornerRadius: 4,
      lineNumbers: true,
      fontId: "system",
    }),
  },
  {
    id: "anthropic",
    name: "Anthropic",
    logoUrl: "/brands/anthropic.svg",
    accent: "#D97757",
    appearance: "light",
    background: {
      label: "Anthropic",
      from: "#E8E2D9",
      to: "#C9B9A5",
      brandId: "anthropic",
      frame: lightFrame("#F4EFE7", "#BDAE9B", 8),
    },
    settings: defaults("flexoki_light", { windowDecoration: "minimal", fontId: "system" }),
  },
  {
    id: "gemini",
    name: "Gemini",
    logoUrl: "/brands/gemini.svg",
    accent: "#8AB4F8",
    appearance: "dark",
    background: {
      label: "Gemini",
      from: "#16181D",
      to: "#273A6B",
      brandId: "gemini",
      frame: darkFrame("#171A21", "#405A91", 12),
    },
    settings: defaults("poimandres", { cornerRadius: 12, fontId: "geist" }),
  },
  {
    id: "perplexity",
    name: "Perplexity",
    logoUrl: "/brands/perplexity.svg",
    accent: "#20B8CD",
    appearance: "dark",
    background: {
      label: "Perplexity",
      from: "#071A1E",
      to: "#12434A",
      brandId: "perplexity",
      frame: darkFrame("#0B1F23", "#1D5961", 8),
    },
    settings: defaults("carbonfox", { windowDecoration: "minimal", fontId: "system" }),
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    logoUrl: "/brands/huggingface.svg",
    accent: "#FFD21E",
    appearance: "light",
    background: {
      label: "Hugging Face",
      from: "#FFF6C7",
      to: "#FFD21E",
      brandId: "huggingface",
      frame: lightFrame("#FFFDF5", "#D6B622", 12),
    },
    settings: defaults("github_light", { cornerRadius: 12, fontId: "system" }),
  },
  {
    id: "docker",
    name: "Docker",
    logoUrl: "/brands/docker.svg",
    accent: "#2496ED",
    appearance: "dark",
    background: {
      label: "Docker",
      from: "#0B214A",
      to: "#2496ED",
      brandId: "docker",
      frame: darkFrame("#0D1F36", "#247FC1", 8),
    },
    settings: defaults("cobalt2", { windowDecoration: "macos-subtle", fontId: "fira" }),
  },
  {
    id: "clerk",
    name: "Clerk",
    logoUrl: "/brands/clerk.svg",
    accent: "#6C47FF",
    appearance: "dark",
    background: {
      label: "Clerk",
      from: "#15111F",
      to: "#6C47FF",
      brandId: "clerk",
      frame: darkFrame("#18141F", "#4B3B7A", 12),
    },
    settings: defaults("catppuccin_mocha", { cornerRadius: 12, fontId: "geist" }),
  },
  {
    id: "prisma",
    name: "Prisma",
    logoUrl: "/brands/prisma.svg",
    accent: "#5A67D8",
    appearance: "dark",
    background: {
      label: "Prisma",
      from: "#061B2B",
      to: "#0C344B",
      brandId: "prisma",
      frame: darkFrame("#0D1B2A", "#24465A", 8),
    },
    settings: defaults("poimandres", { windowDecoration: "minimal", fontId: "fira" }),
  },
  {
    id: "aws",
    name: "AWS",
    logoUrl: "/brands/aws.svg",
    accent: "#FF9900",
    appearance: "dark",
    background: {
      label: "AWS",
      from: "#151D26",
      to: "#243447",
      brandId: "aws",
      frame: darkFrame("#111820", "#5B4930", 8),
    },
    settings: defaults("darkplus", { windowDecoration: "minimal", fontId: "system" }),
  },
  {
    id: "mintlify",
    name: "Mintlify",
    logoUrl: "/brands/mintlify.svg",
    accent: "#18E299",
    appearance: "dark",
    background: {
      label: "Mintlify",
      from: "#060807",
      to: "#0D3D2C",
      brandId: "mintlify",
      frame: darkFrame("#0D1110", "#1B5B42", 12),
    },
    settings: defaults("github_dark", { cornerRadius: 12, fontId: "geist" }),
  },
  {
    id: "nuxt",
    name: "Nuxt",
    logoUrl: "/brands/nuxt.svg",
    accent: "#00DC82",
    appearance: "dark",
    background: {
      label: "Nuxt",
      from: "#0B1220",
      to: "#003E2F",
      brandId: "nuxt",
      frame: darkFrame("#101827", "#166B52", 8),
    },
    settings: defaults("material_oceanic", { windowDecoration: "minimal", fontId: "fira" }),
  },
  {
    id: "auth0",
    name: "Auth0",
    logoUrl: "/brands/auth0.svg",
    accent: "#EB5424",
    appearance: "dark",
    background: {
      label: "Auth0",
      from: "#171717",
      to: "#3A174C",
      brandId: "auth0",
      frame: darkFrame("#17151A", "#56355F", 8),
    },
    settings: defaults("dracula", { windowDecoration: "minimal", fontId: "fira" }),
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    logoUrl: "/brands/elevenlabs.svg",
    accent: "#FFFFFF",
    appearance: "dark",
    background: {
      label: "ElevenLabs",
      from: "#000000",
      to: "#262626",
      brandId: "elevenlabs",
      frame: darkFrame("#0A0A0A", "#333333", 0),
    },
    settings: defaults("github_dark", {
      windowDecoration: "none",
      cornerRadius: 0,
      fontId: "system",
    }),
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    logoUrl: "/brands/firecrawl.svg",
    accent: "#FA5D19",
    appearance: "dark",
    background: {
      label: "Firecrawl",
      from: "#0B0908",
      to: "#58210B",
      brandId: "firecrawl",
      frame: darkFrame("#110D0B", "#6A2D14", 8),
    },
    settings: defaults("github_dark", { windowDecoration: "minimal", fontId: "system" }),
  },
  {
    id: "browserbase",
    name: "Browserbase",
    logoUrl: "/brands/browserbase.svg",
    accent: "#FF4500",
    appearance: "dark",
    background: {
      label: "Browserbase",
      from: "#FF4500",
      to: "#000000",
      brandId: "browserbase",
      frame: darkFrame("#111111", "#783018", 4),
    },
    settings: defaults("darkplus", { cornerRadius: 4, fontId: "system" }),
  },
  {
    id: "triggerdev",
    name: "Trigger.dev",
    logoUrl: "/brands/triggerdev.svg",
    accent: "#A77BF3",
    appearance: "dark",
    background: {
      label: "Trigger.dev",
      from: "#121317",
      to: "#34204E",
      brandId: "triggerdev",
      frame: darkFrame("#15161B", "#49315F", 8),
    },
    settings: defaults("tokyonight_night", { windowDecoration: "minimal", fontId: "geist" }),
  },
  {
    id: "flue",
    name: "Flue",
    logoUrl: "/brands/flue.svg",
    accent: "#4F46E5",
    appearance: "light",
    scene: FLUE_SCENE,
    background: {
      label: "Flue",
      from: "#FCFCFD",
      to: "#F1F1F4",
      brandId: "flue",
      frame: {
        showDots: false,
        showCenteredFilename: false,
        headerStrip: { showLanguage: false },
        cardBorder: { color: "#E4E4E7", width: 1 },
        cardRadius: 12,
        cardFill: "#FFFFFF",
      },
    },
    settings: defaults("github_light", {
      windowDecoration: "minimal",
      outerPadding: 64,
      innerPadding: 32,
      cornerRadius: 12,
      fontId: "jetbrains",
      header: {
        ...DEFAULT_HEADER_SETTINGS,
        showLanguage: false,
        filenamePosition: "left",
      },
    }),
  },
  {
    id: "files-sdk",
    name: "Files SDK",
    logoUrl: "/brands/files-sdk.svg",
    accent: "#6366F1",
    appearance: "light",
    scene: FILES_SDK_SCENE,
    background: {
      label: "Files SDK",
      from: "#EDE9FE",
      to: "#E0E7FF",
      brandId: "files-sdk",
      frame: {
        showDots: true,
        showCenteredFilename: false,
        headerStrip: { showLanguage: true },
        cardBorder: { color: "rgba(255,255,255,0.7)", width: 1 },
        cardRadius: 16,
        cardFill: "#FDFCF7",
      },
    },
    settings: defaults("catppuccin_latte", {
      windowDecoration: "macos-subtle",
      outerPadding: 64,
      innerPadding: 24,
      cornerRadius: 16,
      lineNumbers: true,
      fontId: "jetbrains",
      header: { ...DEFAULT_HEADER_SETTINGS, filenamePosition: "left" },
    }),
  },
  {
    id: "rivetkit",
    name: "RivetKit",
    logoUrl: "/brands/rivetkit.svg",
    accent: "#FFFFFF",
    appearance: "dark",
    scene: RIVETKIT_SCENE,
    background: {
      label: "RivetKit",
      from: "#000000",
      to: "#0A0A0A",
      brandId: "rivetkit",
      frame: {
        showDots: false,
        showCenteredFilename: true,
        cardBorder: { color: "rgba(255,255,255,0.14)", width: 1 },
        cardRadius: 16,
        cardFill: "#0B0B0B",
      },
    },
    settings: defaults("onedark", {
      windowDecoration: "minimal",
      outerPadding: 96,
      innerPadding: 24,
      cornerRadius: 16,
      lineNumbers: true,
      fontId: "jetbrains",
      header: {
        ...DEFAULT_HEADER_SETTINGS,
        showLanguage: false,
        filenamePosition: "center",
      },
    }),
  },
  {
    id: "plz",
    name: "plz",
    accent: "#2DD4BF",
    appearance: "dark",
    scene: PLZ_SCENE,
    background: {
      label: "plz",
      from: "#04141B",
      to: "#04141B",
      brandId: "plz",
      frame: {
        showDots: false,
        showCenteredFilename: false,
        headerStrip: { showLanguage: false },
        cardBorder: { color: "rgba(45,212,191,0.22)", width: 1 },
        cardRadius: 16,
        cardFill: "#061A22",
      },
    },
    settings: defaults("terafox", {
      windowDecoration: "minimal",
      outerPadding: 16,
      innerPadding: 24,
      cornerRadius: 16,
      fontId: "jetbrains",
      header: {
        ...DEFAULT_HEADER_SETTINGS,
        showLanguage: false,
        filenamePosition: "left",
      },
    }),
  },
] as const satisfies readonly BrandPresetShape[];

export type BrandPreset = (typeof BRAND_PRESETS)[number];
export type BrandId = BrandPreset["id"];

export function resolveBrandScene(preset: BrandPresetShape): BrandScenePreset {
  return preset.scene ?? createAmbientBrandScene(preset.appearance, preset.accent);
}

export const LEGACY_BRAND_THEME_MAP: Readonly<Record<string, string>> = {
  "supabase-dark": "github_dark",
  "supabase-light": "github_light",
  "vercel-dark": "github_dark",
  "vercel-light": "github_light",
  "tailwind-dark": "github_dark",
  "tailwind-light": "github_light",
  "resend-dark": "github_dark",
  "resend-light": "github_light",
  "stripe-dark": "material_oceanic",
};

export function normalizeLegacyBrandTheme(themeId: string): string {
  return LEGACY_BRAND_THEME_MAP[themeId] ?? themeId;
}

export type BrandAppearance = {
  theme: string;
  background: string | null;
  fontId: string;
  outerPadding: number;
  innerPadding: number;
  cornerRadius: number;
  lineNumbers: boolean;
  header: ExportHeaderSettings;
  footer: ExportFooterSettings;
  windowDecoration: BrandWindowDecoration;
};

const BRAND_PRESET_BY_ID = new Map<string, BrandPreset>(
  BRAND_PRESETS.map((preset) => [preset.id, preset]),
);

export function getBrandPreset(id: string): BrandPreset | null {
  return BRAND_PRESET_BY_ID.get(id) ?? null;
}

export function applyBrandPreset<T extends BrandAppearance>(draft: T, preset: BrandPreset): T {
  return {
    ...draft,
    ...preset.settings,
    background: preset.background.label,
  };
}

export function findMatchingBrandPreset(appearance: BrandAppearance): BrandPreset | null {
  return (
    BRAND_PRESETS.find((preset) => {
      const settings = preset.settings;
      return (
        appearance.theme === settings.theme &&
        appearance.background === preset.background.label &&
        appearance.fontId === settings.fontId &&
        appearance.outerPadding === settings.outerPadding &&
        appearance.innerPadding === settings.innerPadding &&
        appearance.cornerRadius === settings.cornerRadius &&
        appearance.lineNumbers === settings.lineNumbers &&
        JSON.stringify(appearance.header) === JSON.stringify(settings.header) &&
        JSON.stringify(appearance.footer) === JSON.stringify(settings.footer) &&
        appearance.windowDecoration === settings.windowDecoration
      );
    }) ?? null
  );
}
