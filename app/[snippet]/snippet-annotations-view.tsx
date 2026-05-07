"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Copy, MessageSquarePlus, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  languageDisplayName,
  codePointLength,
  groupLineReactions,
  lineReactionsToExportChips,
  type ReactionGroup,
} from "@/lib/snippet-utils";
import { nameToColor, nameToInitials } from "@/lib/presence-utils";
import { UserAvatar } from "@/components/user-avatar";
import { formatCommentTimestamp, formatReactorList, formatTypingNames } from "@/lib/format-utils";
import { buildLoginUrl } from "@/lib/auth-redirect";
import { SnippetPresenceInline } from "./snippet-presence";
import { ShareButton } from "./share-button";
import { SnippetExportModal } from "./snippet-export-modal";
import type { RealtimeChannel } from "@supabase/supabase-js";

const DEV_MODE = process.env.NODE_ENV !== "production";

const REACTION_OPTIONS = [
  // positive / praise
  "🔥",
  "✨",
  "💡",
  "🎉",
  "🚀",
  "💯",
  "❤️",
  "💚",
  "🖤",
  "⭐",
  "👍",
  "🙌",
  "🎯",
  "💪",
  "🏆",
  "👏",
  "✅",
  "🌟",
  // neutral / curious
  "👀",
  "🤔",
  "😮",
  "🧐",
  "💭",
  "📌",
  "🔍",
  "💬",
  // funny
  "😂",
  "🤣",
  "😅",
  "😆",
  "💀",
  "🤡",
  "🫠",
  "😵",
  // negative / bad code
  "👎",
  "🤦",
  "😱",
  "🤮",
  "💩",
  "🗑️",
  "❌",
  "🚨",
  // danger / explosion
  "😤",
  "🤯",
  "😡",
  "⚠️",
  "💥",
  "💣",
  "🌋",
  "🔴",
  // arrows / flow
  "⬆️",
  "⬇️",
  "⬅️",
  "➡️",
  "↩️",
  "↪️",
  "🔁",
  "🔃",
  // code / tooling
  "🐛",
  "🔧",
  "⚡",
  "📦",
  "🔨",
  "🛠️",
  "🧪",
  "🔒",
  "📝",
  "📊",
  "💾",
  "🧹",
  "🔑",
  "🩹",
  "🎭",
  "🔄",
  // numbers
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "4️⃣",
  "5️⃣",
  "6️⃣",
  "7️⃣",
  "8️⃣",
  "9️⃣",
] as const;

const DARK = {
  bg: "#0d0d0d",
  gutter: "#111111",
  border: "rgba(255,255,255,0.07)",
  lineNum: "rgba(255,255,255,0.22)",
  icon: "rgba(255,255,255,0.28)",
  header: "#111111",
  headerText: "rgba(255,255,255,0.35)",
  buttonText: "rgba(255,255,255,0.75)",
  buttonBorder: "rgba(255,255,255,0.18)",
  selectedLine: "rgba(255,255,255,0.04)",
  pickerBg: "#1a1a1a",
};

const LIGHT = {
  bg: "#ffffff",
  gutter: "#f7f7f7",
  border: "rgba(0,0,0,0.08)",
  lineNum: "rgba(0,0,0,0.3)",
  icon: "rgba(0,0,0,0.25)",
  header: "#f7f7f7",
  headerText: "rgba(0,0,0,0.4)",
  buttonText: "rgba(0,0,0,0.7)",
  buttonBorder: "rgba(0,0,0,0.2)",
  selectedLine: "rgba(0,0,0,0.04)",
  pickerBg: "#ffffff",
};

type LineReaction = {
  id: string;
  emoji: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
};
type LineComment = {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
};

// Broadcast event payloads
type ReactionEvent = {
  op: "upsert" | "delete";
  id: string;
  lineNumber: number;
  emoji: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
};
type CommentEvent = {
  op: "upsert" | "delete";
  id: string;
  lineNumber: number;
  body: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  createdAt: string;
};

type Author = { id: string; username: string; avatar_url: string } | null;

type Props = {
  snippetId: string;
  filename: string;
  code: string;
  language: string;
  snippetUrl: string;
  snippetTheme: string;
  snippetReactions: Record<number, import("@/lib/snippet-utils").ExportReactionChip[]>;
  preRenderedLines: string[];
  themeIsDark: boolean;
  themeBg: string | null;
  themeFg: string | null;
  currentUserId: string | null;
  author: Author;
};

