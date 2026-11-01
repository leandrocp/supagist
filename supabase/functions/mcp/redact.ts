// Server-side secret redaction for MCP publishing. Patterns follow the
// provider token formats used by gitleaks' default ruleset, trimmed to
// high-confidence shapes so ordinary code is left alone.
//
// Each secret becomes a visible `[REDACTED:<kind>]` placeholder. Newlines inside
// a secret (private key bodies) are kept, so line numbers never shift. Callers
// get counts per kind, never the values.

export type RedactionSummary = { redacted: number; kinds: Record<string, number> };

type Rule = {
  kind: string;
  // Global regex. Group 1, when present, is the secret; otherwise the whole match.
  pattern: RegExp;
  accept?: (secret: string) => boolean;
};

// Values that are obviously references or examples, not credentials.
function isLiteralSecret(value: string) {
  const lower = value.toLowerCase();
  if (/\s/.test(value) || value.length < 8) return false;
  if (/^[\d.]+$/.test(value) || /^(.)\1+$/.test(value)) return false;
  if (/^[A-Za-z_$][\w$]*(\.[\w$]+)+$/.test(value)) return false; // settings.token
  return ![
    "${",
    "{{",
    "<",
    "redacted",
    "process.env",
    "os.environ",
    "getenv",
    "your",
    "example",
    "changeme",
    "change_me",
    "placeholder",
    "xxxx",
    "****",
    "...",
  ].some((marker) => lower.includes(marker));
}

const KEY_NAME =
  "[A-Za-z0-9_.-]*?(?:secret|password|passwd|pwd|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|auth[_-]?key|client[_-]?secret)";

const RULES: Rule[] = [
  {
    kind: "private_key",
    pattern:
      /-----BEGIN ((?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?)-----\n?([\s\S]*?)\n?-----END \1-----/g,
  },
  { kind: "aws_access_key", pattern: /\b((?:AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\b/g },
  {
    kind: "aws_secret_key",
    pattern:
      /aws_?secret_?(?:access_?)?key["']?\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})(?![A-Za-z0-9/+=])/gi,
  },
  { kind: "github_token", pattern: /\b(gh[pousr]_[A-Za-z0-9]{36,255})\b/g },
  { kind: "github_token", pattern: /\b(github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})\b/g },
  { kind: "stripe_key", pattern: /\b((?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,99})\b/g },
  { kind: "stripe_key", pattern: /\b(whsec_[A-Za-z0-9]{32,})\b/g },
  { kind: "slack_token", pattern: /\b(xox[abposr]-[A-Za-z0-9-]{10,})\b/g },
  {
    kind: "slack_webhook",
    pattern: /(https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+)/g,
  },
  { kind: "anthropic_key", pattern: /\b(sk-ant-[a-z]+\d{2}-[A-Za-z0-9_-]{32,})/g },
  { kind: "openai_key", pattern: /\b(sk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{40,})/g },
  { kind: "openai_key", pattern: /\b(sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20})\b/g },
  { kind: "supabase_secret_key", pattern: /\b(sb_secret_[A-Za-z0-9_-]{20,})/g },
  { kind: "supabase_access_token", pattern: /\b(sbp_[a-f0-9]{40})\b/g },
  // Covers Supabase anon/service_role keys and any other signed JWT.
  { kind: "jwt", pattern: /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g },
  { kind: "google_api_key", pattern: /\b(AIza[0-9A-Za-z_-]{35})(?![0-9A-Za-z_-])/g },
  { kind: "google_oauth_secret", pattern: /\b(GOCSPX-[A-Za-z0-9_-]{28})(?![A-Za-z0-9_-])/g },
  { kind: "google_oauth_token", pattern: /\b(ya29\.[0-9A-Za-z_-]{20,})/g },
  {
    // scheme://user:password@host — only the password is replaced.
    kind: "connection_string_password",
    // `[` keeps an earlier placeholder (https://[REDACTED:x]@host) from matching.
    pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@'"`[]+:([^\s@'"`/]+)@/gi,
    accept: (password) => !password.startsWith("$") && !password.includes("{"),
  },
  {
    kind: "bearer_token",
    pattern: /\bBearer\s+([A-Za-z0-9._~+/-]{20,}=*)/gi,
    accept: isLiteralSecret,
  },
  {
    // KEY = "value" / password: 'value' in any language.
    kind: "secret_assignment",
    pattern: new RegExp(`\\b${KEY_NAME}["']?\\s*(?::=|=|:)\\s*["'\`]([^"'\`\\n]+)["'\`]`, "gi"),
    accept: isLiteralSecret,
  },
  {
    // Unquoted values only when the name starts the line: .env, YAML, shell.
    kind: "secret_assignment",
    pattern: new RegExp(
      `^[ \\t]*(?:export[ \\t]+)?${KEY_NAME}[ \\t]*[=:][ \\t]*([^\\s"'\`#;,]+)`,
      "gim",
    ),
    accept: (value) => /\d/.test(value) && !/[()]/.test(value) && isLiteralSecret(value),
  },
];

export function redactSecrets(code: string): { code: string; summary: RedactionSummary } {
  const kinds: Record<string, number> = {};
  let text = code;
  for (const rule of RULES) {
    text = text.replace(rule.pattern, (match: string, ...args: unknown[]) => {
      const groups = args.slice(0, -2).filter((group) => typeof group === "string") as string[];
      // Private keys capture the label then the body; the body is the secret.
      const secret = rule.kind === "private_key" ? groups[1] : (groups[0] ?? match);
      if (!secret || (rule.accept && !rule.accept(secret))) return match;
      kinds[rule.kind] = (kinds[rule.kind] ?? 0) + 1;
      const placeholder = `[REDACTED:${rule.kind}]` + "\n".repeat(secret.split("\n").length - 1);
      const at = match.lastIndexOf(secret);
      return match.slice(0, at) + placeholder + match.slice(at + secret.length);
    });
  }
  const redacted = Object.values(kinds).reduce((sum, count) => sum + count, 0);
  return { code: text, summary: { redacted, kinds } };
}
