# Public Updates

`/updates` is a curated, public, read-only page linked from Support. It uses the
existing app theme and does not change navigation shells, billing, or accounts.

Edit `src/config/publicUpdates.ts` after each completed feature checkpoint.
Move an item to Live only after the exact production behavior is verified; record
that evidence in the private release checklist, not in the public content. Testing
means testing is actually underway. Planned dates are review dates, not deadlines.
Use literal human-readable calendar dates to avoid timezone conversion.

Never import the private TODO or publish emails, account/provider IDs, credentials,
repair logs, security findings, or evidence records. This page is intentionally not
an Admin CMS or a Submit an Idea form. Public plans are a curated subset of work.

Before publishing: run UpdatesPage, SupportPage, and publicRouteMetadata tests;
verify export metadata and public navigation; check desktop/mobile day/night on
staging, then deploy the same frontend revision and verify production. No backend
deployment or payment-verification setting changes are required for this page.

Hosting: keep the exact `/updates` rewrite to `/updates/index.html` before the
existing catch-all rewrite in both Render services. This serves the generated
page metadata to direct requests, not just after client-side navigation. Verify
an unauthenticated HTTP request as well as the browser title after hydration.
