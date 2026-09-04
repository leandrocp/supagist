# Supagist Development Guide

## NON-NEGOTIABLE: Tests Required For Every Change

**No fix, no feature, no refactor ships without a corresponding test. No exceptions.**

- A bug fix must have a test that fails before the fix and passes after.
- A new feature must have unit tests covering its logic and/or an E2E test covering its golden path.
- A refactor must not reduce existing test coverage.

If a change cannot be tested (e.g. pure CSS tweak), state that explicitly before making the change. Otherwise, write the test first or alongside the code — not after, not never.

This rule exists because untested changes have repeatedly broken working behavior.

## Validation Before Completing Any Task

After every code change, before reporting the task as done, run:

```bash
npm run lint    # oxlint — must produce 0 errors
npm test        # vitest — all 127+ tests must pass
```

If either command fails, fix the issue before finishing. Do not skip this step, do not report success while tests or lint are failing.

## Purpose

Build `supagist` as a `Next.js` app that dogfoods `Supabase Auth`, `Database`, `Storage`, `Realtime`, and likely `Edge Functions` and `Cron`, while using `Lumis` as the core syntax-highlighting engine.

## Source Of Truth

Before touching code in any area, check the current docs for that area.

- Supabase JavaScript reference: `https://supabase.com/docs/reference/javascript/introduction`
- Supabase Next.js quickstart: `https://supabase.com/docs/guides/getting-started/quickstarts/nextjs`
- Supabase SSR client setup: `https://supabase.com/docs/guides/auth/server-side/creating-a-client`
- Supabase local development and migrations: `https://supabase.com/docs/guides/getting-started/local-development`
- Supabase CLI getting started: `https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform&platform=macos`
- Supabase UI social auth block: `https://supabase.com/ui/docs/nextjs/social-auth`
- Lumis installation: `https://lumis.sh/docs/installation`
- Lumis React integration: `https://lumis.sh/docs/integrations/react`
- Lumis Next.js integration: `https://lumis.sh/docs/integrations/nextjs`
- Lumis themes: `https://lumis.sh/docs/themes`
- Lumis full WASM bundle: `https://www.npmjs.com/package/@lumis-sh/wasm-bundle-full`
- shadcn Next.js installation: `https://ui.shadcn.com/docs/installation/next`
- Official Next.js `with-supabase` example: `https://github.com/vercel/next.js/tree/canary/examples/with-supabase`

## Project Bootstrap Rules

Do not start from a blank `create-next-app` scaffold.

Use the official Supabase starter shape first:

```bash
npx create-next-app --example with-supabase
```

Equivalent commands from Supabase docs that reference the same starter are acceptable, but the project should end up matching the `with-supabase` example structure and conventions.

## Required App Conventions

- Use `Next.js` App Router.
- Use `TypeScript`.
- Keep `Tailwind CSS` enabled because `shadcn/ui` and Supabase UI blocks assume it.
- Prefer the official `with-supabase` starter structure over inventing a custom auth setup.
- Keep the `@/*` import alias.

## Supabase Conventions

Use the JavaScript client as much as possible.

Use the Supabase CLI for local project setup and local platform workflows.

- Prefer `@supabase/supabase-js` APIs for `Auth`, `Database`, `Storage`, and `Realtime`.
- Prefer typed client calls over hand-written REST requests when the client supports the feature.
- Prefer the official query builder, auth methods, storage methods, and realtime channel APIs over custom wrappers unless there is a clear product need.
- Add custom server code only where the app needs orchestration, security boundaries, or transaction-like publish flows.
- Prefer the installed `supabase` CLI over ad hoc local setup scripts when working with local Supabase services.

### Environment Variables

Use these names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not invent alternate env names unless there is a strong reason.

Do not commit secrets. Keep them in `.env.local` for the app and `.env` for local Supabase CLI substitution where needed.

### SSR Auth Shape

Follow the official SSR pattern:

- `lib/supabase/client.ts` for browser usage
- `lib/supabase/server.ts` for server usage
- `lib/supabase/proxy.ts` for session refresh logic
- root `proxy.ts` file that calls the Supabase proxy helper

Important:

- In server code, create a fresh Supabase client per request.
- Use the cookie-based `@supabase/ssr` setup from the docs.
- In auth-sensitive server code, prefer `supabase.auth.getClaims()` over trusting `getSession()`.
- Do not put the server client in a global variable.
- Keep the browser and server clients thin so most product code can call standard `supabase-js` methods directly.

### GitHub Auth

