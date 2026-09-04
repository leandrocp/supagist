"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateGuestName } from "@/lib/presence-utils";
import { UserAvatar } from "@/components/user-avatar";

type PresenceUser = { key: string; name: string; avatarUrl?: string };

const MAX_AVATARS = 5;

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

  // Self ordered last so the lead name belongs to someone else when possible.
  const ordered = [...visitors].sort((a, b) => {
    if (a.key === selfKey) return 1;
    if (b.key === selfKey) return -1;
    return 0;
  });
  const stack = ordered.slice(0, MAX_AVATARS);
  const overflow = ordered.length - stack.length;

  const others = ordered.filter((v) => v.key !== selfKey);
  const lead = others[0] ?? ordered[0];
  const remainingAfterLead = ordered.length - 1;

  let label: ReactNode;
  if (visitors.length === 1) {
    // Just the viewer in the lobby.
    label = (
      <>
        <span className="text-foreground/80">{lead.name}</span>
        <span> is writing a snippet…</span>
      </>
    );
  } else if (remainingAfterLead === 1) {
    label = (
      <>
        <span className="text-foreground/80">{lead.name}</span>
        <span> and 1 other are writing snippets…</span>
      </>
    );
  } else {
    label = (
      <>
        <span className="text-foreground/80">{lead.name}</span>
        <span> and {remainingAfterLead} others are writing snippets…</span>
      </>
    );
  }

  return (
    <div
      data-testid="home-presence"
      className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
      title={ordered.map((v) => v.name).join(", ")}
    >
      <div className="flex -space-x-1.5">
        {stack.map((v) => (
          <UserAvatar
            key={v.key}
            username={v.name}
            avatarUrl={v.avatarUrl}
            size="xs"
            className="ring-2 ring-background"
          />
        ))}
        {overflow > 0 ? (
          <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold ring-2 ring-background">
            +{overflow}
          </div>
        ) : null}
      </div>
      {/* Avatars carry the signal on their own; the sentence is the first
          thing to go when the nav runs out of room on small screens. */}
      <span className="hidden truncate md:inline">{label}</span>
    </div>
  );
}
