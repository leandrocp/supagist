import type { Metadata } from "next";
import { AppNav } from "@/components/app-nav";
import { HomeComposer } from "@/components/home-composer";

export const metadata: Metadata = {
  title: "Compose · Supagist",
  description: "The full Supagist editor, with every option for your code card.",
};

// The full editor: the home page's composer is a teaser, this one fills the
// viewport so the preview has room next to every setting. Both share the
// same localStorage draft.
export default function ComposePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-background lg:h-dvh">
      <AppNav showPresence />
      <section
        aria-label="Create a snippet"
        className="flex min-h-0 flex-1 flex-col px-5 pb-6 md:px-12 lg:pb-8"
      >
        <HomeComposer full />
      </section>
    </main>
  );
}
