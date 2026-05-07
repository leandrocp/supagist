"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatAuthorNotification } from "@/lib/format-utils";

type SnippetIndex = {
  id: string;
  slug: string;
  short_id: string;
  filename: string;
};

const NOTIFICATION_TTL_MS = 6000;
// Realtime postgres_changes `=in.(...)` filters cap at 100 values. We don't
// expect a single user to own more snippets than that in v1; if they do we
// just subscribe to the first 100.
const MAX_SUBSCRIBED_SNIPPETS = 100;

/**
 * Listens for fresh comments and reactions on the current user's snippets and
 * surfaces them as sonner toasts. Driven by Postgres Changes — no polling,
 * no per-page subscription. Mounted once globally in app/layout.
 *
 * The component re-subscribes on every auth state change. Without that
 * hook, a visitor who arrives anonymous (or unauthenticated) and then signs
 * in later in the same SPA session never gets a postgres_changes channel —
 * the layout doesn't unmount on login, so a one-shot useEffect is stuck
 * with the pre-login state forever.
 */
export function NotificationsListener() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let cleanupChannel: (() => void) | null = null;
    // Track which subscribe() is the live one so a slow snippet-fetch
    // returning after a sign-out doesn't resurrect a stale channel.
    let subscribeId = 0;

    async function subscribeForCurrentUser() {
      // Tear down whatever was subscribed for the previous identity.
      cleanupChannel?.();
      cleanupChannel = null;

      const localId = ++subscribeId;
      const { data: claims } = await supabase.auth.getClaims();
      const userId = (claims?.claims?.sub as string | undefined) ?? null;
      const isAnonymous = claims?.claims?.is_anonymous === true;
      if (!userId || isAnonymous) return;
      if (cancelled || localId !== subscribeId) return;

      const { data: snippets } = await supabase
        .from("snippets")
        .select("id, slug, short_id, filename")
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(MAX_SUBSCRIBED_SNIPPETS);

      if (cancelled || localId !== subscribeId || !snippets?.length) return;

      const snippetById = new Map<string, SnippetIndex>(
        snippets.map((s) => [s.id, s as SnippetIndex]),
      );
      const filter = `snippet_id=in.(${Array.from(snippetById.keys()).join(",")})`;

      async function buildToast(args: {
        kind: "comment" | "reaction";
        snippetId: string;
        authorId: string;
        emoji?: string;
      }) {
        if (args.authorId === userId) return; // don't notify on your own actions
        const snippet = snippetById.get(args.snippetId);
        if (!snippet) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", args.authorId)
          .single();
        const text = formatAuthorNotification({
          kind: args.kind,
          username: profile?.username ?? "someone",
          filename: snippet.filename,
          emoji: args.emoji,
        });
        const href = `/${snippet.slug}-${snippet.short_id}`;
        toast(text, {
          duration: NOTIFICATION_TTL_MS,
          action: {
            label: "View",
            onClick: () => router.push(href),
          },
        });
      }

      const channel = supabase
        .channel(`author-notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "snippet_comments", filter },
          (payload) => {
            const row = payload.new as { snippet_id: string; author_id: string };
            void buildToast({
              kind: "comment",
              snippetId: row.snippet_id,
              authorId: row.author_id,
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "snippet_line_reactions", filter },
          (payload) => {
            const row = payload.new as {
              snippet_id: string;
              author_id: string;
              emoji: string;
            };
            void buildToast({
              kind: "reaction",
              snippetId: row.snippet_id,
              authorId: row.author_id,
              emoji: row.emoji,
            });
          },
        )
        .subscribe();

      cleanupChannel = () => {
        void supabase.removeChannel(channel);
      };
    }

    void subscribeForCurrentUser();

    // Auth flips to a real user (after email/password sign-in or after the
    // OAuth round-trip resolves) need to swap the subscription. SIGNED_OUT
    // and USER_DELETED tear it down without resubscribing.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void subscribeForCurrentUser();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      cleanupChannel?.();
    };
  }, [supabase, router]);

  return null;
}
