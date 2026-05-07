import { describe, it, expect } from "vitest";
import { isPersistentUser } from "./auth-button";

describe("isPersistentUser", () => {
  it("returns false for null/undefined claims (logged out)", () => {
    expect(isPersistentUser(null)).toBe(false);
    expect(isPersistentUser(undefined)).toBe(false);
  });

  it("returns false for anonymous users — they have a session but not an identity", () => {
    expect(isPersistentUser({ is_anonymous: true })).toBe(false);
  });

  it("returns true for real users (no is_anonymous flag)", () => {
    expect(isPersistentUser({})).toBe(true);
  });

  it("returns true when is_anonymous is explicitly false", () => {
    expect(isPersistentUser({ is_anonymous: false })).toBe(true);
  });
});
