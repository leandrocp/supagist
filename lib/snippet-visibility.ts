/**
 * Who can see a snippet, like a GitHub gist: the same two choices on the web,
 * in the CLI and over MCP. Only the author lists a private snippet; anyone the
 * author shares its link with can open it, and search engines never index it.
 */
export type SnippetVisibility = "public" | "private";

export const SNIPPET_VISIBILITIES = [
  { id: "public", label: "Public", hint: "Anyone can see it." },
  { id: "private", label: "Private", hint: "Only you, and people you share the link with." },
] as const satisfies readonly { id: SnippetVisibility; label: string; hint: string }[];
