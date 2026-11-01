import type { CSSProperties } from "react";
import Link from "next/link";
import { SnippetOwnerActions } from "@/components/snippet-owner-actions";
import type { SnippetSummary } from "@/app/actions/get-my-snippets";
import { languageDisplayName } from "@/lib/snippet-utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Grid of the viewer's snippets (site spec §4, "Snippet list item"): a quiet
 * panel holding the snippet's own publish-time render, then the filename in
 * Plex with the language on the right, and the date and views below.
 * Purely presentational so the page owns headings and empty states.
 */
export function SnippetList({ snippets }: { snippets: SnippetSummary[] }) {
  return (
    <ul className="grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
      {snippets.map((s, index) => (
        <li
          key={s.short_id}
          data-snippet-card={s.id}
          className="rise-in relative"
          style={{ "--i": index } as CSSProperties}
        >
          <Link
            href={`/${s.slug}-${s.short_id}`}
            className="group flex flex-col gap-3 rounded-[18px] focus-visible:focus-ring"
          >
            <span className="flex aspect-[427/190] items-center justify-center overflow-hidden rounded-[18px] bg-surf2 p-6 transition-colors group-hover:bg-surf3">
              {s.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- Storage CDN render, already sized
                <img
                  src={s.thumbnail_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="max-h-full max-w-full object-contain"
                />
              ) : null}
            </span>
            <span className="flex items-baseline justify-between gap-3 px-0.5">
              <span className="truncate font-mono text-[15px] font-medium text-foreground">
                {s.title ?? s.filename}
              </span>
              {s.language ? (
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {languageDisplayName(s.language)}
                </span>
              ) : null}
            </span>
            <span className="-mt-2 px-0.5 text-sm tabular-nums text-muted-foreground">
              {formatDate(s.created_at)}
              {s.view_count > 0 ? ` · ${s.view_count.toLocaleString()} views` : null}
            </span>
          </Link>
          {/* Outside the link so opening the menu never navigates. */}
          <div className="absolute top-2 right-2">
            <SnippetOwnerActions
              snippetId={s.id}
              name={s.title ?? s.filename}
              variant="menu"
              afterDelete="refresh"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
