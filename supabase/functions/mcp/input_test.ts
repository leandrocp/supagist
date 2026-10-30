import { z } from "zod";
import { renderInput } from "./input.ts";

Deno.test("render input preserves Unicode code points, normalizes newlines, and bounds output scale", () => {
  const input = renderInput.parse({ code: "a\r\nb\rc" });
  if (input.code !== "a\nb\nc" || input.pixelRatio !== 1 || input.format !== "svg") {
    throw new Error("Normalization or defaults changed");
  }
  for (const code of ["x".repeat(8000), "😀".repeat(8000)]) {
    if (!renderInput.safeParse({ code }).success) throw new Error("Valid code rejected");
  }
  for (const invalid of [
    { code: "" },
    { code: "x".repeat(8001) },
    { code: "😀".repeat(8001) },
    { code: "x", pixelRatio: 0 },
    { code: "x", pixelRatio: 3 },
    { code: "x", format: "png" },
    { code: "x", format: "jpeg" },
    { code: "x", fixture: "unknown" },
    { code: "x", brand: "unknown" },
    { code: "x", brand: "supabase", fixture: "vercel" },
    { code: "x", background: "unknown" },
    { code: "x", fontId: "unknown" },
    { code: "x", fontSize: 15 },
    { code: "x", outerPadding: 17 },
    { code: "x", header: { filenamePosition: "top" } },
    { code: "x", footer: { showLicense: true } },
    { code: "x", branding: "supabase" },
    { code: Array(31).fill("x").join("\n") },
    { code: "x", comments: { 2: { body: "missing source line" } } },
    { code: "x", comments: { 0: { body: "not 1-based" } } },
    { code: "x", comments: { "01": { body: "noncanonical key" } } },
    {
      code: "x",
      reactions: {
        1: [
          { emoji: "+1", reactors: [{ username: "Ada", avatarUrl: "https://example.com/a.png" }] },
        ],
      },
    },
    { code: "x", reactions: { 1: [{ emoji: "+1", reactors: [] }] } },
    { code: "x", comments: { 1: { body: "x".repeat(2001) } } },
    { code: "x", aspectRatio: "4:3" },
    { code: "x", aspectRatio: "16/9" },
    { code: "x", ligatures: "off" },
  ]) {
    if (renderInput.safeParse(invalid).success) throw new Error("Invalid render input accepted");
  }
});

Deno.test("brand selection and explicit appearance overrides survive tool validation", () => {
  const input = renderInput.parse({
    code: "const greeting = 'Olá';",
    brand: "supabase",
    filename: "greeting.js",
    lineNumbers: true,
    fontId: "fira",
    background: null,
    fontSize: 18,
    outerPadding: 64,
    header: { showLanguage: false },
    footer: { enabled: true, showAuthor: true },
    author: "Leandro",
  });
  if (
    input.brand !== "supabase" ||
    input.theme !== undefined ||
    input.fontId !== "fira" ||
    input.filename !== "greeting.js" ||
    input.background !== null ||
    !input.lineNumbers ||
    !input.footer?.enabled ||
    input.author !== "Leandro"
  ) {
    throw new Error(
      "Tool validation silently dropped requested appearance or masked the brand theme",
    );
  }
});

Deno.test("16:9 canvas and ligatures toggle are optional, advertised tool fields", () => {
  const defaults = renderInput.parse({ code: "x |> y" });
  if (defaults.aspectRatio !== undefined || defaults.ligatures !== undefined) {
    throw new Error("New options must default off");
  }
  const input = renderInput.parse({ code: "x |> y", aspectRatio: "16:9", ligatures: false });
  if (input.aspectRatio !== "16:9" || input.ligatures !== false) {
    throw new Error("Tool validation dropped aspectRatio or ligatures");
  }
  const schema = z.toJSONSchema(renderInput, { io: "input" }) as {
    properties: Record<string, { enum?: string[]; type?: string }>;
  };
  if (
    schema.properties.aspectRatio?.enum?.join() !== "16:9" ||
    schema.properties.ligatures?.type !== "boolean"
  ) {
    throw new Error("Tool schema does not advertise aspectRatio and ligatures");
  }
});
