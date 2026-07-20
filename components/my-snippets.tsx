import { getMySnippets } from "@/app/actions/get-my-snippets";
import { Badge } from "@/components/ui/badge";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function MySnippets() {
  if (!hasEnvVars) return null;

  const snippets = await getMySnippets();
  if (!snippets.length) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">Your snippets</h2>
        <p className="text-sm text-foreground-lighter">Continue from your recent work.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {snippets.map((s) => (
          <li key={s.short_id}>
            <Link
              href={`/${s.slug}-${s.short_id}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface-100 px-4 py-3 text-sm transition-colors hover:border-brand/30 hover:bg-surface-200"
            >
              <span className="truncate font-mono font-medium">{s.filename}</span>
              <div className="flex items-center gap-2 text-xs tabular-nums text-foreground-muted">
                {s.language ? (
                  <Badge variant="outline" className="font-mono uppercase tracking-code-label">
                    {s.language}
                  </Badge>
                ) : null}
                <span>{formatDate(s.created_at)}</span>
                {s.view_count > 0 ? <span>{s.view_count.toLocaleString()} views</span> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
