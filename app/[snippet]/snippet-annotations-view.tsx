"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ClipboardType, Copy, MessageSquarePlus, SmilePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CHIP_EXIT, play } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  EXPORT_FONTS,
  estimateExportDimensions,
  exportLineHeightForFontSize,
  isBrandHeaderDecoration,
} from "@/lib/export-utils";
import { findExportBackground, type SnippetAppearance } from "@/lib/snippet-appearance";
import {
  BackgroundDecoration,
  backgroundCanvasStyle,
  backgroundFrameShadow,
} from "@/components/brand-scene-decoration";
import { BrandWindowHeader } from "@/components/brand-window-header";
import { copyRichText, createRichTextClipboard } from "@/lib/rich-text-export";
import { createClient } from "@/lib/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ResponsiveModal } from "@/components/responsive-modal";
import {
  languageDisplayName,
  codePointLength,
  groupLineReactions,
  lineReactionsToExportChips,
  type ReactionGroup,
} from "@/lib/snippet-utils";
import { nameToColor, nameToInitials } from "@/lib/presence-utils";
import { UserAvatar } from "@/components/user-avatar";
import { formatCommentTimestamp, formatReactorList } from "@/lib/format-utils";
import { buildLoginUrl } from "@/lib/auth-redirect";
import { SnippetPresenceInline, type PresenceLines } from "./snippet-presence";
import { ShareButton } from "./share-button";
import { SnippetExportModal } from "./snippet-export-modal";

const DEV_MODE = process.env.NODE_ENV !== "production";
// Room for the card's Copy, Rich text, Export and Share actions on a canvas.
const SAVED_CARD_MIN_WIDTH = 560;

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

type ReactionRow = {
  id: string;
  snippet_id: string;
  line_number: number;
  emoji: string;
  author_id: string;
};

type CommentRow = {
  id: string;
  snippet_id: string;
  line_number: number;
  body: string;
  author_id: string;
  created_at: string;
};

type Author = { id: string; username: string; avatar_url: string } | null;

type Props = {
  snippetId: string;
  filename: string;
  code: string;
  language: string;
  snippetUrl: string;
  snippetTheme: string;
  fontId: string;
  snippetReactions: Record<number, import("@/lib/snippet-utils").ExportReactionChip[]>;
  preRenderedLines: string[];
  themeIsDark: boolean;
  themeBg: string | null;
  themeFg: string | null;
  currentUserId: string | null;
  author: Author;
  /** How the author composed the snippet: canvas, frame, spacing, header. */
  appearance: SnippetAppearance;
};

