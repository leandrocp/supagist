"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateGuestName } from "@/lib/presence-utils";
import { UserAvatar } from "@/components/user-avatar";

type PresenceUser = { key: string; name: string; avatarUrl?: string };

const MAX_INLINE_USERS = 3;

/**
 * Live presence pulse on the homepage. Joins the `supagist:lobby`
 * channel so every visitor on the homepage sees who else is writing
 * right now — avatar stack + a short name list. Mirrors the
 * SnippetPresenceInline pattern: presence-key is `auth.uid()`,
 * signed-in users carry their GitHub avatar, anonymous users get a
 * deterministic adjective+animal name from `generateGuestName`.
 */
export function HomePresence() {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [visitors, setVisitors] = useState<PresenceUser[]>([]);
  const [selfKey, setSelfKey] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function init() {
      const existing = channelRef.current;
      if (existing) {
        await supabase.removeChannel(existing);
        channelRef.current = null;
      }

      const { data } = await supabase.auth.getUser();
      if (!isActive) return;

      const user = data?.user;
      const presenceKey = user?.id ?? crypto.randomUUID();
      setSelfKey(presenceKey);

      const meta = user?.user_metadata;
      const isAnonymous = user?.is_anonymous ?? true;

      const username: string | undefined = isAnonymous
        ? undefined
        : (meta?.user_name ??
          meta?.preferred_username ??
          meta?.name ??
          user?.email?.split("@")[0] ??
          undefined);
      const avatarUrl: string | undefined = isAnonymous
        ? undefined
        : (meta?.avatar_url ?? undefined);
      const guestName = generateGuestName(presenceKey);

      const channel = supabase.channel("supagist:lobby", {
        config: { presence: { key: presenceKey } },
      });
      channelRef.current = channel;

      type PresencePayload = { online_at: string; name: string; avatar_url?: string };

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<PresencePayload>();
          const users: PresenceUser[] = Object.entries(state).map(([key, presences]) => {
            const p = presences[0];
            return { key, name: p?.name ?? generateGuestName(key), avatarUrl: p?.avatar_url };
          });
          setVisitors(users);
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED") return;
          await channel.track({
            online_at: new Date().toISOString(),
            name: username ?? guestName,
            avatar_url: avatarUrl,
          });
        });
    }

    void init();

    // Closing a tab doesn't unmount React. Without an explicit untrack the
    // WS sometimes lingers long enough that other clients keep seeing the
    // closed tab as a viewer until the server-side heartbeat times out.
    const handleHide = () => {
      const ch = channelRef.current;
      if (ch) void ch.untrack();
    };
    window.addEventListener("pagehide", handleHide);

    return () => {
      isActive = false;
      window.removeEventListener("pagehide", handleHide);
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) {
        void ch.untrack();
        void supabase.removeChannel(ch);
      }
    };
  }, [supabase]);

  if (visitors.length === 0) return null;

  // Self ordered last so other names lead in the inline list.
  const ordered = [...visitors].sort((a, b) => {
    if (a.key === selfKey) return 1;
    if (b.key === selfKey) return -1;
    return 0;
  });
  const visible = ordered.slice(0, MAX_INLINE_USERS);
  const remaining = ordered.length - visible.length;

  const tail =
    visitors.length === 1 ? "is writing a snippet…" : "are writing snippets…";

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 pt-1 text-xs text-muted-foreground">
      {visible.map((v, i) => (
        <span key={v.key} className="inline-flex items-center gap-1">
          <UserAvatar username={v.name} avatarUrl={v.avatarUrl} size="xs" />
          <span className="text-foreground/80">{v.name}</span>
          {i < visible.length - 1 || remaining > 0 ? <span aria-hidden>,</span> : null}
        </span>
      ))}
      {remaining > 0 ? (
        <span>
          and {remaining} {remaining === 1 ? "other" : "others"}
        </span>
      ) : null}
      <span>{tail}</span>
    </div>
  );
}
