import { describe, it, expect } from "vitest";
import { safeNextPath, buildLoginUrl } from "./auth-redirect";

describe("safeNextPath", () => {
  it("returns the path when it's a clean in-app route", () => {
    expect(safeNextPath("/rose-tsx-y432un")).toBe("/rose-tsx-y432un");
    expect(safeNextPath("/protected")).toBe("/protected");
  });

  it("falls back when the value is missing or empty", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("respects an explicit fallback", () => {
    expect(safeNextPath(null, "/protected")).toBe("/protected");
    expect(safeNextPath("", "/protected")).toBe("/protected");
  });

  it("rejects paths that don't start with /", () => {
    expect(safeNextPath("rose-tsx-y432un")).toBe("/");
    expect(safeNextPath("https://evil.com/x")).toBe("/");
  });

  it("rejects protocol-relative URLs (// host)", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("//evil.com/path")).toBe("/");
  });

  it("rejects backslash authority paths that browsers normalize off-origin", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("/\\/evil.com")).toBe("/");
  });

  it("rejects control characters that URL parsing can trim or normalize", () => {
    expect(safeNextPath("/\t//evil.com")).toBe("/");
    expect(safeNextPath("/safe\npath")).toBe("/");
    expect(safeNextPath("/safe\u007fpath")).toBe("/");
  });

  it("allows colons inside a same-origin path or query", () => {
    expect(safeNextPath("/notes/10:30")).toBe("/notes/10:30");
    expect(safeNextPath("/search?q=type:typescript")).toBe("/search?q=type:typescript");
  });
});

describe("buildLoginUrl", () => {
  it("encodes the current path into ?next when it's a snippet page", () => {
    expect(buildLoginUrl("/rose-tsx-y432un")).toBe("/auth/login?next=%2Frose-tsx-y432un");
  });

  it("does not add ?next when the user is already at the home page", () => {
    expect(buildLoginUrl("/")).toBe("/auth/login");
  });

  it("does not add ?next when the user is already on the login page", () => {
    expect(buildLoginUrl("/auth/login")).toBe("/auth/login");
  });

  it("falls back to /auth/login for invalid paths (avoids open-redirect)", () => {
    expect(buildLoginUrl("https://evil.com")).toBe("/auth/login");
    expect(buildLoginUrl("//evil.com")).toBe("/auth/login");
    expect(buildLoginUrl(null)).toBe("/auth/login");
  });

  it("encodes special characters in the path", () => {
    // & and = need to be encoded so they don't disturb the query string
    expect(buildLoginUrl("/snippet?a=1&b=2")).toBe("/auth/login?next=%2Fsnippet%3Fa%3D1%26b%3D2");
  });
});
