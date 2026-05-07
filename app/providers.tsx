"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();

    async function ensureSession() {
      // getSession() is safe on the client — session comes from localStorage.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        // First visit: create an anonymous session so every visitor has a
        // stable auth.uid() for presence, reactions, and identity linking.
        await supabase.auth.signInAnonymously();
      }
    }

    void ensureSession();
  }, []);

  return <>{children}</>;
}
