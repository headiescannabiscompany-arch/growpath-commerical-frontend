# Commercial Storefront Empty-State Production Evidence

Date: 2026-07-24

## Release

- Frontend PR: `#184`
- Frontend merge SHA: `140e8ec4fa2d19b0bcf14995fae32e2bb9fbaf09`
- Render deployment: `dep-d9hf82j7uimc73dljipg`
- Production URL: `https://growpathai.com`
- Deploy trigger: automatic deployment from `main`
- Render live timestamp: 2026-07-24 at 1:13 AM EDT

## Account and route

- Account: `jcindc2003@yahoo.com`
- Workspace: Commercial
- Route:
  `https://growpathai.com/home/commercial/storefront?release=140e8ec4fa2d19b0bcf14995fae32e2bb9fbaf09&verify=storefront-slug-guard-live`
- Live retest timestamp: `2026-07-24T01:16:13-04:00`

## Finding

The zero-setup Commercial storefront reported `0 of 14 ready`, but its owner
shortcuts and Public Discovery section still exposed active public preview links
using the fabricated fallback `/store/your-brand`. The links looked usable even
though the owner had not supplied a public slug.

## Fix

- Public storefront paths are derived only from the saved, trimmed slug.
- View-as-user, public-store, product-line, and campaign line previews remain
  disabled until that slug exists.
- Disabled preview actions expose the reason to assistive technology and display
  `Add public slug first`.
- The Public Discovery URL field displays
  `Add a public slug to create the public store URL.` instead of a placeholder URL.
- The Commercial workflow method and app-readable method registry now prohibit
  invented public storefront slugs.

## Verification

- Focused local verification passed: 3 suites, 38 tests.
- The new empty-slug regression test passed without React `act(...)` warnings.
- Strict targeted ESLint and `git diff --check` passed.
- GitHub Frontend CI run `30068631085` passed Expo dependency checks, Expo Doctor,
  dependency audit, lint, sensitive-copy guard, Browser-workflow contract,
  delivery guard, and the full test stage.
- Render listed deployment `dep-d9hf82j7uimc73dljipg` as live for exact merge
  `140e8ec4fa2d19b0bcf14995fae32e2bb9fbaf09`.
- The signed-in in-app Browser retest rendered:
  - `View as User unavailable. Add a public slug first.` as disabled.
  - `View Public Store unavailable. Add a public slug first.` as disabled.
  - `Add a public slug to create the public store URL.`
  - no `/store/your-brand` link or URL.

Evidence types completed: local automated tests, GitHub CI, Render deployment
record, and signed-in production in-app Browser DOM inspection tied to the exact
SHA and URL.

Two Browser screenshot attempts timed out during capture. No screenshot or video
artifact is claimed by this record.

## Remaining Commercial work

The owner-supplied brand name, real public slug, logo, banner, description, grow
interests, website, support email, social links, products, checkout configuration,
courses, lives, and campaigns remain intentionally unset. They must not be
invented. Full Commercial authoring, publishing, checkout, orders, leads,
analytics, and public-user acceptance remain open.
