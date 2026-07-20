"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function Providers({
  children,
  enableSupabaseSession = true,
}: {
  children: React.ReactNode;
  enableSupabaseSession?: boolean;
}) {
  useEffect(() => {
    if (!enableSupabaseSession) return;

    const supabase = createClient();

    async function ensureAnonymousSession() {
      // getSession() is safe on the client — session comes from localStorage.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        // Every visitor gets a stable auth.uid() for presence and reactions.
        await supabase.auth.signInAnonymously();
      }
    }

    void ensureAnonymousSession();

    // The root client boundary can survive a logout navigation, so its mount
    // effect does not necessarily run again. Re-bootstrap visitor identity on
    // SIGNED_OUT instead of leaving presence and reactions without auth.uid().
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && !session) {
        void supabase.auth.signInAnonymously();
      }
    });

    return () => subscription.unsubscribe();
  }, [enableSupabaseSession]);

  return <>{children}</>;
}
