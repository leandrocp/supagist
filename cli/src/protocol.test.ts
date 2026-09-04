import { describe, it, expect } from "vitest";
import {
  parseCliPort,
  parseCliState,
  cliCallbackUrl,
  cliAuthorizePath,
  parseCliSessionPayload,
  CLI_MIN_PORT,
  CLI_MAX_PORT,
} from "./protocol";

describe("parseCliPort", () => {
  it("accepts ports inside the unprivileged range", () => {
    expect(parseCliPort(String(CLI_MIN_PORT))).toBe(CLI_MIN_PORT);
    expect(parseCliPort(String(CLI_MAX_PORT))).toBe(CLI_MAX_PORT);
    expect(parseCliPort("51234")).toBe(51234);
  });

  it("rejects privileged and out-of-range ports", () => {
    expect(parseCliPort("80")).toBeNull();
    expect(parseCliPort(String(CLI_MIN_PORT - 1))).toBeNull();
    expect(parseCliPort("65536")).toBeNull();
    expect(parseCliPort("0")).toBeNull();
  });

  it("rejects anything that is not a plain decimal integer", () => {
    expect(parseCliPort("8080abc")).toBeNull();
    expect(parseCliPort("0x1f90")).toBeNull();
    expect(parseCliPort(" 8080")).toBeNull();
    expect(parseCliPort("+8080")).toBeNull();
    expect(parseCliPort("8080.0")).toBeNull();
    expect(parseCliPort("-8080")).toBeNull();
    expect(parseCliPort("")).toBeNull();
    expect(parseCliPort(null)).toBeNull();
    expect(parseCliPort(undefined)).toBeNull();
  });
});

describe("parseCliState", () => {
  const valid = "a".repeat(43);

  it("accepts a base64url string of a plausible length", () => {
    expect(parseCliState(valid)).toBe(valid);
    expect(parseCliState("Ab0_-".padEnd(20, "x"))).toBe("Ab0_-".padEnd(20, "x"));
  });

  it("rejects strings that are too short or too long", () => {
    expect(parseCliState("a".repeat(15))).toBeNull();
    expect(parseCliState("a".repeat(129))).toBeNull();
  });

  it("rejects characters outside base64url so it is safe to echo back", () => {
    expect(parseCliState(`${"a".repeat(20)}<script>`)).toBeNull();
    expect(parseCliState(`${"a".repeat(20)}/`)).toBeNull();
    expect(parseCliState(`${"a".repeat(20)}+`)).toBeNull();
    expect(parseCliState(`${"a".repeat(20)} `)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(parseCliState(null)).toBeNull();
    expect(parseCliState(undefined)).toBeNull();
  });
});

describe("callback and authorize URLs", () => {
  it("binds the callback to loopback rather than a hostname", () => {
    expect(cliCallbackUrl(51234)).toBe("http://127.0.0.1:51234/callback");
  });

  it("encodes the state into the authorize path", () => {
    expect(cliAuthorizePath(51234, "abc-_123")).toBe("/auth/cli?port=51234&state=abc-_123");
  });
});

describe("parseCliSessionPayload", () => {
  const state = "s".repeat(43);
  const payload = {
    state,
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: 1234,
    username: "leandrocp",
  };

  it("accepts a well-formed payload with a matching state", () => {
    expect(parseCliSessionPayload(payload, state)).toEqual(payload);
  });

  it("rejects a payload whose state does not match this invocation", () => {
    // Without this check any page the user happens to have open could post a
    // session into the listener while it is bound.
    expect(parseCliSessionPayload({ ...payload, state: "d".repeat(43) }, state)).toBeNull();
  });

  it("rejects a payload with no state at all", () => {
    const { state: _omitted, ...rest } = payload;
    expect(parseCliSessionPayload(rest, state)).toBeNull();
  });

  it("requires both tokens", () => {
    expect(parseCliSessionPayload({ ...payload, accessToken: "" }, state)).toBeNull();
    expect(parseCliSessionPayload({ ...payload, refreshToken: "" }, state)).toBeNull();
    expect(parseCliSessionPayload({ ...payload, accessToken: 42 }, state)).toBeNull();
  });

  it("nulls out optional fields it cannot trust", () => {
    expect(
      parseCliSessionPayload({ ...payload, expiresAt: "soon", username: 7 }, state),
    ).toMatchObject({ expiresAt: null, username: null });
  });

  it("rejects non-object bodies", () => {
    expect(parseCliSessionPayload(null, state)).toBeNull();
    expect(parseCliSessionPayload("string", state)).toBeNull();
    expect(parseCliSessionPayload([payload], state)).toBeNull();
  });
});