export function SnippetAnnotationsView({
  snippetId,
  filename,
  code,
  language,
  snippetUrl,
  snippetTheme,
  fontId,
  snippetReactions,
  preRenderedLines,
  themeIsDark,
  themeBg,
  themeFg,
  currentUserId,
  author,
  appearance,
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
  // Same card as the composer preview: the brand frame's fill for the card and
  // its header, and for the code too under the `lumis` / `markdown` bars.
  const background = findExportBackground(appearance.background);
  const brandFrame = background?.frame;
  const cardFill = brandFrame?.cardFill ?? themeBg ?? base.bg;
  const bodyFill = isBrandHeaderDecoration(appearance.windowDecoration) ? cardFill : null;
  const c = {
    ...base,
    bg: bodyFill ?? themeBg ?? base.bg,
    gutter: bodyFill ?? themeBg ?? base.gutter,
    header: cardFill,
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
  // The own comment waiting on its delete confirmation, and whether it's going.
  const [commentToDelete, setCommentToDelete] = useState<LineComment | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  // Transient list of "ping" animations played when remote viewers react.
  // Each entry is removed after its CSS animation finishes (~750ms).
  const [reactionPulses, setReactionPulses] = useState<
    Array<{ key: string; line: number; emoji: string }>
  >([]);
  // The chip that just changed (`line:emoji`): it pops once, then the marker
  // clears so later re-renders don't replay it.
  const [poppedChip, setPoppedChip] = useState<string | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popChip = useCallback((line: number, emoji: string) => {
    if (popTimer.current) clearTimeout(popTimer.current);
    setPoppedChip(`${line}:${emoji}`);
    popTimer.current = setTimeout(() => setPoppedChip(null), 500);
  }, []);
  // Comments that arrived during this visit rise in; someone else's also get
  // a soft wash on their line so a live reply is noticed without a toast.
  const [freshComments, setFreshComments] = useState<
    Record<string, { line: number; remote: boolean }>
  >({});
  const markFreshComment = useCallback((id: string, line: number, remote: boolean) => {
    setFreshComments((prev) => ({ ...prev, [id]: { line, remote } }));
    setTimeout(() => {
      setFreshComments(({ [id]: _done, ...rest }) => rest);
    }, 1800);
  }, []);
  const freshRemoteLines = useMemo(
    () =>
      new Set(
        Object.values(freshComments)
          .filter((fresh) => fresh.remote)
          .map((fresh) => fresh.line),
      ),
    [freshComments],
  );
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const [richCopied, setRichCopied] = useState(false);
  const handleCopyRichText = useCallback(() => {
    copyRichText(
      createRichTextClipboard(code, filename, snippetTheme, {
        fontId,
        fontSize: appearance.fontSize,
        language,
      }),
    ).then(
      () => {
        setRichCopied(true);
        setTimeout(() => setRichCopied(false), 2000);
      },
      () => toast.error("Could not copy to the clipboard."),
    );
  }, [code, filename, snippetTheme, fontId, appearance.fontSize, language]);

  // Presence: tell other viewers which line you're on (the open comment or
  // reaction line, else the hovered one), debounced and kept in refs so
  // hovering never re-renders the view; their lines get a soft highlight.
  const trackLineRef = useRef<((line: number | null) => void) | null>(null);
  const hoverLineRef = useRef<number | null>(null);
  const openLineRef = useRef<number | null>(null);
  const sentLineRef = useRef<number | null>(null);
  const trackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendFocusLine = useCallback(() => {
    if (trackTimer.current) clearTimeout(trackTimer.current);
    trackTimer.current = setTimeout(() => {
      const line = openLineRef.current ?? hoverLineRef.current;
      if (line === sentLineRef.current) return;
      sentLineRef.current = line;
      trackLineRef.current?.(line);
    }, 250);
  }, []);
  const [presenceLines, setPresenceLines] = useState<PresenceLines>({});
  // The last colour on each line, so a highlight fades out in its own colour.
  const presenceColors = useRef<Record<number, string>>({});

  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [canvasRef, renderedCanvasWidth] = useElementWidth<HTMLDivElement>();

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

  useEffect(() => {
    openLineRef.current = selectedCommentLine ?? selectedReactionLine;
    sendFocusLine();
  }, [selectedCommentLine, selectedReactionLine, sendFocusLine]);
  useEffect(() => () => clearTimeout(trackTimer.current ?? undefined), []);

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

  // ── Authoritative Realtime state ───────────────────────────────────────────
  // Reactions and comments are driven only by RLS-filtered Postgres Changes.
  // Public broadcast payloads are intentionally not consumed: callers could
  // forge their author identity and make uncommitted content appear genuine.
  useEffect(() => {
    async function loadProfile(authorId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", authorId)
        .maybeSingle();
      return {
        username: data?.username ?? "unknown",
        avatarUrl: data?.avatar_url || null,
      };
    }

    const channel = supabase
      .channel(`snippet-db:${snippetId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "snippet_line_reactions",
          filter: `snippet_id=eq.${snippetId}`,
        },
        async (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as ReactionRow;
          if (!row.id) return;

          if (payload.eventType === "DELETE") {
            setLineReactions((prev) => ({
              ...prev,
              [row.line_number]: (prev[row.line_number] ?? []).filter(
                (reaction) => reaction.id !== row.id,
              ),
            }));
            return;
          }

          const profile = await loadProfile(row.author_id);
          setLineReactions((prev) => ({
            ...prev,
            [row.line_number]: [
              ...(prev[row.line_number] ?? []).filter((reaction) => reaction.id !== row.id),
              {
                id: row.id,
                emoji: row.emoji,
                authorId: row.author_id,
                authorUsername: profile.username,
                authorAvatarUrl: profile.avatarUrl,
              },
            ],
          }));

          if (row.author_id !== currentUserId) {
            popChip(row.line_number, row.emoji);
            const pulseKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            setReactionPulses((prev) => [
              ...prev,
              { key: pulseKey, line: row.line_number, emoji: row.emoji },
            ]);
            setTimeout(() => {
              setReactionPulses((prev) => prev.filter((pulse) => pulse.key !== pulseKey));
            }, 800);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "snippet_comments",
          filter: `snippet_id=eq.${snippetId}`,
        },
        async (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as CommentRow;
          if (!row.id) return;

          if (payload.eventType === "DELETE") {
            setLineComments((prev) => ({
              ...prev,
              [row.line_number]: (prev[row.line_number] ?? []).filter(
                (comment) => comment.id !== row.id,
              ),
            }));
            return;
          }

          const profile = await loadProfile(row.author_id);
          if (payload.eventType === "INSERT" && row.author_id !== currentUserId) {
            markFreshComment(row.id, row.line_number, true);
          }
          setLineComments((prev) => ({
            ...prev,
            [row.line_number]: [
              ...(prev[row.line_number] ?? []).filter((comment) => comment.id !== row.id),
              {
                id: row.id,
                authorId: row.author_id,
                authorUsername: profile.username,
                authorAvatarUrl: profile.avatarUrl,
                body: row.body,
                createdAt: row.created_at,
              },
            ],
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, snippetId, currentUserId, popChip, markFreshComment]);

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

  // The export shows one comment per line, so pick the earliest thread on each.
  const exportComments = useMemo(() => {
    const byLine: Record<number, { author?: string; body: string }> = {};
    for (const [line, thread] of Object.entries(lineComments)) {
      const first = thread[0];
      if (first) byLine[Number(line)] = { author: first.authorUsername, body: first.body };
    }
    return byLine;
  }, [lineComments]);

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
      const chipMarkup = groups
        .map((g) => renderChipHtml(g, c, ln, poppedChip === `${ln}:${g.emoji}`))
        .join("");
      return (html || " ") + chipMarkup;
    });
  }, [preRenderedLines, displayReactionGroups, c, poppedChip]);

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
  /** Resolves true when the reaction change landed. */
  const handlePickReaction = async (line: number, emoji: string): Promise<boolean> => {
    if (!requireAuth()) return false;
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
      if (emoji) popChip(line, emoji);
      return true;
    }

    if (!emoji) {
      // Use .select() so an RLS-blocked delete surfaces as zero rows: RLS
      // denies a DELETE without an error, so zero rows is the failure signal.
      const { data: deleted, error } = await supabase
        .from("snippet_line_reactions")
        .delete()
        .eq("snippet_id", snippetId)
        .eq("author_id", currentUserId)
        .eq("line_number", line)
        .select("id");
      if (error || !deleted?.length) {
        toast.error("Could not remove your reaction. Please try again.");
        return false;
      }

      const deletedIds = new Set(deleted.map((row) => row.id));
      setLineReactions((prev) => ({
        ...prev,
        [line]: (prev[line] ?? []).filter((reaction) => !deletedIds.has(reaction.id)),
      }));
      return true;
    }

    const { data, error } = await supabase
      .from("snippet_line_reactions")
      .upsert(
        { snippet_id: snippetId, author_id: currentUserId, line_number: line, emoji },
        { onConflict: "snippet_id,author_id,line_number" },
      )
      .select("id")
      .single();
    if (error) toast.error("Could not save your reaction. Please try again.");

    if (data?.id) {
      setLineReactions((prev) => ({
        ...prev,
        [line]: [
          ...(prev[line] ?? []).filter((reaction) => reaction.id !== data.id),
          {
            id: data.id,
            emoji,
            authorId: currentUserId,
            authorUsername: currentUsername ?? "unknown",
            authorAvatarUrl: currentUserAvatar,
          },
        ],
      }));
      popChip(line, emoji);
    }
    return Boolean(data?.id);
  };

  /**
   * Take your reaction off a line. A chip that was only yours shrinks away
   * while the delete runs (and comes back if it fails); a shared chip ticks
   * once it has one reactor fewer.
   */
  const removeReaction = async (line: number, chip: HTMLElement | null) => {
    const shared = Number(chip?.dataset.chipCount ?? "1") > 1;
    const exit = shared
      ? null
      : play(chip, CHIP_EXIT, { duration: 160, easing: "ease-in", fill: "forwards" });
    const removed = await handlePickReaction(line, "");
    if (!removed) exit?.cancel();
    else if (shared && chip?.dataset.chipEmoji) popChip(line, chip.dataset.chipEmoji);
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
      const devId = `dev-${Date.now()}`;
      markFreshComment(devId, line, false);
      setLineComments((prev) => {
        const existing = prev[line] ?? [];
        return {
          ...prev,
          [line]: [
            ...existing,
            {
              id: devId,
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

    const { data, error } = await supabase
      .from("snippet_comments")
      .insert({ snippet_id: snippetId, author_id: currentUserId, line_number: line, body })
      .select("id, created_at")
      .single();
    if (error) {
      // Give the draft back so nothing the user typed is lost.
      setCommentDraft(body);
      toast.error("Could not post your comment. Please try again.");
    }

    if (data?.id) {
      markFreshComment(data.id, line, false);
      setLineComments((prev) => ({
        ...prev,
        [line]: [
          ...(prev[line] ?? []).filter((comment) => comment.id !== data.id),
          {
            id: data.id,
            authorId: currentUserId,
            authorUsername: currentUsername ?? "unknown",
            authorAvatarUrl: currentUserAvatar,
            body,
            createdAt: data.created_at ?? new Date().toISOString(),
          },
        ],
      }));
    }
  };

  const removeComment = (id: string) =>
    setLineComments((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([line, thread]) => [line, thread.filter((c) => c.id !== id)]),
      ),
    );

  /** Deletes the viewer's own comment once they confirm. */
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    const { id } = commentToDelete;
    if (!currentUserId) {
      // dev mode only
      removeComment(id);
      setCommentToDelete(null);
      return;
    }
    setDeletingComment(true);
    // RLS denies someone else's delete with zero rows rather than an error.
    const { data, error } = await supabase
      .from("snippet_comments")
      .delete()
      .eq("id", id)
      .eq("author_id", currentUserId)
      .select("id");
    setDeletingComment(false);
    if (error || !data?.length) {
      toast.error("Could not delete your comment. Please try again.");
      return;
    }
    removeComment(id);
    setCommentToDelete(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const fontFamily = (EXPORT_FONTS.find((font) => font.id === fontId) ?? EXPORT_FONTS[0]!).family;
  const { header, windowDecoration } = appearance;
  const lineHeight = exportLineHeightForFontSize(appearance.fontSize, brandFrame?.lineHeight);
  // Without line numbers the gutter only hosts the reaction and comment
  // controls, so it drops its rule as the composer preview does.
  const gutterRule = appearance.lineNumbers ? c.border : "transparent";
  const filenamePosition = header.enabled && header.showFilename ? header.filenamePosition : null;
  const filenameLabel = (
    <span
      className="block truncate text-xs font-medium"
      style={{ color: c.headerText }}
      title={filename}
    >
      {filename}
    </span>
  );
  const languagePosition = header.enabled && header.showLanguage ? header.languagePosition : null;
  const headerMeta = (position: "left" | "center" | "right") => (
    <>
      {filenamePosition === position ? filenameLabel : null}
      {languagePosition === position ? (
        <span className="shrink-0 text-xs" style={{ color: c.headerText }}>
          {languageDisplayName(language)}
        </span>
      ) : null}
    </>
  );
  const actions = (
    <div className="flex items-center justify-end gap-1.5">
      {windowDecoration === "windows" && header.enabled ? (
        <div
          className="flex items-center gap-3 pr-1 text-[11px] leading-none"
          style={{ color: c.headerText }}
        >
          <span aria-hidden="true" className="opacity-55">
            ─
          </span>
          <span aria-hidden="true" className="opacity-55">
            □
          </span>
          <span aria-hidden="true" className="opacity-55">
            ×
          </span>
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleCopy}
        title="Copy code"
        aria-label="Copy code"
        className="press flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-opacity hover:opacity-80"
        style={{ color: c.buttonText }}
      >
        {copied ? <Check className="pop-in size-3.5" /> : <Copy className="size-3.5" />}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
      </button>
      <button
        type="button"
        onClick={handleCopyRichText}
        title="Copy as rich text"
        aria-label="Copy as rich text"
        className="press flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-opacity hover:opacity-80"
        style={{ color: c.buttonText }}
      >
        {richCopied ? (
          <Check className="pop-in size-3.5" />
        ) : (
          <ClipboardType className="size-3.5" />
        )}
        <span className="hidden sm:inline">{richCopied ? "Copied" : "Rich text"}</span>
      </button>
      <SnippetExportModal
        code={code}
        filename={filename}
        theme={snippetTheme}
        fontId={fontId}
        language={language}
        appearance={appearance}
        authorUsername={author?.username ?? null}
        authorAvatarUrl={author?.avatar_url ?? null}
        reactions={exportReactions}
        comments={exportComments}
        sourceUrl={snippetUrl}
        style={{ color: c.buttonText }}
      />
      <ShareButton url={snippetUrl} style={{ color: c.buttonText }} />
    </div>
  );

  const card = (
    <div
      data-testid="snippet-card"
      className={cn(
        // relative: the publish stamp is pressed onto this corner when
        // there is no canvas around the card.
        "relative flex h-full min-h-0 flex-col overflow-hidden font-mono text-sm",
        // The composer card's shadow; a brand frame recipe overrides it below.
        "shadow-2xl",
        brandFrame ? "ring-0" : "ring-1 ring-black/10",
      )}
      style={{
        backgroundColor: cardFill,
        fontFamily,
        fontVariantLigatures: appearance.ligatures ? undefined : "none",
        borderRadius: appearance.cornerRadius,
        boxShadow: backgroundFrameShadow(background),
      }}
    >
      {isBrandHeaderDecoration(windowDecoration) && header.enabled ? (
        <BrandWindowHeader
          decoration={windowDecoration}
          brandFrame={brandFrame}
          header={header}
          filename={filename}
          language={language}
          cardFill={cardFill}
          borderColor={c.border}
          fontSize={appearance.fontSize}
          // Icon-only actions keep the brand bar's filename and label visible.
          actions={<div className="[&_button>span]:hidden!">{actions}</div>}
        />
      ) : (
        /* Window chrome — three-column grid so the centred title doesn't
           shift when the right-side button changes width (Copy ↔ Copied). */
        <div
          className="grid items-center gap-x-3 border-b px-4 py-2.5"
          style={{
            backgroundColor: c.header,
            borderColor: brandFrame?.cardBorder?.color ?? c.border,
            // With the centre empty, let a side label use the free width
            // instead of half the bar, as the composer preview does.
            gridTemplateColumns:
              filenamePosition === "center" || languagePosition === "center"
                ? "1fr auto 1fr"
                : "minmax(0,max-content) minmax(0,1fr) minmax(0,max-content)",
          }}
        >
          <div className="flex min-w-0 items-center gap-[7px]">
            {header.enabled && windowDecoration === "macos" ? (
              <>
                <span className="size-3 shrink-0 rounded-full bg-[#ff5f57]" />
                <span className="size-3 shrink-0 rounded-full bg-[#febc2e]" />
                <span className="size-3 shrink-0 rounded-full bg-[#28c840]" />
              </>
            ) : header.enabled && windowDecoration === "macos-subtle" ? (
              <>
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: c.headerText }}
                />
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: c.headerText }}
                />
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: c.headerText }}
                />
              </>
            ) : null}
            {headerMeta("left")}
          </div>
          <div className="flex min-w-0 items-center justify-center gap-2 px-3">
            {headerMeta("center")}
          </div>
          <div className="flex min-w-0 items-center justify-end gap-1.5">
            {headerMeta("right")}
            {/* On a canvas the card is export-sized, so the actions go icon-only. */}
            <div className={background ? "[&_button>span]:hidden!" : undefined}>{actions}</div>
          </div>
        </div>
      )}

      {/* Editor body — per-row grid so gutter and code heights align naturally for wrapped lines.
          Caps at viewport height minus surrounding chrome so short snippets shrink to fit. */}
      {/* Pin the default text colour to the theme fg so unscoped chunks
          (whitespace between tags, plain text) read against the theme bg
          instead of falling back to the page foreground. */}
      <div
        className="min-h-0 flex-1 overflow-auto"
        style={{ backgroundColor: c.bg, color: themeFg ?? undefined }}
      >
        <div
          onMouseMove={(event) => {
            const row = (event.target as HTMLElement).closest<HTMLElement>("[data-line]");
            const line = row ? Number(row.dataset.line) : null;
            if (line === hoverLineRef.current) return;
            hoverLineRef.current = line;
            sendFocusLine();
          }}
          onMouseLeave={() => {
            hoverLineRef.current = null;
            sendFocusLine();
          }}
        >
          {/* Top padding row — gutter bg on the left matches the gutter column below */}
          <div className="grid" style={{ gridTemplateColumns: "56px 1fr" }}>
            <div
              className="border-r"
              style={{
                height: appearance.innerPadding,
                backgroundColor: c.gutter,
                borderColor: gutterRule,
              }}
            />
            <div style={{ height: appearance.innerPadding }} />
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
                data-line={ln}
                className="group/gutterline relative grid"
                style={{ gridTemplateColumns: "56px 1fr" }}
              >
                {/* Gutter — on hover (anywhere on the line, gutter or code),
                    swap line number + comment badge for the [smile + comment]
                    toolbar. Mirrors the home composer so both editors share
                    the same affordance. */}
                <div
                  className="flex min-h-6 items-start border-r pl-1 pr-1.5 select-none"
                  style={{ backgroundColor: c.gutter, borderColor: gutterRule }}
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
                          key={lineComments[ln]?.length ?? 1}
                          type="button"
                          className={cn(
                            "flex h-4 items-center gap-0.5 rounded-sm px-1 text-[10px] font-semibold tabular-nums text-blue-400 transition-opacity hover:opacity-70",
                            freshRemoteLines.has(ln) && "chip-pop",
                          )}
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
                      {appearance.lineNumbers ? (
                        <span
                          className="text-right text-xs leading-6 tabular-nums"
                          style={{ color: c.lineNum }}
                        >
                          {ln}
                        </span>
                      ) : null}
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
                              onClick={() =>
                                void removeReaction(
                                  ln,
                                  document.querySelector<HTMLElement>(
                                    `[data-chip-line="${ln}"][data-chip-mine="1"]`,
                                  ),
                                )
                              }
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
                  className="relative min-h-6 pr-3"
                  style={{
                    paddingLeft: appearance.innerPadding,
                    fontSize: appearance.fontSize,
                    lineHeight: `${lineHeight}px`,
                    ...(selectedCommentLine === ln
                      ? { backgroundColor: c.selectedLine, borderRadius: "2px" }
                      : null),
                  }}
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
                    if (mine) void removeReaction(ln, el);
                    else void handlePickReaction(ln, emoji);
                  }}
                >
                  <PresenceLineHighlight
                    viewers={presenceLines[ln]}
                    colors={presenceColors.current}
                    line={ln}
                  />
                  {freshRemoteLines.has(ln) ? (
                    <span
                      aria-hidden="true"
                      className="arrive-glow absolute inset-0 rounded-sm bg-blue-400/10"
                    />
                  ) : null}
                  <div
                    className="whitespace-pre-wrap wrap-break-word"
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
              className="border-r"
              style={{
                height: appearance.innerPadding,
                backgroundColor: c.gutter,
                borderColor: gutterRule,
              }}
            />
            <div style={{ height: appearance.innerPadding }} />
          </div>
        </div>
      </div>

      {/* Comment thread + form */}
      {selectedCommentLine ? (
        <div
          className="space-y-3 border-t px-4 py-3"
          style={{ borderColor: c.border, backgroundColor: c.gutter }}
        >
          <p className="eyebrow" style={{ color: c.headerText }}>
            Comments on line {selectedCommentLine}
          </p>

          {(lineComments[selectedCommentLine] ?? [])
            .slice()
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((cmt) => (
              <div
                key={cmt.id}
                className={cn(
                  "relative isolate flex gap-2 font-sans text-sm",
                  freshComments[cmt.id] && "rise-in",
                )}
              >
                {freshComments[cmt.id]?.remote ? (
                  <span
                    aria-hidden="true"
                    className="arrive-glow absolute -inset-1.5 -z-10 rounded-lg bg-blue-400/15"
                  />
                ) : null}
                <UserAvatar
                  username={cmt.authorUsername}
                  avatarUrl={cmt.authorAvatarUrl}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="flex min-w-0 items-baseline gap-2 text-xs"
                    style={{ color: c.headerText }}
                  >
                    <Link
                      href={`https://github.com/${cmt.authorUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-medium hover:underline"
                    >
                      @{cmt.authorUsername}
                    </Link>
                    <time dateTime={cmt.createdAt} className="shrink-0 opacity-70">
                      {formatCommentTimestamp(cmt.createdAt)}
                    </time>
                  </div>
                  <p
                    className="whitespace-pre-wrap wrap-break-word text-sm"
                    style={{ color: c.buttonText }}
                  >
                    {cmt.body}
                  </p>
                </div>
                {cmt.authorId === (currentUserId ?? "dev-user") ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete comment"
                    className="-my-1.5 size-11 shrink-0 opacity-70 hover:opacity-100 sm:size-8"
                    style={{ color: c.headerText }}
                    onClick={() => setCommentToDelete(cmt)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            ))}

          <div className="space-y-2 pt-1">
            <textarea
              ref={commentInputRef}
              maxLength={2000}
              className="themed-placeholder min-h-16 w-full resize-none rounded-xl border px-3 py-2 font-sans text-sm outline-hidden transition-colors focus-visible:focus-ring"
              style={
                {
                  backgroundColor: c.bg,
                  color: c.buttonText,
                  borderColor: c.buttonBorder,
                  // Drive the placeholder + focus ring off the theme palette so
                  // the form blends with the editor instead of the page chrome.
                  ["--placeholder-color"]: c.headerText,
                } as React.CSSProperties
              }
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Add a comment…"
              autoFocus
            />
            <div className="flex flex-row-reverse justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleSaveComment()}
                className="min-h-9 rounded-full bg-wax px-4 font-sans text-sm font-semibold text-on-wax transition-colors hover:bg-wax-hover focus-visible:focus-ring"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCommentLine(null);
                  setCommentDraft("");
                }}
                className="min-h-9 rounded-full px-4 font-sans text-sm font-semibold transition-opacity hover:opacity-80 focus-visible:focus-ring"
                style={{ color: c.buttonText }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ResponsiveModal
        open={commentToDelete !== null}
        onOpenChange={(open) => !open && !deletingComment && setCommentToDelete(null)}
        title="Delete your comment?"
        description="It will be removed for everyone. This cannot be undone."
        footer={
          <>
            <Button
              variant="ghost"
              disabled={deletingComment}
              onClick={() => setCommentToDelete(null)}
            >
              Cancel
            </Button>
            <Button disabled={deletingComment} onClick={() => void handleDeleteComment()}>
              {deletingComment ? <Spinner /> : null}
              Delete comment
            </Button>
          </>
        }
      >
        {commentToDelete ? (
          <p className="line-clamp-4 rounded-xl bg-surf2 px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word">
            {commentToDelete.body}
          </p>
        ) : null}
      </ResponsiveModal>

      {/* Auth nudge */}
      {authPrompt ? (
        <div
          className="flex items-center justify-between border-t px-4 py-2.5 font-sans text-sm"
          style={{ borderColor: c.border, backgroundColor: c.gutter }}
        >
          <span style={{ color: c.headerText }}>Log in to leave reactions or comments.</span>
          <Link
            href={loginUrl}
            // Inside the snippet's own palette, so the link takes the theme's
            // text colour; the site's postal blue can't hold contrast on every theme.
            className="rounded-full px-2 py-1 font-semibold underline underline-offset-4 hover:opacity-80 focus-visible:focus-ring"
            style={{ color: c.buttonText }}
          >
            Log in
          </Link>
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
        <SnippetPresenceInline
          snippetId={snippetId}
          author={author}
          textColor={c.headerText}
          trackLineRef={trackLineRef}
          onLinesChange={setPresenceLines}
        />
      </div>
    </div>
  );

  if (!background) return card;

  // The published canvas, sized and painted as the composer preview: the
  // export's logical canvas (widened to 16:9 when set) with the card centred
  // at its export width. The card keeps room for the saved view's actions.
  const exportSize = estimateExportDimensions({
    code,
    filename,
    language,
    theme: snippetTheme,
    background,
    outerPadding: appearance.outerPadding,
    lineNumbers: appearance.lineNumbers,
    showFooter: appearance.footer.enabled,
    header,
    footer: appearance.footer,
    footerAuthorUsername: author?.username,
    windowDecoration,
    innerPadding: appearance.innerPadding,
    fontSize: appearance.fontSize,
    compactReactions: true,
  });
  const cardWidth = Math.max(exportSize.width - appearance.outerPadding * 2, SAVED_CARD_MIN_WIDTH);
  const canvasWidth = Math.max(
    cardWidth + appearance.outerPadding * 2,
    appearance.aspectRatio ? (exportSize.height * 16) / 9 : 0,
  );
  const canvasHeight = appearance.aspectRatio ? (canvasWidth * 9) / 16 : exportSize.height;
  const canvasPadding = appearance.outerPadding > 0 ? `min(${appearance.outerPadding}px, 10vw)` : 0;
  return (
    <div
      ref={canvasRef}
      data-testid="snippet-canvas"
      data-background={background.label}
      className="relative isolate mx-auto flex min-h-0 max-w-full flex-col justify-center overflow-hidden rounded-sm"
      style={
        {
          ...backgroundCanvasStyle(background, canvasPadding),
          width: canvasWidth,
          // Grows with comments and reactions, but never below 16:9.
          minHeight: appearance.aspectRatio ? (renderedCanvasWidth * 9) / 16 : undefined,
          "--preview-outer-padding": canvasPadding,
        } as React.CSSProperties & { "--preview-outer-padding": string | number }
      }
    >
      <BackgroundDecoration
        background={background}
        width={canvasWidth}
        height={canvasHeight}
        fontFamily={fontFamily}
      />
      <div
        className="relative z-10 mx-auto flex min-h-0 max-w-full flex-col"
        style={{ width: cardWidth }}
      >
        {card}
      </div>
    </div>
  );
}

/**
 * A soft wash, in the viewer's colour, on a line someone else is looking at.
 * Always mounted so it fades both in and out (opacity only).
 */
function PresenceLineHighlight({
  viewers,
  colors,
  line,
}: {
  viewers: PresenceLines[number] | undefined;
  colors: Record<number, string>;
  line: number;
}) {
  if (viewers?.length) colors[line] = nameToColor(viewers[0]!.name);
  const color = colors[line];
  if (!color) return null;
  return (
    <span
      aria-hidden="true"
      data-presence-line={viewers?.length ? "1" : undefined}
      title={viewers?.map((v) => v.name).join(", ")}
      className="pointer-events-none absolute inset-0 rounded-sm transition-opacity duration-300 motion-reduce:transition-none"
      style={{
        opacity: viewers?.length ? 1 : 0,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        boxShadow: `inset 2px 0 0 ${color}`,
      }}
    />
  );
}

/** Tracks an element's rendered width, for the 16:9 canvas's minimum height. */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry!.borderBoxSize?.[0]?.inlineSize ?? entry!.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
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
function renderChipHtml(
  group: ReactionGroup,
  chrome: Chrome,
  lineNumber: number,
  pop = false,
): string {
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
    `data-chip-count="${group.reactors.length}" ` +
    // Pops once when someone reacts with this emoji (globals.css).
    (pop ? `data-chip-pop="1" ` : "") +
    `title="${escapeAttr(tooltip)}" ` +
    `aria-label="${escapeAttr(tooltip)}" ` +
    `style="${chipStyle}">` +
    `<span style="font-size:13px;line-height:1;vertical-align:middle;">${escapeAttr(group.emoji)}</span>` +
    avatarHtml +
    overflowHtml +
    `</span>`
  );
}
