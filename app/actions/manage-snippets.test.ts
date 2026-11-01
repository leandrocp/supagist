import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mockCreateClient }));

import { deleteAccount, deleteSnippet, updateSnippet } from "./manage-snippets";

const USER = { id: "user-1", is_anonymous: false };
const ID = "00000000-0000-4000-8000-000000000001";

// Records every query-builder call; awaiting the chain resolves to `result`.
function makeSupabase({
  user = USER as object | null,
  result = { data: [{ id: ID }], error: null } as { data: unknown; error: unknown },
  rpcError = null as object | null,
  files = [] as { name: string }[],
  snippet = { filename: "a.ts" } as object | null,
} = {}) {
  const calls: [string, ...unknown[]][] = [];
  // A real promise of the result that also exposes the builder methods.
  const chain = Object.assign(Promise.resolve(result), {}) as Promise<unknown> &
    Record<string, unknown>;
  for (const method of ["update", "delete", "select", "eq"])
    chain[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return chain;
    };
  chain.maybeSingle = () => Promise.resolve({ data: snippet, error: null });
  const remove = vi.fn().mockResolvedValue({ data: [], error: null });
  const list = vi.fn().mockResolvedValue({ data: files, error: null });
  const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
  return {
    calls,
    remove,
    list,
    upload,
    client: {
      from: (table: string) => {
        calls.push(["from", table]);
        return chain;
      },
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user } }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ error: rpcError }),
      storage: { from: () => ({ remove, list, upload }) },
    },
  };
}

const edit = {
  code: "const a = 1;  \r\nconst b = 2;\r\n\r\n",
  title: "  Hello  ",
  language: "typescript",
  theme: "github_dark",
  visibility: "unlisted" as const,
};

describe("updateSnippet", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [{ code: "" }, /1–8,000 characters/],
    [{ code: "x".repeat(8001) }, /1–8,000 characters \(got 8,001\)/],
    [{ title: "t".repeat(121) }, /at most 120/],
    [{ theme: "not-a-theme" }, /Unknown theme/],
    [{ language: "klingon" }, /Unknown language/],
    [{ visibility: "private" }, /Unknown visibility/],
  ])("rejects %o before touching the database", async (change, message) => {
    const result = await updateSnippet(ID, { ...edit, ...change } as never);
    expect(result.error).toMatch(message);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("accepts brand themes and normalizes code and title", async () => {
    const supabase = makeSupabase();
    mockCreateClient.mockResolvedValue(supabase.client);
    expect(await updateSnippet(ID, { ...edit, theme: "supabase-dark" })).toEqual({ ok: true });
    expect(supabase.calls).toContainEqual([
      "update",
      {
        code: "const a = 1;\nconst b = 2;",
        title: "Hello",
        language: "typescript",
        theme: "supabase-dark",
        visibility: "unlisted",
      },
    ]);
    expect(supabase.calls).toContainEqual(["eq", "author_id", "user-1"]);
  });

  it("clears an empty title", async () => {
    const supabase = makeSupabase();
    mockCreateClient.mockResolvedValue(supabase.client);
    await updateSnippet(ID, { ...edit, title: "   " });
    const update = supabase.calls.find(([method]) => method === "update")!;
    expect((update[1] as { title: unknown }).title).toBeNull();
  });

  it("requires a persistent account", async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabase({ user: { id: "guest", is_anonymous: true } }).client,
    );
    expect((await updateSnippet(ID, edit)).error).toMatch(/Sign in/);
  });

  it("says when nothing was updated, which is what RLS does for someone else's snippet", async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ result: { data: [], error: null } }).client);
    expect((await updateSnippet(ID, edit)).error).toMatch(/isn't yours/);
  });

  it("stores the editor's re-render under new names and points the snippet at them", async () => {
    const supabase = makeSupabase();
    mockCreateClient.mockResolvedValue(supabase.client);
    const images = new FormData();
    for (const name of ["canonical_image", "og_image", "svg", "card_image"])
      images.set(name, new Blob([name]));

    expect(await updateSnippet(ID, edit, images)).toEqual({ ok: true });

    const folder = `user-1/snippets/${ID}`;
    const uploaded = supabase.upload.mock.calls.map(([path]) => path as string);
    const update = supabase.calls.find(([method]) => method === "update")![1] as Record<
      string,
      string
    >;
    // New, never-reused names, so a CDN-cached old image is never served for them.
    for (const key of ["canonical_image_path", "og_image_path", "svg_path", "raw_path"]) {
      expect(update[key]).toMatch(new RegExp(`^${folder}/[a-z]+-[0-9a-f]{8}\\.(png|svg|ts)$`));
      expect(uploaded).toContain(update[key]);
    }
    expect(update.raw_path.endsWith(".ts")).toBe(true);
    // The share card sits beside the new canonical PNG under the same
    // version, uploaded before the row points at it; nothing is replaced.
    expect(uploaded).toContain(update.canonical_image_path.replace("/canonical-", "/card-"));
    expect(uploaded).not.toContain(`${folder}/card.png`);
    expect(supabase.remove).not.toHaveBeenCalled();
  });

  it("removes the uploaded re-render when the edit is refused", async () => {
    const supabase = makeSupabase({ result: { data: [], error: null } });
    mockCreateClient.mockResolvedValue(supabase.client);
    const images = new FormData();
    for (const name of ["canonical_image", "og_image", "svg", "card_image"])
      images.set(name, new Blob([name]));

    expect((await updateSnippet(ID, edit, images)).error).toMatch(/isn't yours/);
    const uploaded = supabase.upload.mock.calls.map(([path]) => path);
    expect(uploaded).toHaveLength(5);
    expect(supabase.remove).toHaveBeenCalledWith(expect.arrayContaining(uploaded));
  });

  it("does not upload anything for someone else's snippet", async () => {
    const supabase = makeSupabase({ snippet: null });
    mockCreateClient.mockResolvedValue(supabase.client);
    const images = new FormData();
    images.set("canonical_image", new Blob(["x"]));
    expect((await updateSnippet(ID, edit, images)).error).toMatch(/isn't yours/);
    expect(supabase.upload).not.toHaveBeenCalled();
  });

  it("maps the edit rate limit", async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabase({ result: { data: null, error: { message: "edit_hour_rate_limit" } } }).client,
    );
    expect((await updateSnippet(ID, edit)).error).toMatch(/Too many edits/);
  });
});

