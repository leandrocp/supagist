import { describe, it, expect } from "vitest";
import { mapPublishInsertError, PUBLISH_MAX_CODE_CHARS } from "./snippet-publish";

describe("mapPublishInsertError", () => {
  it("classifies the hourly trigger rejection as rate limiting", () => {
    expect(mapPublishInsertError('new row violates "publish_hour_rate_limit"')).toEqual({
      error: "Too many snippets in the last hour. Try again later.",
      reason: "rate_limited",
    });
  });

  it("classifies the daily trigger rejection as rate limiting", () => {
    expect(mapPublishInsertError("publish_day_rate_limit exceeded")).toEqual({
      error: "Daily snippet limit reached. Come back tomorrow.",
      reason: "rate_limited",
    });
  });

  it("classifies the anonymous-publish rejection as unauthenticated", () => {
    expect(mapPublishInsertError("persistent_account_required")).toMatchObject({
      reason: "unauthenticated",
    });
  });

  it("falls back to a generic insert failure", () => {
    expect(mapPublishInsertError("duplicate key value violates unique constraint")).toEqual({
      error: "Failed to publish the snippet. Please try again.",
      reason: "insert_failed",
    });
  });

  it("never leaks the raw database message to the user", () => {
    const result = mapPublishInsertError("relation snippets_pkey column author_id detail=secret");
    expect(result.error).not.toContain("secret");
  });
});

describe("PUBLISH_MAX_CODE_CHARS", () => {
  it("matches the snippets_code_length_check constraint", () => {
    expect(PUBLISH_MAX_CODE_CHARS).toBe(8000);
  });
});
