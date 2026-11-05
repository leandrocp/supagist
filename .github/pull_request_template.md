## What and why

<!-- What changed, and why. Link the issue if there is one. -->

## Checklist

- [ ] One focused change, with a plain commit message that says what changed and why
- [ ] Tests cover the change (a bug fix has a test that fails without it)
- [ ] `npm run lint`, `npm run fmt:check`, `npm run typecheck` and `npm test` pass
- [ ] UI changes: screenshots at desktop and 375px wide
- [ ] No secrets, and no migration without the maintainer's OK

## Brand preset

<!-- Only for a new brand preset (skills/supagist-add-brand). Delete otherwise. -->

- Sample card (PNG, and the 16:9 one):
- Logo source and licence:
- Where each colour came from:
- Theme and why:

- [ ] Preset appended last in `BRAND_PRESETS`; no other preset changed (digest test passes)
- [ ] Logo in `public/brands/` with its source in `public/brands/README.md`
- [ ] Row added to `skills/supagist/reference/brands.md`
- [ ] MCP Edge copy regenerated (`prepare-render.mjs`)
- [ ] Sample card rendered and checked
- [ ] Deno render tests pass
