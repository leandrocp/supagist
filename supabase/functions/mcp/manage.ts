import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { renderInput } from "./input.ts";
import { redactSecrets, type RedactionSummary } from "./redact.ts";

const APP_ORIGIN = "https://supagist.app";
const BUCKET = "snippet-images";

// A snippet link (https://supagist.app/<slug>-<short id>), its path, or the
// six-character short id itself. Same link shape as publish.ts.
const snippetRef = z
  .string()
  .trim()
  .min(6)
  .max(300)
  .describe("The snippet's link, for example https://supagist.app/deploy-config-a1b2c3.");

export function shortIdFromRef(ref: string): string | null {
  let path = ref.trim();
  try {
    path = new URL(path).pathname;
  } catch {
    // Not a URL: a bare path or short id.
  }
  const last = path.replace(/\/+$/, "").split("/").pop() ?? "";
  const short = last.slice(last.lastIndexOf("-") + 1);
  return /^[a-z0-9]{6}$/.test(short) ? short : null;
}

// Same code limits as a publish (30 source lines, 8,000 code points).
const { code } = renderInput.shape;

export const updateInput = z
  .strictObject({
    snippet: snippetRef,
    code: code.optional(),
    title: z
      .string()
      .trim()
      .max(120)
      .optional()
      .describe("New page title. An empty string clears it, so the page shows the filename."),
    language: z.string().min(1).max(64).optional().describe("Exact language ID."),
    theme: z.string().min(1).max(64).optional().describe("Syntax theme name."),
    visibility: z
      .enum(["public", "unlisted"])
      .optional()
      .describe("public snippets can appear in listings; unlisted ones only open by link."),
  })
  .refine(
    (input) => Object.keys(input).some((key) => key !== "snippet"),
    "Change at least one of code, title, language, theme or visibility",
  );

export const deleteInput = z.strictObject({ snippet: snippetRef });

export type UpdateResult = {
  url: string;
  visibility: "public" | "unlisted";
  redactions: RedactionSummary;
};

type Snippet = { id: string; slug: string; short_id: string; visibility: "public" | "unlisted" };

// Table reads see public rows plus the caller's own, so filtering by author
// returns only a snippet the caller owns; RLS enforces the same on writes.
async function ownSnippet(ref: string, userId: string, supabase: SupabaseClient) {
  const short = shortIdFromRef(ref);
  if (!short) throw new Error("Pass the snippet's supagist.app link.");
  const { data, error } = await supabase
    .from("snippets")
    .select("id, slug, short_id, visibility")
    .eq("short_id", short)
    .eq("author_id", userId)
    .maybeSingle<Snippet>();
  if (error) throw new Error("Could not load the snippet.");
  if (!data) throw new Error("No snippet of yours has that link.");
  return data;
}

export async function updateSnippet(
  rawInput: z.input<typeof updateInput>,
  userId: string,
  supabase: SupabaseClient,
): Promise<UpdateResult> {
  const input = updateInput.parse(rawInput);
  const { supportedLanguages, supportedThemes } = await import("./render.ts");
  if (input.language !== undefined && !supportedLanguages.includes(input.language))
    throw new Error(`Unknown language "${input.language}".`);
  if (input.theme !== undefined && !supportedThemes.includes(input.theme))
    throw new Error(`Unknown theme "${input.theme}".`);

  // Redact before anything is stored, exactly like a publish.
  const redactedCode = input.code === undefined ? undefined : redactSecrets(input.code);
  const redactedTitle = input.title ? redactSecrets(input.title) : undefined;
  const kinds = { ...redactedCode?.summary.kinds };
  for (const [kind, count] of Object.entries(redactedTitle?.summary.kinds ?? {}))
    kinds[kind] = (kinds[kind] ?? 0) + count;

  const snippet = await ownSnippet(input.snippet, userId, supabase);
  const changes = {
    ...(redactedCode ? { code: redactedCode.code } : {}),
    ...(input.title !== undefined ? { title: redactedTitle?.code ?? null } : {}),
    ...(input.language !== undefined ? { language: input.language } : {}),
    ...(input.theme !== undefined ? { theme: input.theme } : {}),
    ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
  };
  const { data, error } = await supabase
    .from("snippets")
    .update(changes)
    .eq("id", snippet.id)
    .select("visibility")
    .maybeSingle<{ visibility: Snippet["visibility"] }>();
  if (error?.message.includes("edit_hour_rate_limit"))
    throw new Error("Edit limit reached. Try again later.");
  if (error || !data) throw new Error("Could not update the snippet.");

  return {
    url: `${APP_ORIGIN}/${snippet.slug}-${snippet.short_id}`,
    visibility: data.visibility,
    redactions: {
      redacted: (redactedCode?.summary.redacted ?? 0) + (redactedTitle?.summary.redacted ?? 0),
      kinds,
    },
  };
}

export async function deleteSnippet(
  rawInput: z.input<typeof deleteInput>,
  userId: string,
  supabase: SupabaseClient,
): Promise<{ deleted: string }> {
  const input = deleteInput.parse(rawInput);
  const snippet = await ownSnippet(input.snippet, userId, supabase);
  // Reactions, comments and visits cascade; the delete trigger queues every
  // stored file for cleanup in the same transaction.
  const { data, error } = await supabase
    .from("snippets")
    .delete()
    .eq("id", snippet.id)
    .select("canonical_image_path, og_image_path, svg_path, raw_path")
    .maybeSingle<Record<string, string | null>>();
  if (error || !data) throw new Error("Could not delete the snippet.");
  // Remove the caller's files now: the recorded paths plus everything in the
  // snippet's folder (files an edit replaced). Queued cleanup retries misses.
  const folder = `${userId}/snippets/${snippet.id}`;
  const bucket = supabase.storage.from(BUCKET);
  const { data: files } = await bucket.list(folder);
  const paths = new Set([
    ...Object.values(data).filter((path): path is string => typeof path === "string"),
    ...(files ?? []).map((file: { name: string }) => `${folder}/${file.name}`),
  ]);
  if (paths.size > 0) await bucket.remove([...paths]);
  return { deleted: `${APP_ORIGIN}/${snippet.slug}-${snippet.short_id}` };
}
