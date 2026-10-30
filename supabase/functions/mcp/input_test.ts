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
  ]) {
    if (renderInput.safeParse(invalid).success) throw new Error("Invalid render input accepted");
  }
});
