import { getMySnippets } from "@/app/actions/get-my-snippets";
import Link from "next/link";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function MySnippets() {
  const snippets = await getMySnippets();
  if (!snippets.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-mono text-xs uppercase tracking-code-label text-muted-foreground">
        Your snippets
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {snippets.map((s) => (
          <li key={s.short_id}>
            <Link
              href={`/${s.slug}-${s.short_id}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-accent"
            >
              <span className="truncate font-mono font-medium">{s.filename}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {s.language ? (
                  <span className="rounded border border-border px-1.5 py-0.5 font-mono uppercase tracking-code-label">
                    {s.language}
                  </span>
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