Use Supabase GitHub OAuth with PKCE.

- Use the Supabase UI social auth block as the starting reference.
- Expect callback handling via an auth route.
- For local CLI auth, GitHub callback is `http://localhost:54321/auth/v1/callback`.
- For hosted Supabase, use the callback URL shown in the provider settings.
- Prefer the standard `supabase.auth.signInWithOAuth()` flow and the documented code-exchange callback flow.

## Database And Migrations

`Next.js` does not manage database migrations. `Supabase` does.

Use the Supabase CLI workflow:

- Install and verify the CLI first with the official getting started guide and `which supabase`.
- `supabase init`
- `supabase start`
- `supabase migration new <name>`
- `supabase db reset`
- `supabase db push`

Rules:

- Keep schema changes in `supabase/migrations`.
- Prefer local development first, then push to the hosted project.
- Use `supabase/config.toml` for local provider configuration and local buckets when needed.
- Enable RLS on exposed tables and write explicit policies.
- Use generated database types with `supabase-js` once the schema stabilizes enough for app work.

### Product API Preference

When building `supagist`, prefer these client surfaces first:

- `supabase.auth.*` for login, logout, claims, and session exchange
- `supabase.from(...).select/insert/update/upsert` for database reads and writes
- `supabase.channel(...)` for presence and realtime subscriptions
- `supabase.storage.from(...).upload/getPublicUrl/remove` for snippet image assets

Do not introduce custom HTTP API routes for simple data access if `supabase-js` already covers the use case cleanly.

## Lumis Conventions

Use the right Lumis integration for the job.

- For live interactive React code blocks, use `@lumis-sh/react`.
- For server-rendered highlighted output, use `@lumis-sh/react/server`.
- For built-in themes, use `@lumis-sh/themes`.
- Use `@lumis-sh/wasm-bundle-full` as the default parser bundle for broad language coverage.
- For MDX, use `@lumis-sh/rehype-lumis` instead of custom wiring.

Important Lumis notes:

- JavaScript Lumis loads parser WASM at runtime.
- Do not guess package names; use the documented packages such as `@lumis-sh/lumis`, `@lumis-sh/react`, and `@lumis-sh/themes`.
- Prefer the full bundled WASM package over piecemeal language packages unless there is a measured reason to optimize bundle size later.
- Theme handling should follow Lumis docs, not ad hoc CSS hacks.

## UI Conventions

- Use `shadcn/ui` as the base component system. The shadcn skill is installed (`npx shadcn@latest`); always run `npx shadcn@latest docs <name>` and follow the rule files in `.claude/skills/shadcn/rules/` before composing UI by hand.
- Use Supabase UI blocks selectively where they fit, especially auth and realtime-oriented pieces.
- Preserve the project goal: lightweight, visual, code-first UI. Avoid generic dashboard styling.

### Required shadcn components (use these instead of hand-rolled markup)

When a UI need maps to one of these, use the shadcn component; do not roll a custom version.

| Need                                      | Component                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| User avatars (anywhere)                   | `Avatar` + `AvatarImage` + `AvatarFallback`                                        |
| Buttons                                   | `Button` (variants: default, outline, ghost, etc.)                                 |
| Grouped editor actions (Copy/Export/Save) | `ButtonGroup` so the actions read as a single segmented control                    |
| Emoji picker, hover toolbar, etc.         | `Popover` — handles viewport collision automatically, no manual portal positioning |
| Long scrolling areas (code editor body)   | `ScrollArea` — consistent custom scrollbar styling across browsers                 |
| Toasts / author notifications             | `sonner` — `toast()` from sonner, never a custom stacked-cards container           |
| Loading + saving spinners                 | `Spinner` — never a hand-rolled CSS animation                                      |
| Modals on desktop                         | `Dialog`                                                                           |
| Modals on mobile                          | `Drawer` — slide up from the bottom, full width                                    |

### Export modal: responsive Dialog ↔ Drawer

The export modal MUST be a `Dialog` on `md+` viewports and a `Drawer` on smaller viewports. The pattern: a single `ResponsiveModal` (or inline branch on `useMediaQuery`) renders `Dialog` above the `md` breakpoint and `Drawer` below it. The interior content is identical.

### Responsive design is required

Every page and editor must be usable on iPhone, iPad, and desktop. This means:

- No fixed pixel widths that exceed mobile viewports.
- Toolbars wrap or collapse into menus on narrow viewports.
- Inline overlays (popovers, drawers) must not be clipped by the viewport edge — use shadcn's `Popover` / `Drawer`, which handle collision detection.
- Touch targets ≥ 44px in any dimension.
- Always test the new feature at 375px wide (iPhone SE) before merging.

