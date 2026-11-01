"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateGuestName } from "@/lib/presence-utils";
import { UserAvatar } from "@/components/user-avatar";

type Author = { id: string; username: string; avatar_url: string } | null;
type PresenceUser = { key: string; name: string; avatarUrl?: string; line?: number | null };

/** Who else is looking at each line: line number → viewers (never yourself). */
export type PresenceLines = Record<number, Array<{ key: string; name: string }>>;

type Props = {
  snippetId: string;
  author: Author;
  textColor: string;
  /** Set by this component: call it with the line you are looking at (or null). */
  trackLineRef?: React.RefObject<((line: number | null) => void) | null>;
  /** Called with the lines other viewers are looking at. */
  onLinesChange?: (lines: PresenceLines) => void;
};

/** A leaving avatar stays a little past its 220 ms exit (globals.css .avatar-leave). */
const LEAVE_MS = 260;

export function SnippetPresenceInline({
  snippetId,
  author,
  textColor,
  trackLineRef,
  onLinesChange,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [visitors, setVisitors] = useState<PresenceUser[]>([]);
  // Viewers who just left stay a moment so their avatar can shrink away.
  const [leaving, setLeaving] = useState<PresenceUser[]>([]);
  const visitorsRef = useRef<PresenceUser[]>([]);
  const onLinesChangeRef = useRef(onLinesChange);
  useEffect(() => {
    onLinesChangeRef.current = onLinesChange;
  }, [onLinesChange]);

  useEffect(() => {
    let isActive = true;

    async function init() {
      const existingChannel = channelRef.current;
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
        channelRef.current = null;
      }

      const { data } = await supabase.auth.getUser();
      if (!isActive) return;

      const user = data?.user;
      const presenceKey = user?.id ?? crypto.randomUUID();
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

      const channel = supabase.channel(`snippet-presence:${snippetId}`, {
        config: { presence: { key: presenceKey } },
      });
      channelRef.current = channel;

      type PresencePayload = {
        online_at: string;
        name: string;
        avatar_url?: string;
        line?: number | null;
      };
      const presence = {
        online_at: new Date().toISOString(),
        name: username ?? guestName,
        avatar_url: avatarUrl,
      };

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<PresencePayload>();
          const users: PresenceUser[] = Object.entries(state).map(([key, presences]) => {
            const p = presences[0];
            return {
              key,
              name: p?.name ?? generateGuestName(key),
              avatarUrl: p?.avatar_url,
              line: p?.line ?? null,
            };
          });
          const gone = visitorsRef.current.filter((v) => !users.some((u) => u.key === v.key));
          visitorsRef.current = users;
          setVisitors(users);
          if (gone.length) {
            setLeaving((prev) => [...prev, ...gone]);
            setTimeout(() => {
              setLeaving((prev) => prev.filter((v) => !gone.some((g) => g.key === v.key)));
            }, LEAVE_MS);
          }

          const lines: PresenceLines = {};
          for (const user of users) {
            if (user.key === presenceKey || typeof user.line !== "number") continue;
            (lines[user.line] ??= []).push({ key: user.key, name: user.name });
          }
          onLinesChangeRef.current?.(lines);
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED") return;
          await channel.track(presence);
          if (trackLineRef) {
            trackLineRef.current = (line) => void channel.track({ ...presence, line });
          }
        });
    }

    void init();

    // Closing a tab doesn't unmount React, so the cleanup below never runs in
    // that path. Without an explicit untrack the WS sometimes lingers long
    // enough that other clients keep seeing the closed tab as a viewer until
    // the server-side heartbeat times out (~60s). pagehide fires reliably on
    // tab close and lets us flush the leave message before the socket dies.
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
      if (trackLineRef) trackLineRef.current = null;
      if (ch) {
        void ch.untrack();
        void supabase.removeChannel(ch);
      }
    };
  }, [supabase, snippetId, trackLineRef]);

  const visible = visitors.slice(0, 6);
  const overflow = visitors.length - visible.length;
  const leavingVisible = leaving.filter((v) => !visitors.some((u) => u.key === v.key));

  return (
    <>
      {author ? (
        <Link
          href={`https://github.com/${author.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          style={{ color: textColor }}
        >
          <UserAvatar username={author.username} avatarUrl={author.avatar_url} size="xs" />
          <span>@{author.username}</span>
        </Link>
      ) : null}

      {visitors.length > 0 ? (
        <div className="ml-auto flex items-center gap-1.5">
          <span className="opacity-60">
            {visitors.length === 1 ? "1 viewer" : `${visitors.length} viewers`}
          </span>
          <div className="flex -space-x-1">
            {visible.map((v) => (
              <UserAvatar
                key={v.key}
                username={v.name}
                avatarUrl={v.avatarUrl}
                size="xs"
                className="avatar-join ring-1 ring-background"
              />
            ))}
            {leavingVisible.map((v) => (
              <UserAvatar
                key={`leaving-${v.key}`}
                username={v.name}
                avatarUrl={v.avatarUrl}
                size="xs"
                className="avatar-leave ring-1 ring-background"
              />
            ))}
            {overflow > 0 && (
              <div className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground ring-1 ring-background">
                +{overflow}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
