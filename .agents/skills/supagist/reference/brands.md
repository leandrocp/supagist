# Brand presets

A brand is a complete recipe: syntax theme, font, canvas, frame, spacing,
corners, window style and header/footer defaults. Pass it with `--brand <id>`
(CLI) or `brand: "<id>"` (MCP). Flags you add override single settings and
keep the rest of the preset.

The live list is `npx supagist options --json` (`brands`) or MCP
`list_options`. The server owns it, so a brand can exist there before this
file mentions it. Never invent an id.

## Pick a brand from the project

Look up the project's dependencies (`package.json`, `pyproject.toml`,
`requirements.txt`, `Gemfile`, `mix.exs`, `go.mod`, `Cargo.toml`) in this
table, exact package names only. Don't guess from partial names or file
contents.

- Exactly one brand matches: use it.
- Several match: prefer the one the excerpt itself imports. Otherwise, ask or
  pick the product the post is about.
- None match, or the user named a theme, style or brand: follow the user. With
  no hint at all, render without `--brand` (the default `github_dark`).
- The user's words always beat the table. "Make it look like Stripe" means
  `--brand stripe` even in a Supabase project.

| Brand id           | Name             | Look  | Use for packages                                                                  |
| ------------------ | ---------------- | ----- | --------------------------------------------------------------------------------- |
| `supabase`         | Supabase         | dark  | `@supabase/supabase-js`, `@supabase/ssr`, `supabase` (Python), `supabase_flutter` |
| `vercel`           | Vercel           | dark  | `next`, `ai`, `@vercel/analytics`, `@vercel/functions`                            |
| `tailwind`         | Tailwind         | light | `tailwindcss`                                                                     |
| `resend`           | Resend           | dark  | `resend`, `@react-email/components`                                               |
| `stripe`           | Stripe           | dark  | `stripe`, `@stripe/stripe-js`                                                     |
| `github`           | GitHub           | dark  | `octokit`, `@octokit/rest`, `@actions/core`                                       |
| `openai`           | OpenAI           | dark  | `openai`                                                                          |
| `cloudflare`       | Cloudflare       | dark  | `wrangler`, `@cloudflare/workers-types`                                           |
| `linear`           | Linear           | dark  | `@linear/sdk`                                                                     |
| `cursor`           | Cursor           | dark  | None: only when the user asks for Cursor style                                    |
| `anthropic`        | Anthropic        | light | `@anthropic-ai/sdk`, `anthropic` (Python)                                         |
| `gemini`           | Gemini           | dark  | `@google/genai`, `google-genai` (Python)                                          |
| `perplexity`       | Perplexity       | dark  | None: only on request                                                             |
| `huggingface`      | Hugging Face     | light | `@huggingface/inference`, `@huggingface/transformers`, `transformers` (Python)    |
| `docker`           | Docker           | dark  | None: for a `Dockerfile` or Compose file excerpt, or on request                   |
| `clerk`            | Clerk            | dark  | `@clerk/nextjs`, `@clerk/clerk-react`                                             |
| `prisma`           | Prisma           | dark  | `prisma`, `@prisma/client`                                                        |
| `aws`              | AWS              | dark  | `aws-sdk`, `boto3`, any package in the `@aws-sdk` scope                           |
| `mintlify`         | Mintlify         | dark  | `mint` / `mintlify`, or a `docs.json` Mintlify site                               |
| `nuxt`             | Nuxt             | dark  | `nuxt`                                                                            |
| `auth0`            | Auth0            | dark  | `@auth0/nextjs-auth0`, `auth0`                                                    |
| `elevenlabs`       | ElevenLabs       | dark  | `@elevenlabs/elevenlabs-js`, `elevenlabs` (Python)                                |
| `firecrawl`        | Firecrawl        | dark  | `@mendable/firecrawl-js`, `firecrawl-py`                                          |
| `browserbase`      | Browserbase      | dark  | `@browserbasehq/sdk`, `@browserbasehq/stagehand`                                  |
| `triggerdev`       | Trigger.dev      | dark  | `@trigger.dev/sdk`                                                                |
| `flue`             | Flue             | light | None: only on request                                                             |
| `files-sdk`        | Files SDK        | light | None: only on request                                                             |
| `rivetkit`         | RivetKit         | dark  | `rivetkit`                                                                        |
| `plz`              | plz              | dark  | None: only on request                                                             |
| `lumis`            | Lumis            | light | any package in the `@lumis-sh` scope; light pages                                 |
| `lumis-dark`       | Lumis Dark       | dark  | Same packages as `lumis`, for dark pages                                          |
| `mdex-purple`      | MDEx Purple      | light | `mdex` (Elixir); light pages                                                      |
| `mdex-purple-dark` | MDEx Purple Dark | dark  | Same as `mdex-purple`, for dark pages                                             |

"Look" is the preset's appearance. When the image goes on a light page (many
READMEs and blogs) and a brand has a light and a dark variant, pick the one
that matches. Otherwise keep the preset and let the user ask for changes.

## Brand is not theme is not background

- `--brand supabase` is Supabase style. `--theme supabase-dark` is an old
  syntax palette and is not the brand.
- `--theme` changes syntax colours only. `--background` changes only the
  canvas behind the card (`none` removes it).
- Never quietly swap one for another. If the user asks for something the
  catalog doesn't have, say so and offer the closest real option.

Supabase, for reference: `github_dark`, Geist Mono, outer padding 32, inner
padding 16, corners 8, no line numbers, no window controls, header with the
filename at left, no footer, and a dark canvas with green lighting and a
bordered card. A plain dark card is not a Supabase render.