### Home composer and saved-view editor are siblings, not strangers

The two editor surfaces — `components/inline-code-block.tsx` (home composer)
and `app/[snippet]/snippet-annotations-view.tsx` (saved snippet) — must look,
feel, and work the same to a casual user. The only legitimate differences are
the behaviors specific to each page:

- The home composer has an editable textarea overlay; the saved view is read-only with a per-line grid.
- The saved view has multi-user reactions, presence, and chat-style comment threads; the home composer is single-user with a draft model.
- The home composer publishes via a Save action; the saved view doesn't.

**Everything else** must be visually identical: window chrome, toolbar layout,
status bar, floating PR-review-style hover toolbar, inline reaction chips at
the end of each line, gutter shape and spacing. If you change one, change the
other in the same commit.

### Never reuse the same emoji-picker / floating-overlay portal pattern

We previously used `createPortal(document.body)` with manual `getBoundingClientRect` math for the reaction picker. It clipped at the viewport edge and broke on mobile. Use `Popover` for any new overlay; do not regress to manual portals.

## Secret Handling

- Never write access tokens, secret keys, or OAuth secrets into tracked files.
- Never place `service_role` or secret keys in browser-exposed env vars.
- If a secret is pasted in chat, do not copy it into the repo.

## Working Style

- Research first when touching unfamiliar framework or product behavior.
- Prefer official examples over custom setup.
- Make the smallest correct change.
- Before starting a new implementation area, re-check the relevant docs because these projects change quickly.

## Testing — Required, Not Optional

Tests are mandatory. New features and bug fixes must ship with corresponding tests. A PR without tests for non-trivial behavior will be rejected.

### Test Stack

- **Unit / integration**: [Vitest](https://vitest.dev/) — fast, native ESM, TypeScript-first. Config in `vitest.config.ts`.
- **Component**: [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) on top of Vitest + jsdom.
- **E2E**: [Playwright](https://playwright.dev/) for full browser flows (auth, snippet creation, realtime annotations).

### What Must Be Tested

| Area                                               | Coverage Required                                           |
| -------------------------------------------------- | ----------------------------------------------------------- |
| Server actions (`app/actions/`)                    | All happy paths + validation errors                         |
| Utility functions (`lib/`)                         | Full branch coverage                                        |
| `parseSnippetParam` and URL slug logic             | All edge cases (too short, missing separator, bad short_id) |
| Lumis render helpers (`renderLines`, `escapeHtml`) | Correctness for known inputs                                |
| React components with logic                        | User interactions, conditional renders, error states        |
| RLS policies                                       | Integration tests against local Supabase                    |
| E2E golden paths                                   | Sign in, create snippet, view snippet, add annotation       |

### Rules

- **No mocking Supabase for integration tests.** Run against the local Supabase instance (`supabase start`). Mocking the DB hid a broken migration last time.
- Unit tests may mock external I/O (storage upload, WASM load) but must not mock the function under test.
- Test files live next to their subject: `lib/utils.test.ts`, `app/actions/snippets.test.ts`, `components/inline-code-block.test.tsx`.
- E2E tests live in `e2e/`.
- CI must pass all tests before merge.
- Coverage target: **80% line coverage** on `lib/` and `app/actions/`; no hard threshold on UI components, but critical interaction paths must have E2E coverage.

### Running Tests

```bash
npm run test       # Vitest single run (CI)
npm run test:watch # Vitest watch mode
npm run test:e2e   # Playwright E2E
npm run test:coverage # Coverage report
```

## Hard Rules — Never Break These

- **No regex for semantic detection.** Never use a regex to infer whether a theme is dark/light, guess a language, or classify user input. Use the authoritative API field (e.g. `ThemeData.appearance === "dark"`) or a typed lookup table instead.

## Export Rendering Notes

- Export images use real Lumis syntax highlighting via `highlighter.highlightIter` + `theme.highlights[scope].fg` for per-token colors.
- `theme.highlights["normal"].bg/fg` provides the editor background and default foreground.
- `lib/lumis-client.ts` is the shared browser-side WASM singleton. Import it dynamically inside async functions to prevent server-side evaluation.
- Carbon-style export layout: editor background fills the full image, traffic lights at top-left, no line numbers, no outer decorative background.

## Current Session Rule

Do not scaffold or implement the new app until this file is reviewed and accepted.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