describe("deleteSnippet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the owner's row and removes its recorded and unrecorded files", async () => {
    const supabase = makeSupabase({
      // card.png has no column; canonical.svg is both recorded and listed.
      files: [{ name: "card.png" }, { name: "canonical.svg" }],
      result: {
        data: [
          {
            canonical_image_path: "user-1/snippets/s/canonical.png",
            og_image_path: null,
            svg_path: "user-1/snippets/s/canonical.svg",
            raw_path: null,
          },
        ],
        error: null,
      },
    });
    mockCreateClient.mockResolvedValue(supabase.client);
    expect(await deleteSnippet(ID)).toEqual({ ok: true });
    expect(supabase.calls).toContainEqual(["eq", "author_id", "user-1"]);
    expect(supabase.list).toHaveBeenCalledWith(`user-1/snippets/${ID}`);
    expect(supabase.remove).toHaveBeenCalledWith([
      "user-1/snippets/s/canonical.png",
      "user-1/snippets/s/canonical.svg",
      `user-1/snippets/${ID}/card.png`,
      `user-1/snippets/${ID}/canonical.svg`,
    ]);
  });

  it("removes nothing when no row was deleted", async () => {
    const supabase = makeSupabase({ result: { data: [], error: null } });
    mockCreateClient.mockResolvedValue(supabase.client);
    expect((await deleteSnippet(ID)).error).toMatch(/isn't yours/);
    expect(supabase.remove).not.toHaveBeenCalled();
  });
});

describe("deleteAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes through the RPC, removes the user's own files and signs out", async () => {
    const supabase = makeSupabase({
      result: {
        data: [
          {
            id: "a",
            canonical_image_path: "user-1/snippets/a/canonical.png",
            og_image_path: "snippets/legacy/og.png",
            svg_path: null,
            raw_path: "user-1/snippets/a/raw.ts",
          },
        ],
        error: null,
      },
    });
    mockCreateClient.mockResolvedValue(supabase.client);
    expect(await deleteAccount()).toEqual({ ok: true });
    expect(supabase.client.rpc).toHaveBeenCalledWith("delete_own_account");
    // Legacy paths outside the user's prefix are left to the queued cleanup.
    expect(supabase.remove).toHaveBeenCalledWith([
      "user-1/snippets/a/canonical.png",
      "user-1/snippets/a/raw.ts",
    ]);
    expect(supabase.client.auth.signOut).toHaveBeenCalled();
  });

  it("keeps the session and files when the RPC fails", async () => {
    const supabase = makeSupabase({ rpcError: { message: "boom" } });
    mockCreateClient.mockResolvedValue(supabase.client);
    expect((await deleteAccount()).error).toMatch(/Could not delete your account/);
    expect(supabase.remove).not.toHaveBeenCalled();
    expect(supabase.client.auth.signOut).not.toHaveBeenCalled();
  });
});
