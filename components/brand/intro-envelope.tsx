"use client";

import { useLayoutEffect, useRef } from "react";
import { INTRO_PLAYED_KEY } from "@/lib/motion";

/**
 * The home intro's small sealed envelope (Envelope B). On the first view of
 * the session it arrives and its R3 seal stamps in; the composer presses the
 * seal again on the first edit (pressIntroSeal). globals.css (".intro-env")
 * does every movement; this only marks later views as already played.
 * Decorative: the h1 says it.
 */
export function IntroEnvelope() {
  const ref = useRef<HTMLDivElement>(null);
  const decided = useRef(false);

  // Client-side navigation back to the home page: settle before paint. The
  // inline script below does the same for a full page load in this session.
  useLayoutEffect(() => {
    if (decided.current) return;
    decided.current = true;
    try {
      if (window.sessionStorage.getItem(INTRO_PLAYED_KEY)) {
        ref.current?.setAttribute("data-played", "");
      } else {
        window.sessionStorage.setItem(INTRO_PLAYED_KEY, "1");
      }
    } catch {
      // Without storage the intro simply plays on each view.
    }
  }, []);

  return (
    // Phones show it at 0.8; the scale sits on this wrapper so the motion's
    // own transforms compose with it.
    <div className="max-sm:-my-2 max-sm:scale-80">
      <div
        ref={ref}
        aria-hidden="true"
        data-testid="intro-envelope"
        className="intro-env"
        suppressHydrationWarning
      >
        <span className="intro-env-body">
          <img src="/brand/envelope-b.svg" alt="" width={132} height={80} className="dark:hidden" />
          <img
            src="/brand/envelope-b-dark.svg"
            alt=""
            width={132}
            height={80}
            className="hidden dark:block"
          />
        </span>
        <span className="intro-seal">
          <img src="/brand/seal-r3-240.png" alt="" width={40} height={40} />
          <span className="intro-seal-ripple" />
        </span>
      </div>
      <script
        // Runs before first paint, so a reload in the same session shows the
        // envelope settled instead of cutting its animation short.
        dangerouslySetInnerHTML={{
          __html: `try{sessionStorage.getItem(${JSON.stringify(INTRO_PLAYED_KEY)})&&document.querySelector(".intro-env").setAttribute("data-played","")}catch(e){}`,
        }}
      />
    </div>
  );
}
