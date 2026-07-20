# Security Policy

## Dependency audit policy

CI runs `npm run audit:prod` and fails on high or critical production dependency advisories. Moderate advisories require a documented review here until an upstream patch is available.

### Accepted temporary advisory: nested PostCSS in Next.js

- **Advisory:** [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
- **Affected transitive package:** `next@16.2.10 > postcss@8.4.31`
- **Reviewed:** 2026-07-16
- **Status:** Temporarily accepted; Next.js 16.2.10 is the current patched/latest release and pins this nested PostCSS version.
- **Exposure assessment:** The vulnerable behavior requires stringifying attacker-controlled CSS containing a closing `</style>` sequence. Supagist does not accept, transform, or stringify user-provided CSS through PostCSS. User snippets are rendered as escaped/highlighted code text; build-time PostCSS inputs are trusted repository stylesheets.
- **Compensating controls:** User code is escaped before rendering, HTML-producing paths have regression tests, and a production CSP is part of the release hardening plan.
- **Removal condition:** Upgrade Next.js as soon as it ships with PostCSS 8.5.10 or newer, then remove this exception after `npm audit --omit=dev` is clean.

## Reporting

Do not open a public issue for a suspected vulnerability. Contact the repository owner privately with reproduction steps and affected versions.
