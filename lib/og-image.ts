/**
 * Where publish stores the card-only render beside its canonical PNG
 * (`canonical.png` -> `card.png`, `canonical-<v>.png` -> `card-<v>.png`).
 * Cleanup derives it the same way (`private.snippet_card_path`).
 */
export function cardPathFor(canonicalPath: string): string {
  const slash = canonicalPath.lastIndexOf("/");
  const name = canonicalPath.slice(slash + 1);
  const version =
    name.startsWith("canonical") && name.endsWith(".png")
      ? name.slice("canonical".length, -".png".length)
      : "";
  return `${canonicalPath.slice(0, slash + 1)}card${version}.png`;
}
