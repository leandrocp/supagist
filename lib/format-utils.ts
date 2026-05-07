/**
 * Build a one-line notification message for the author when someone reacts
 * or comments on one of their snippets.
 */
export function formatAuthorNotification(args: {
  kind: "comment" | "reaction";
  username: string;
  filename: string;
  emoji?: string;
}): string {
  const who = `@${args.username}`;
  if (args.kind === "comment") return `${who} commented on ${args.filename}`;
  const tail = args.emoji ? ` with ${args.emoji}` : "";
  return `${who} reacted${tail} on ${args.filename}`;
}

/**
 * Build a typing-indicator prefix like "@bob is" / "@bob and @carol are" /
 * "@bob, @carol and 2 others are". Caller appends " typing…".
 */
export function formatTypingNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `@${names[0]} is`;
  if (names.length === 2) return `@${names[0]} and @${names[1]} are`;
  return `@${names[0]}, @${names[1]} and ${names.length - 2} other${names.length - 2 === 1 ? "" : "s"} are`;
}

/**
 * Build a Slack-style "alice, bob and 3 others" line from a list of usernames.
 * Used for the reaction-chip tooltip so users can see who reacted with what
 * without opening a separate panel.
 */
export function formatReactorList(names: string[]): string {
  if (names.length === 0) return "no one";
  if (names.length === 1) return `@${names[0]}`;
  if (names.length === 2) return `@${names[0]} and @${names[1]}`;
  if (names.length === 3) return `@${names[0]}, @${names[1]} and @${names[2]}`;
  return `@${names[0]}, @${names[1]} and ${names.length - 2} others`;
}

/**
 * Friendly relative timestamp for comment threads.
 *
 * Returns a short string like "just now", "5m ago", "2h ago", "3d ago", or
 * a localized date for anything older than a week. The function takes an
 * optional `now` reference so it stays deterministic in tests.
 */
export function formatCommentTimestamp(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return "just now";

  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;

  return then.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
