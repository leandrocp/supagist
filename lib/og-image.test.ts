import { describe, expect, it } from "vitest";
import { cardPathFor } from "@/lib/og-image";

describe("cardPathFor", () => {
  it("sits beside the canonical PNG under the same version", () => {
    expect(cardPathFor("u/snippets/s/canonical.png")).toBe("u/snippets/s/card.png");
    expect(cardPathFor("u/snippets/s/canonical-3.png")).toBe("u/snippets/s/card-3.png");
  });
});
