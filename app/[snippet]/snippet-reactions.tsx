"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

const QUICK_REACTIONS = [
  "🔥",
  "✨",
  "💡",
  "🎉",
  "🚀",
  "💯",
  "❤️",
  "👍",
  "🙌",
  "😂",
  "👀",
  "🤔",
  "💀",
  "🐛",
  "⚡",
  "💯",
];

type Reaction = { id: string; emoji: string; authorId: string };
type AddEvent = { id: string; emoji: string; authorId: string };
type RemoveEvent = { id: string };

type Props = {
  snippetId: string;
  currentUserId: string | null;
};

export function SnippetReactions({ snippetId, currentUserId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    // Initial load
    void supabase
      .from("snippet_reactions")
      .select("id, emoji, author_id")
      .eq("snippet_id", snippetId)
      .then(({ data }) => {
        setReactions(
          (data ?? []).map((r) => ({ id: r.id, emoji: r.emoji, authorId: r.author_id })),
        );
      });

    const channel = supabase.channel(`snippet-reactions:${snippetId}`, {
      config: { broadcast: { self: true } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "add" }, ({ payload }: { payload: AddEvent }) => {
        setReactions((prev) => {
          const existing = prev.findIndex((r) => r.id === payload.id);
          if (existing !== -1) {
            return prev.map((r) => (r.id === payload.id ? { ...r, emoji: payload.emoji } : r));
          }
          return [...prev, { id: payload.id, emoji: payload.emoji, authorId: payload.authorId }];
        });
      })
      .on("broadcast", { event: "remove" }, ({ payload }: { payload: RemoveEvent }) => {
        setReactions((prev) => prev.filter((r) => r.id !== payload.id));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, snippetId]);

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions) {
      const existing = map.get(r.emoji) ?? { count: 0, mine: false };
      map.set(r.emoji, {
        count: existing.count + 1,
        mine: existing.mine || r.authorId === currentUserId,
      });
    }
    return map;
  }, [reactions, currentUserId]);

  const myReaction = reactions.find((r) => r.authorId === currentUserId) ?? null;

  const handleToggle = async (emoji: string) => {
    if (!currentUserId || !channelRef.current) return;
    setShowPicker(false);

    if (myReaction?.emoji === emoji) {
      // Remove
      await supabase.from("snippet_reactions").delete().eq("id", myReaction.id);
      await channelRef.current.send({
        type: "broadcast",
        event: "remove",
        payload: { id: myReaction.id },
      });
    } else {
      // Add or update
      const { data } = await supabase
        .from("snippet_reactions")
        .upsert(
          { snippet_id: snippetId, author_id: currentUserId, emoji },
          { onConflict: "snippet_id,author_id" },
        )
        .select("id")
        .single();
      if (data?.id) {
        await channelRef.current.send({
          type: "broadcast",
          event: "add",
          payload: { id: data.id, emoji, authorId: currentUserId },
        });
      }
    }
  };

  if (grouped.size === 0 && !currentUserId) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from(grouped.entries()).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => void handleToggle(emoji)}
          disabled={!currentUserId}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
            mine
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-border bg-muted/40 text-muted-foreground hover:border-border/80 hover:bg-muted/60",
            !currentUserId && "cursor-default",
          )}
        >
          <span>{emoji}</span>
          <span className="text-xs tabular-nums">{count}</span>
        </button>
      ))}

      {currentUserId ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border text-lg text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
            title="Add reaction"
          >
            +
          </button>
          {showPicker ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
              <div className="absolute bottom-10 left-0 z-50 grid grid-cols-8 gap-0.5 rounded-md border border-border bg-popover p-1.5 shadow-md">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded text-base transition-opacity",
                      myReaction?.emoji === emoji ? "opacity-100" : "opacity-60 hover:opacity-100",
                    )}
                    onClick={() => void handleToggle(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
