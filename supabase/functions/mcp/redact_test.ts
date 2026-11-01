import { strict as assert } from "node:assert";
import { redactSecrets } from "./redact.ts";

// Build fake tokens at runtime so no credential-shaped literal is committed
// (and push protection never mistakes a fixture for a leak).
function fake(
  prefix: string,
  length: number,
  alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGH23456789",
) {
  let out = prefix;
  for (let i = 0; i < length; i++) out += alphabet[(i * 7 + 3) % alphabet.length];
  return out;
}
const UPPER32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const HEX = "0123456789abcdef";

const secrets: Array<[string, string, string]> = [
  ["aws_access_key", `const id = "${fake("AKIA", 16, UPPER32)}";`, fake("AKIA", 16, UPPER32)],
  [
    "aws_secret_key",
    `aws_secret_access_key = ${fake("", 40, "abcdEFGH1234/+xyz")}`,
    fake("", 40, "abcdEFGH1234/+xyz"),
  ],
  ["github_token", `token: ${fake("ghp_", 36)}`, fake("ghp_", 36)],
  [
    "github_token",
    `git clone https://${fake("github_pat_", 22)}_${fake("", 59)}@github.com/a/b`,
    fake("github_pat_", 22),
  ],
  ["stripe_key", `Stripe(${JSON.stringify(fake("sk_live_", 24))})`, fake("sk_live_", 24)],
  [
    "slack_token",
    `slack.auth(${JSON.stringify(fake("xoxb-", 30, HEX + "-"))})`,
    fake("xoxb-", 30, HEX + "-"),
  ],
  ["openai_key", `new OpenAI({ apiKey: "${fake("sk-proj-", 48)}" })`, fake("sk-proj-", 48)],
  ["anthropic_key", `key = "${fake("sk-ant-api03-", 64)}"`, fake("sk-ant-api03-", 64)],
  ["supabase_secret_key", `createClient(url, "${fake("sb_secret_", 32)}")`, fake("sb_secret_", 32)],
  [
    "jwt",
    `const serviceRole = "${fake("eyJ", 20)}.${fake("eyJ", 40)}.${fake("", 43)}";`,
    fake("eyJ", 40),
  ],
  ["google_api_key", `maps.load({ key: "${fake("AIza", 35)}" })`, fake("AIza", 35)],
  [
    "connection_string_password",
    `DATABASE_URL=postgres://app:${fake("", 18)}@db.example.com:5432/app`,
    fake("", 18),
  ],
  [
    "bearer_token",
    `fetch(url, { headers: { Authorization: "Bearer ${fake("", 32)}" } })`,
    fake("", 32),
  ],
  ["secret_assignment", `STRIPE_WEBHOOK_SECRET=${fake("", 12)}9`, fake("", 12)],
  ["secret_assignment", `  password: "${fake("", 14)}!"`, fake("", 14)],
  ["secret_assignment", `const clientSecret = '${fake("", 20)}';`, fake("", 20)],
];

for (const [kind, line, value] of secrets) {
  Deno.test(`redacts ${kind}: ${line.slice(0, 40)}`, () => {
    const { code, summary } = redactSecrets(line);
    assert.ok(!code.includes(value), code);
    assert.ok(code.includes(`[REDACTED:${kind}]`), code);
    assert.equal(summary.kinds[kind], 1, JSON.stringify(summary));
    assert.equal(summary.redacted, 1, JSON.stringify(summary));
    assert.ok(!JSON.stringify(summary).includes(value));
  });
}

Deno.test("private key bodies are redacted without shifting line numbers", () => {
  const body = [fake("MIIE", 60), fake("", 64), fake("", 20)].join("\n");
  const input = `before\n-----BEGIN RSA PRIVATE KEY-----\n${body}\n-----END RSA PRIVATE KEY-----\nafter`;
  const { code, summary } = redactSecrets(input);
  assert.equal(code.split("\n").length, input.split("\n").length);
  assert.equal(
    code,
    "before\n-----BEGIN RSA PRIVATE KEY-----\n[REDACTED:private_key]\n\n\n-----END RSA PRIVATE KEY-----\nafter",
  );
  assert.deepEqual(summary, { redacted: 1, kinds: { private_key: 1 } });
});

Deno.test("mixed secrets keep the surrounding code and report each kind", () => {
  const aws = fake("AKIA", 16, UPPER32);
  const gh = fake("ghp_", 36);
  const input = `export const config = {\n  awsKeyId: "${aws}",\n  ghToken: process.env.GH_TOKEN ?? "${gh}",\n};`;
  const { code, summary } = redactSecrets(input);
  assert.equal(
    code,
    'export const config = {\n  awsKeyId: "[REDACTED:aws_access_key]",\n  ghToken: process.env.GH_TOKEN ?? "[REDACTED:github_token]",\n};',
  );
  assert.deepEqual(summary, { redacted: 2, kinds: { aws_access_key: 1, github_token: 1 } });
});

// Ordinary code that mentions secrets without containing one.
const clean = [
  `const apiKey = process.env.OPENAI_API_KEY;`,
  `API_KEY=\${API_KEY}`,
  `password: string;`,
  `const token = await getToken(user);`,
  `TOKEN = settings.token`,
  `<input type="password" name="password" />`,
  `password: "Password must be at least 8 characters"`,
  `const SECRET_KEY = "your-secret-key-here";`,
  `DATABASE_URL=postgres://user:\${DB_PASSWORD}@localhost/db`,
  `fetch(url, { headers: { Authorization: \`Bearer \${token}\` } })`,
  `max_tokens = 4096000000`,
  `const tokenizer = new Tokenizer("cl100k_base");`,
  `createClient(url, "${fake("sb_publishable_", 32)}")`,
  `const sha = "${fake("", 40, HEX)}";`,
  `const id = "${fake("", 36, HEX + "-")}";`,
  `git clone https://github.com/supabase/supabase.git`,
  `const skipped = "sk-learn"; import sklearn`,
  `-----BEGIN PUBLIC KEY-----`,
];

Deno.test("leaves ordinary code untouched", () => {
  for (const line of clean) {
    const { code, summary } = redactSecrets(line);
    assert.equal(code, line, `changed: ${line}`);
    assert.equal(summary.redacted, 0, line);
  }
});
