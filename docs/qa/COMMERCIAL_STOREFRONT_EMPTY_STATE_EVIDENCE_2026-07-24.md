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

## Products and Profile follow-up

- Frontend PR: `#186`
- Frontend merge SHA: `950f70f048112da2140c46c143620e044b362ec5`
- Render deployment: `dep-d9hfgeks728c73c03rbg`
- Render live timestamp: 2026-07-24 at 1:31 AM EDT
- Live retest timestamp: `2026-07-24T01:32:13-04:00`
- Account and workspace: `jcindc2003@yahoo.com`, Commercial
- Routes:
  - `https://growpathai.com/home/commercial/products?release=950f70f048112da2140c46c143620e044b362ec5&verify=products-url-guidance-live`
  - `https://growpathai.com/home/commercial/profile?release=950f70f048112da2140c46c143620e044b362ec5&verify=profile-url-guidance-live`

The next live review found `/store/your-brand-slug/products/product-id` rendered as
if it were a usable public product route. The same placeholder family also appeared
on Commercial Profile before the real storefront loaded.

PR `#186` removed those invented paths across both surfaces. Products now explains
that public detail URLs use the saved storefront slug and saved product ID. Profile
shows no storefront path until a real slug loads and explains that a saved,
published product is required before a detail URL exists.

Focused local verification passed 2 suites and 30 tests. Strict targeted ESLint and
`git diff --check` passed. GitHub Frontend CI run `30069417156` passed the complete
frontend gate. Render then listed exact merge `950f70f048112da2140c46c143620e044b362ec5`
live as `dep-d9hfgeks728c73c03rbg`.

The signed-in production Browser retest confirmed:

- Products still truthfully reports zero products.
- Products renders
  `Public product detail URLs use the saved storefront slug and the saved product ID.`
- Profile renders `Public storefront: Add a public slug to create this URL.`
- Profile renders
  `Public product detail: Add a public slug and save a product to create this URL.`
- Neither page contains `your-brand-slug` or `/products/product-id`.

Evidence types completed for this follow-up: local automated tests, GitHub CI,
Render deployment record, and signed-in production in-app Browser DOM inspection.
No screenshot or video artifact is claimed for the follow-up.

## Remaining Commercial work

The owner-supplied brand name, real public slug, logo, banner, description, grow
interests, website, support email, social links, products, checkout configuration,
courses, lives, and campaigns remain intentionally unset. They must not be
invented. Full Commercial authoring, publishing, checkout, orders, leads,
analytics, and public-user acceptance remain open.