export function SnippetAnnotationsView({
  snippetId,
  filename,
  code,
  language,
  snippetUrl,
  snippetTheme,
  snippetReactions,
  preRenderedLines,
  themeIsDark,
  themeBg,
  themeFg,
  currentUserId,
  author,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const loginUrl = buildLoginUrl(pathname);
  const base = themeIsDark ? DARK : LIGHT;
  // Same color-mix trick as InlineCodeBlock: derive every secondary text
  // colour from the syntax theme's actual fg so the chrome reads cleanly on
  // every theme, including ones whose fg isn't pure black or pure white.
  const fgMix = (alpha: number) =>
    themeFg ? `color-mix(in srgb, ${themeFg} ${Math.round(alpha * 100)}%, transparent)` : null;
  const c = {
    ...base,
    bg: themeBg ?? base.bg,
    gutter: themeBg ?? base.gutter,
    header: themeBg ?? base.header,
    headerText: fgMix(0.6) ?? base.headerText,
    lineNum: fgMix(0.45) ?? base.lineNum,
    icon: fgMix(0.45) ?? base.icon,
    buttonText: fgMix(0.85) ?? base.buttonText,
    buttonBorder: fgMix(0.3) ?? base.buttonBorder,
    border: fgMix(0.12) ?? base.border,
    selectedLine: fgMix(0.06) ?? base.selectedLine,
  };

  const [lineReactions, setLineReactions] = useState<Record<number, LineReaction[]>>({});
  const [lineComments, setLineComments] = useState<Record<number, LineComment[]>>({});
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [selectedCommentLine, setSelectedCommentLine] = useState<number | null>(null);
  const [selectedReactionLine, setSelectedReactionLine] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [authPrompt, setAuthPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  // Transient list of "ping" animations played when remote viewers react.
  // Each entry is removed after its CSS animation finishes (~750ms).
  const [reactionPulses, setReactionPulses] = useState<
    Array<{ key: string; line: number; emoji: string }>
  >([]);
  // typingByUser tracks { userId → { username, line, lastSeenAt } } for everyone
  // currently composing. Stale entries are pruned every 4s, so a viewer who
  // disconnects mid-type stops appearing for others without us needing a
  // dedicated "stopped typing" event.
  const [typingByUser, setTypingByUser] = useState<
    Record<string, { username: string; line: number; lastSeenAt: number }>
  >({});

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const lines = useMemo(() => code.split("\n"), [code]);

  // Focus the textarea whenever the comment panel opens or switches lines.
  // autoFocus alone only fires on first mount, so opening the panel a second
  // time (or clicking comment on a different line while the panel is already
  // mounted) wouldn't put focus back into the input.
  useEffect(() => {
    if (selectedCommentLine !== null) {
      commentInputRef.current?.focus();
    }
  }, [selectedCommentLine]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [rxnRes, cmtRes] = await Promise.all([
        supabase
          .from("snippet_line_reactions")
          .select("id, line_number, emoji, author_id, author:author_id(username, avatar_url)")
          .eq("snippet_id", snippetId),
        supabase
          .from("snippet_comments")
          .select(
            "id, line_number, body, author_id, created_at, author:author_id(username, avatar_url)",
          )
          .eq("snippet_id", snippetId)
          .order("created_at", { ascending: true }),
      ]);

      const reactions: Record<number, LineReaction[]> = {};
      for (const r of rxnRes.data ?? []) {
        if (!reactions[r.line_number]) reactions[r.line_number] = [];
        const author = Array.isArray(r.author)
          ? (r.author[0] as { username: string; avatar_url: string } | undefined)
          : (r.author as { username: string; avatar_url: string } | null);
        reactions[r.line_number].push({
          id: r.id,
          emoji: r.emoji,
          authorId: r.author_id,
          authorUsername: author?.username ?? "unknown",
          authorAvatarUrl: author?.avatar_url || null,
        });
      }
      setLineReactions(reactions);

      const comments: Record<number, LineComment[]> = {};
      for (const row of cmtRes.data ?? []) {
        if (!comments[row.line_number]) comments[row.line_number] = [];
        const author = Array.isArray(row.author)
          ? (row.author[0] as { username: string; avatar_url: string } | undefined)
          : (row.author as { username: string; avatar_url: string } | null);
        comments[row.line_number].push({
          id: row.id,
          authorId: row.author_id,
          authorUsername: author?.username ?? "unknown",
          authorAvatarUrl: author?.avatar_url || null,
          body: row.body,
          createdAt: row.created_at,
        });
      }
      setLineComments(comments);
    }
    void load();
  }, [supabase, snippetId]);

  // ── Load current user's profile (for broadcasting their comments) ──────────
  useEffect(() => {
    if (!currentUserId) return;
    void supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", currentUserId)
      .single()
      .then(({ data }) => {
        if (data?.username) setCurrentUsername(data.username);
        if (data?.avatar_url) setCurrentUserAvatar(data.avatar_url);
      });
  }, [supabase, currentUserId]);

  // ── Broadcast channel ──────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel(`snippet:${snippetId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "reaction" }, ({ payload }: { payload: ReactionEvent }) => {
        if (payload.op === "upsert") {
          setLineReactions((prev) => {
            const rest = (prev[payload.lineNumber] ?? []).filter(
              (r) => r.authorId !== payload.authorId,
            );
            return {
              ...prev,
              [payload.lineNumber]: [
                ...rest,
                {
                  id: payload.id,
                  emoji: payload.emoji,
                  authorId: payload.authorId,
                  authorUsername: payload.authorUsername,
                  authorAvatarUrl: payload.authorAvatarUrl,
                },
              ],
            };
          });
          // Fire a brief animation when the reaction came from someone else.
          // Self-broadcasts also reach this handler (config.broadcast.self =
          // true), so we filter on author to avoid pulsing your own clicks.
          if (payload.emoji && payload.authorId !== currentUserId) {
            const pulseKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            setReactionPulses((prev) => [
              ...prev,
              { key: pulseKey, line: payload.lineNumber, emoji: payload.emoji },
            ]);
            setTimeout(() => {
              setReactionPulses((prev) => prev.filter((p) => p.key !== pulseKey));
            }, 800);
          }
        } else {
          setLineReactions((prev) => {
            const next: Record<number, LineReaction[]> = {};
            for (const [ln, rxns] of Object.entries(prev)) {
              next[Number(ln)] = rxns.filter((r) => r.id !== payload.id);
            }
            return next;
          });
        }
      })
      .on("broadcast", { event: "comment" }, ({ payload }: { payload: CommentEvent }) => {
        if (payload.op === "upsert") {
          setLineComments((prev) => {
            // Dedupe by id so the broadcast that echoes back to the sender
            // doesn't double-render the comment they just posted.
            const rest = (prev[payload.lineNumber] ?? []).filter((c) => c.id !== payload.id);
            return {
              ...prev,
              [payload.lineNumber]: [
                ...rest,
                {
                  id: payload.id,
                  authorId: payload.authorId,
                  authorUsername: payload.authorUsername,
                  authorAvatarUrl: payload.authorAvatarUrl,
                  body: payload.body,
                  createdAt: payload.createdAt,
                },
              ],
            };
          });
        } else {
          setLineComments((prev) => {
            const next: Record<number, LineComment[]> = {};
            for (const [ln, cmts] of Object.entries(prev)) {
              next[Number(ln)] = cmts.filter((c) => c.id !== payload.id);
            }
            return next;
          });
        }
      })
      .on(
        "broadcast",
        { event: "typing" },
        ({
          payload,
        }: {
          payload: { userId: string; username: string; line: number | null; ts: number };
        }) => {
          // Filter our own broadcasts (config.broadcast.self echoes back to us)
          if (payload.userId === currentUserId) return;
          setTypingByUser((prev) => {
            const next = { ...prev };
            if (payload.line === null) {
              delete next[payload.userId];
            } else {
              next[payload.userId] = {
                username: payload.username,
                line: payload.line,
                lastSeenAt: payload.ts,
              };
            }
            return next;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, snippetId, currentUserId]);

  // ── Typing indicator: broadcast over the existing snippet channel ─────────
  // Presence-based detection was finicky around subscribe timing — switching
  // to plain broadcast events on the same channel we already use for
  // reactions/comments. Each composer fires "typing" with their current line
  // (or null when the form closes); other clients track who's typing where
  // and prune entries that haven't been refreshed in TIMEOUT_MS.
  const TYPING_TIMEOUT_MS = 5000;

  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - TYPING_TIMEOUT_MS;
      setTypingByUser((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [uid, entry] of Object.entries(prev)) {
          if (entry.lastSeenAt > cutoff) next[uid] = entry;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // Publish our typingLine whenever the form opens/closes/switches lines, and
  // keep refreshing it on a heartbeat while the form is open so a late-arriving
  // viewer also picks up that we're typing.
  useEffect(() => {
    if (!currentUserId) return;
    const username = currentUsername || "Guest";

    const broadcastTyping = (line: number | null) => {
      const ch = channelRef.current;
      if (!ch) return;
      // httpSend is the explicit REST broadcast — channel.send() with
      // {type:"broadcast"} silently falls back to REST when the channel
      // isn't yet SUBSCRIBED (which is common here because the typing
      // useEffect fires immediately on mount, before the subscribe
      // handshake completes), and that fallback is being deprecated.
      void ch.httpSend("typing", { userId: currentUserId, username, line, ts: Date.now() });
    };

    // Fire immediately on open/close/switch.
    broadcastTyping(selectedCommentLine);

    // Heartbeat while the form is open so the receiver's TTL doesn't kick in.
    if (selectedCommentLine === null) return;
    const id = setInterval(() => broadcastTyping(selectedCommentLine), 2500);
    return () => clearInterval(id);
  }, [selectedCommentLine, currentUserId, currentUsername]);

  const typingByLine = useMemo(() => {
    const result: Record<number, string[]> = {};
    for (const entry of Object.values(typingByUser)) {
      if (!result[entry.line]) result[entry.line] = [];
      result[entry.line].push(entry.username);
    }
    return result;
  }, [typingByUser]);

  // ── Derived display ────────────────────────────────────────────────────────
  const displayReactions = useMemo(() => {
    const result: Record<number, string> = {};
    for (const [ln, rxns] of Object.entries(lineReactions)) {
      if (!rxns.length) continue;
      const mine = rxns.find((r) => r.authorId === currentUserId);
      result[Number(ln)] = mine ? mine.emoji : rxns[rxns.length - 1].emoji;
    }
    return result;
  }, [lineReactions, currentUserId]);

  const displayReactionGroups = useMemo(() => {
    const result: Record<number, ReturnType<typeof groupLineReactions>> = {};
    for (const [ln, rxns] of Object.entries(lineReactions)) {
      if (!rxns.length) continue;
      result[Number(ln)] = groupLineReactions(rxns, currentUserId);
    }
    return result;
  }, [lineReactions, currentUserId]);

  // Live chip shape for the export modal — derived from the same reactive
  // state the page renders, so reactions added in this session appear in
  // the export immediately without a page refresh. Falls back to the
  // SSR-rendered `snippetReactions` only while the initial fetch hasn't
  // populated `lineReactions` yet (so the export isn't briefly empty on
  // open during cold load).
  const exportReactions = useMemo(() => {
    if (Object.keys(lineReactions).length === 0) return snippetReactions;
    return lineReactionsToExportChips(lineReactions);
  }, [lineReactions, snippetReactions]);

  // Combined HTML per line: Lumis-rendered tokens + chip pills appended as
  // plain HTML. Embedding the chips inside the same dangerouslySetInnerHTML
  // string guarantees they share a single inline flow with the code text —
  // earlier attempts using a sibling React element kept dropping the chip
  // onto a fresh line below the code, even when there was plenty of
  // horizontal room for them on the same row. With this approach the chip
  // is just another inline sibling inside the same element and the browser
  // can never push it onto a separate line unless the wrapped text has
  // genuinely run out of space. Click handling is delegated via the cell's
  // onClick handler — each chip carries data-emoji + data-line so the
  // dispatcher can route the click back to handlePickReaction without
  // attaching React handlers to every chip individually.
  const lineHtml = useMemo(() => {
    return preRenderedLines.map((html, idx) => {
      const ln = idx + 1;
      const groups = displayReactionGroups[ln];
      if (!groups || groups.length === 0) return html;
      const chipMarkup = groups.map((g) => renderChipHtml(g, c, ln)).join("");
      return (html || " ") + chipMarkup;
    });
  }, [preRenderedLines, displayReactionGroups, c]);

  const displayComments = useMemo(() => {
    const result: Record<number, { author: string; body: string }> = {};
    for (const [ln, cmts] of Object.entries(lineComments)) {
      if (!cmts.length) continue;
      const first = cmts[0];
      const extra = cmts.length - 1;
      result[Number(ln)] = {
        author: first.authorUsername,
        body: extra > 0 ? `${first.body} (+${extra} more)` : first.body,
      };
    }
    return result;
  }, [lineComments]);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  const requireAuth = (): boolean => {
    if (DEV_MODE || currentUserId) return true;
    setAuthPrompt(true);
    setTimeout(() => setAuthPrompt(false), 3000);
    return false;
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const handlePickReaction = async (line: number, emoji: string) => {
    if (!requireAuth()) return;
    setSelectedReactionLine(null);

    if (!currentUserId) {
      // dev mode only
      setLineReactions((prev) => {
        if (!emoji) {
          const next = { ...prev };
          delete next[line];
          return next;
        }
        const rest = (prev[line] ?? []).filter((r) => r.authorId !== "dev-user");
        return {
          ...prev,
          [line]: [
            ...rest,
            {
              id: "dev",
              emoji,
              authorId: "dev-user",
              authorUsername: "you",
              authorAvatarUrl: null,
            },
          ],
        };
      });
      return;
    }

    if (!emoji) {
      // Use .select() so an RLS-blocked delete surfaces as zero rows (and
      // we can avoid sending a stale broadcast). Without it, RLS denials
      // are silent — the bug we just fixed in the policies.
      const { data: deleted, error } = await supabase
        .from("snippet_line_reactions")
        .delete()
        .eq("snippet_id", snippetId)
        .eq("author_id", currentUserId)
        .eq("line_number", line)
        .select("id");
      if (error || !deleted?.length) return;

      const existing = lineReactions[line]?.find((r) => r.authorId === currentUserId);
      if (existing && channelRef.current) {
        await channelRef.current.httpSend("reaction", {
          op: "delete",
          id: existing.id,
          lineNumber: line,
          emoji: "",
          authorId: currentUserId,
          authorUsername: currentUsername ?? "unknown",
          authorAvatarUrl: currentUserAvatar,
        } satisfies ReactionEvent);
      }
      return;
    }

    const { data } = await supabase
      .from("snippet_line_reactions")
      .upsert(
        { snippet_id: snippetId, author_id: currentUserId, line_number: line, emoji },
        { onConflict: "snippet_id,author_id,line_number" },
      )
      .select("id")
      .single();

    if (data?.id && channelRef.current) {
      await channelRef.current.httpSend("reaction", {
        op: "upsert",
        id: data.id,
        lineNumber: line,
        emoji,
        authorId: currentUserId,
        authorUsername: currentUsername ?? "unknown",
        authorAvatarUrl: currentUserAvatar,
      } satisfies ReactionEvent);
    }
  };

  const handleSaveComment = async () => {
    if (!selectedCommentLine || !requireAuth()) return;
    const body = commentDraft.trim();
    if (!body) return;
    const line = selectedCommentLine;

    // Keep the panel open so the thread can update in place — only clear the
    // textarea so the user can see their comment land and post another.
    setCommentDraft("");
    commentInputRef.current?.focus();

    if (!currentUserId) {
      // dev mode only — give each comment a unique id so multiple posts work
      setLineComments((prev) => {
        const existing = prev[line] ?? [];
        return {
          ...prev,
          [line]: [
            ...existing,
            {
              id: `dev-${Date.now()}`,
              authorId: "dev-user",
              authorUsername: "you",
              authorAvatarUrl: null,
              body,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
      return;
    }

    const { data } = await supabase
      .from("snippet_comments")
      .insert({ snippet_id: snippetId, author_id: currentUserId, line_number: line, body })
      .select("id, created_at")
      .single();

    if (data?.id && channelRef.current) {
      await channelRef.current.httpSend("comment", {
        op: "upsert",
        id: data.id,
        lineNumber: line,
        body,
        authorId: currentUserId,
        authorUsername: currentUsername ?? "unknown",
        authorAvatarUrl: currentUserAvatar,
        createdAt: data.created_at ?? new Date().toISOString(),
      } satisfies CommentEvent);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden font-mono text-sm"
      style={{ backgroundColor: c.bg }}
    >
      {/* Window chrome — three-column grid so the centred title doesn't
          shift when the right-side button changes width (Copy ↔ Copied). */}
      <div
        className="grid items-center border-b px-4 py-2.5"
        style={{
          backgroundColor: c.header,
          borderColor: c.border,
          gridTemplateColumns: "1fr auto 1fr",
        }}
      >
        <div className="flex items-center gap-[7px]">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div
          className="truncate px-3 text-center text-xs font-medium"
          style={{ color: c.headerText }}
          title={filename}
        >
          {filename}
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy code"
            aria-label="Copy code"
            className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: c.buttonText }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <SnippetExportModal
            code={code}
            filename={filename}
            theme={snippetTheme}
            authorUsername={author?.username ?? null}
            authorAvatarUrl={author?.avatar_url ?? null}
            reactions={exportReactions}
            style={{ color: c.buttonText }}
          />
          <ShareButton url={snippetUrl} style={{ color: c.buttonText }} />
        </div>
      </div>

      {/* Editor body — per-row grid so gutter and code heights align naturally for wrapped lines.
          Caps at viewport height minus surrounding chrome so short snippets shrink to fit. */}
      {/* Pin the default text colour to the theme fg so unscoped chunks
          (whitespace between tags, plain text) read against the theme bg
          instead of falling back to the page foreground. */}
      <div
        className="min-h-0 flex-1 overflow-auto"
        style={{ backgroundColor: c.bg, color: themeFg ?? undefined }}
      >
        <div>
          {/* Top padding row — gutter bg on the left matches the gutter column below */}
          <div className="grid" style={{ gridTemplateColumns: "56px 1fr" }}>
            <div
              className="h-4 border-r"
              style={{ backgroundColor: c.gutter, borderColor: c.border }}
            />
            <div className="h-4" />
          </div>
          {lines.map((_, index) => {
            const ln = index + 1;
            const comment = displayComments[ln];
            const isPickerOpen = selectedReactionLine === ln;

            const openCommentForm = () => {
              if (!requireAuth()) return;
              setSelectedReactionLine(null);
              setSelectedCommentLine(ln);
              setCommentDraft("");
            };

            return (
              <div
                key={ln}
                className="group/gutterline relative grid"
                style={{ gridTemplateColumns: "56px 1fr" }}
              >
                {/* Gutter — on hover (anywhere on the line, gutter or code),
                    swap line number + comment badge for the [smile + comment]
                    toolbar. Mirrors the home composer so both editors share
                    the same affordance. */}
                <div
                  className="flex min-h-6 items-start border-r pl-1 pr-1.5 select-none"
                  style={{ backgroundColor: c.gutter, borderColor: c.border }}
                >
                  <div className="relative flex h-6 w-full items-center justify-end gap-1">
                    {/* Resting state: comment count + line number. Hidden on hover. */}
                    <div
                      className={cn(
                        "flex items-center gap-1.5 transition-opacity",
                        "group-hover/gutterline:opacity-0",
                        (isPickerOpen || selectedCommentLine === ln) && "opacity-0",
                      )}
                    >
                      {comment ? (
                        <button
                          type="button"
                          className="flex h-4 items-center gap-0.5 rounded-sm px-1 text-[10px] font-semibold tabular-nums text-blue-400 transition-opacity hover:opacity-70"
                          onClick={() => {
                            setSelectedReactionLine(null);
                            setSelectedCommentLine(ln);
                            setCommentDraft("");
                          }}
                          title={`${lineComments[ln]?.length ?? 1} comment(s)`}
                        >
                          <MessageSquarePlus className="size-2.5" />
                          {lineComments[ln]?.length ?? 1}
                        </button>
                      ) : null}
                      <span
                        className="text-right text-xs leading-6 tabular-nums"
                        style={{ color: c.lineNum }}
                      >
                        {ln}
                      </span>
                    </div>

                    {/* Hover state: [smile + comment] toolbar. Same hover
                        scope as the resting layer, so any cursor movement on
                        either gutter or code cell flips them. */}
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 rounded-md border px-0.5 opacity-0 transition-opacity",
                        "group-hover/gutterline:pointer-events-auto group-hover/gutterline:opacity-100",
                        (isPickerOpen || selectedCommentLine === ln) &&
                          "opacity-100 pointer-events-auto",
                      )}
                      style={{
                        backgroundColor: c.gutter,
                        borderColor: c.buttonBorder,
                        color: c.buttonText,
                      }}
                    >
                      <Popover
                        open={isPickerOpen}
                        onOpenChange={(open) => {
                          if (open) {
                            if (!requireAuth()) return;
                            setSelectedCommentLine(null);
                            setSelectedReactionLine(ln);
                          } else {
                            setSelectedReactionLine(null);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            title="Add a reaction"
                            aria-label="Add a reaction"
                            className="flex size-4 items-center justify-center rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            <SmilePlus className="size-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          sideOffset={6}
                          className="w-auto p-1"
                          style={{
                            backgroundColor: c.pickerBg,
                            borderColor: c.buttonBorder,
                            color: c.buttonText,
                          }}
                        >
                          {displayReactions[ln] ? (
                            <button
                              type="button"
                              className="mb-1 w-full rounded px-2 py-0.5 text-left text-xs transition-colors hover:bg-red-500/10 hover:text-red-500"
                              style={{ color: c.lineNum }}
                              onClick={() => void handlePickReaction(ln, "")}
                            >
                              Remove reaction
                            </button>
                          ) : null}
                          <div className="grid grid-cols-8 gap-0.5">
                            {REACTION_OPTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded text-base transition-colors",
                                  displayReactions[ln] === emoji
                                    ? "bg-blue-500/10 ring-2 ring-inset ring-blue-500/40"
                                    : "hover:bg-black/5 dark:hover:bg-white/10",
                                )}
                                onClick={() => void handlePickReaction(ln, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <button
                        type="button"
                        onClick={openCommentForm}
                        title="Add a comment"
                        aria-label="Add a comment"
                        className="flex size-4 items-center justify-center rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <MessageSquarePlus className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Code cell — code text + chip pills live in the SAME
                    dangerouslySetInnerHTML so the chip is just another
                    inline sibling token of the syntax-highlighted text.
                    React-rendered chip elements were dropping onto a fresh
                    line below the text in some browsers' inline-flow
                    layout; embedding the chip as plain HTML inside the
                    same span avoids that entirely. Click handling is
                    delegated via onClick on the cell — chips carry
                    data-chip-line + data-chip-emoji + data-chip-mine. */}
                <div
                  className="relative min-h-6 pl-4 pr-3 leading-6"
                  style={
                    selectedCommentLine === ln
                      ? { backgroundColor: c.selectedLine, borderRadius: "2px" }
                      : undefined
                  }
                  onClick={(event) => {
                    // Event delegation for the embedded chip HTML. Each chip
                    // span carries data-chip-emoji + data-chip-mine; the
                    // line number is just `ln` from the surrounding closure.
                    const el = (event.target as HTMLElement | null)?.closest(
                      "[data-chip-emoji]",
                    ) as HTMLElement | null;
                    if (!el) return;
                    const emoji = el.dataset.chipEmoji ?? "";
                    const mine = el.dataset.chipMine === "1";
                    if (!emoji) return;
                    void handlePickReaction(ln, mine ? "" : emoji);
                  }}
                >
                  <div
                    className="whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: lineHtml[index] || " " }}
                  />

                  {/* Pulse animations — fired when remote users react. They
                      stack at the right edge so multiple in quick succession
                      don't pile on top of each other. */}
                  {reactionPulses
                    .filter((p) => p.line === ln)
                    .map((pulse, i) => (
                      <span
                        key={pulse.key}
                        className="reaction-pulse pointer-events-none absolute text-base"
                        style={{ right: `${10 + i * 20}px`, top: 0 }}
                        aria-hidden
                      >
                        {pulse.emoji}
                      </span>
                    ))}
                </div>
              </div>
            );
          })}
          {/* Bottom padding row — mirrors the top spacer */}
          <div className="grid" style={{ gridTemplateColumns: "56px 1fr" }}>
            <div
              className="h-4 border-r"
              style={{ backgroundColor: c.gutter, borderColor: c.border }}
            />
            <div className="h-4" />
          </div>
        </div>
      </div>

      {/* Comment thread + form */}
      {selectedCommentLine ? (
        <div
          className="space-y-3 border-t px-4 py-3"
          style={{ borderColor: c.border, backgroundColor: c.gutter }}
        >
          <p className="font-sans text-xs font-medium" style={{ color: c.buttonText }}>
            Comments on line {selectedCommentLine}
          </p>

          {(lineComments[selectedCommentLine] ?? [])
            .slice()
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((cmt) => (
              <div key={cmt.id} className="flex gap-2 font-sans text-sm">
                <UserAvatar
                  username={cmt.authorUsername}
                  avatarUrl={cmt.authorAvatarUrl}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="flex items-baseline gap-2 text-xs"
                    style={{ color: c.headerText }}
                  >
                    <a
                      href={`https://github.com/${cmt.authorUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      @{cmt.authorUsername}
                    </a>
                    <time dateTime={cmt.createdAt} className="opacity-70">
                      {formatCommentTimestamp(cmt.createdAt)}
                    </time>
                  </div>
                  <p
                    className="whitespace-pre-wrap break-words text-sm"
                    style={{ color: c.buttonText }}
                  >
                    {cmt.body}
                  </p>
                </div>
              </div>
            ))}

          {typingByLine[selectedCommentLine] && typingByLine[selectedCommentLine].length > 0 ? (
            <p
              className="font-sans text-xs italic"
              style={{ color: c.headerText }}
              aria-live="polite"
            >
              {formatTypingNames(typingByLine[selectedCommentLine])} typing…
            </p>
          ) : null}

          <div className="space-y-2 pt-1">
            <textarea
              ref={commentInputRef}
              className="themed-placeholder min-h-16 w-full resize-none rounded-md border px-3 py-2 font-sans text-sm outline-none transition-colors focus-visible:ring-2"
              style={
                {
                  backgroundColor: c.bg,
                  color: c.buttonText,
                  borderColor: c.buttonBorder,
                  // Drive the placeholder + focus ring off the theme palette so
                  // the form blends with the editor instead of the page chrome.
                  ["--placeholder-color"]: c.headerText,
                  ["--tw-ring-color"]: "rgba(59, 130, 246, 0.4)",
                } as React.CSSProperties
              }
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Add a comment…"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSaveComment()}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:brightness-110"
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.9)",
                  color: "#ffffff",
                  border: "1px solid rgba(59, 130, 246, 1)",
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCommentLine(null);
                  setCommentDraft("");
                }}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: c.buttonText }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Auth nudge */}
      {authPrompt ? (
        <div
          className="flex items-center justify-between border-t px-4 py-2.5 font-sans text-sm"
          style={{ borderColor: c.border, backgroundColor: c.gutter }}
        >
          <span style={{ color: c.headerText }}>Log in to leave reactions or comments.</span>
          <a
            href={loginUrl}
            className="rounded-md px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: c.bg, color: c.headerText, border: `1px solid ${c.border}` }}
          >
            Log in
          </a>
        </div>
      ) : null}

      {/* Status bar — flex-wraps on narrow viewports so segments stack instead of overflowing. */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-xs"
        style={{ borderColor: c.border, color: c.headerText, backgroundColor: c.gutter }}
      >
        <span>{languageDisplayName(language)}</span>
        <span>{snippetTheme}</span>
        <span>{lines.length} lines</span>
        <span>{codePointLength(code).toLocaleString()} / 8,000</span>
        <SnippetPresenceInline snippetId={snippetId} author={author} textColor={c.headerText} />
      </div>
    </div>
  );
}

// ── ReactionChip (HTML renderer) ─────────────────────────────────────────────

type Chrome = typeof DARK;

// Lightweight HTML escape for attribute values + text content. Doesn't need
// to be a full sanitiser — reactor usernames and emoji are the only fields,
// and usernames already round-trip through Postgres + Supabase auth, but we
// still escape to be safe in case of future schema changes.
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the chip pill as a plain HTML string so it can be appended to the
 * Lumis-rendered code HTML and shipped to the DOM via dangerouslySetInnerHTML.
 * Click handling lives at the cell level (event delegation on data-chip-line
 * / data-chip-emoji / data-chip-mine), so this output carries no JS — only
 * styling and the data attributes the dispatcher needs.
 *
 * Embedding the chip inside the same dangerouslySetInnerHTML as the syntax
 * highlights guarantees the chip is just another inline sibling of the code
 * tokens. Earlier React-rendered chip elements would drop onto a fresh line
 * below the code in the browser's inline flow even when there was plenty of
 * horizontal room — pure-HTML chips share a single inline context with the
 * code text and only wrap when the wrapped paragraph genuinely runs out of
 * width.
 */
function renderChipHtml(group: ReactionGroup, chrome: Chrome, lineNumber: number): string {
  const visibleReactors = group.reactors.slice(0, 3);
  const overflow = group.reactors.length - visibleReactors.length;
  const names = group.reactors.map((r) => r.authorUsername);
  const tooltip = formatReactorList(names) + ` reacted with ${group.emoji}`;

  const borderColor = group.mine ? chrome.buttonText : chrome.buttonBorder;
  const backgroundColor = group.mine ? chrome.selectedLine : chrome.gutter;

  // Flat inline-block layout — no flex anywhere. inline-block flows like
  // a word and white-space:nowrap on the chip prevents its contents from
  // wrapping mid-chip. Earlier inline-flex versions ended up on a fresh
  // line under short source lines for browser-specific reasons; treating
  // the chip as plain inline-block makes it line-flow exactly like text.
  const chipStyle =
    `border:1px solid ${borderColor};` +
    `background-color:${backgroundColor};` +
    `color:${chrome.buttonText};` +
    `border-radius:9999px;` +
    // Vertical padding is generous enough that the avatar circle's
    // box-shadow ring doesn't kiss the rounded border. With the previous
    // 1px vertical padding the 14px avatar + 1.5px ring = 17px visual
    // overflowed the 16px content area on the dark theme, so the avatar
    // appeared to overlap the border.
    `padding:3px 8px;` +
    `margin-inline-start:8px;` +
    `display:inline-block;` +
    `font-size:11px;` +
    `line-height:1;` +
    `vertical-align:middle;` +
    `white-space:nowrap;` +
    `cursor:pointer;` +
    `user-select:none;`;

  const avatarBoxShadow = `0 0 0 1.5px ${chrome.gutter}`;

  const avatarHtml = visibleReactors
    .map((r, i) => {
      const avatarBg = r.authorAvatarUrl ? "transparent" : nameToColor(r.authorUsername);
      const initial = escapeAttr(nameToInitials(r.authorUsername)[0] ?? "?");
      // First avatar gets a positive 4px gap from the emoji; subsequent
      // avatars overlap the previous by 4px (Slack-style stack).
      const ml = i === 0 ? 4 : -4;
      const wrapperStyle =
        `display:inline-block;` +
        `width:14px;` +
        `height:14px;` +
        `border-radius:9999px;` +
        `vertical-align:middle;` +
        `margin-left:${ml}px;` +
        `font-size:8px;` +
        `font-weight:600;` +
        `line-height:14px;` +
        `text-align:center;` +
        `color:#fff;` +
        `background-color:${avatarBg};` +
        `box-shadow:${avatarBoxShadow};` +
        `overflow:hidden;`;
      const inner = r.authorAvatarUrl
        ? `<img src="${escapeAttr(r.authorAvatarUrl)}" alt="" style="width:14px;height:14px;object-fit:cover;border-radius:9999px;display:block;" />`
        : initial;
      return `<span style="${wrapperStyle}">${inner}</span>`;
    })
    .join("");

  const overflowHtml =
    overflow > 0
      ? `<span style="display:inline-block;height:14px;line-height:14px;padding:0 4px;border-radius:9999px;margin-left:-4px;font-size:8px;font-weight:600;vertical-align:middle;background-color:${chrome.gutter};color:${chrome.headerText};box-shadow:${avatarBoxShadow};">+${overflow}</span>`
      : "";

  return (
    `<span role="button" tabindex="0" ` +
    `data-chip-line="${lineNumber}" ` +
    `data-chip-emoji="${escapeAttr(group.emoji)}" ` +
    `data-chip-mine="${group.mine ? "1" : "0"}" ` +
    `title="${escapeAttr(tooltip)}" ` +
    `aria-label="${escapeAttr(tooltip)}" ` +
    `style="${chipStyle}">` +
    `<span style="font-size:13px;line-height:1;vertical-align:middle;">${escapeAttr(group.emoji)}</span>` +
    avatarHtml +
    overflowHtml +
    `</span>`
  );
}
