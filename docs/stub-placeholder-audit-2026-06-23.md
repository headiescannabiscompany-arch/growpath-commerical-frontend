# Stub And Placeholder Audit

Date reviewed: 2026-06-23
Repository: growpath-commerical-frontend

## Fixed In This Pass

- Replaced the `useWebhooks` compile stub with a real shared-client API module and React Query hook.
- Wired `WebhooksScreen` to loading, error, empty, create, update, delete, and saving states.
- Replaced static demo data in `VendorAnalyticsScreen` with API-backed vendor analytics and order loading.
- Replaced static demo data in `VendorMetricsScreen` with API-backed metrics, soil mixes, equipment, and mix creation.
- Replaced fake facility vendor dashboard analytics with values derived from real facility vendor records.
- Fixed vendor analytics and metrics API paths so they call `/api/vendors/...`.
- Removed dead frontend-repo backend shim files that contained demo/stub routes and old backup AI handlers.
- Replaced Content Marketplace static sales, analytics, and upload success flows with API-backed runtime state.
- Mounted and verified the backend `/api/marketplace` surface for browse, create, publish, analytics, download, and purchase counters.
- Added backend webhook endpoint coverage for list, create, update, and delete.
- Replaced the backend guild browse stub with DB-backed canonical `/api/guilds` routes and membership synchronization.
- Mounted subscription, legacy subscribe-status/trial, IAP verification, and facility-billing routers used by the frontend.
- Blocked direct fake paid subscription activation; paid access now requires checkout webhook or verified in-app purchase.

## Active Product Gaps Still To Finish

- Marketplace upload still accepts URL-based assets only. If native file uploads are required before release, add picker/storage integration and backend media validation.
- Webhook delivery execution is still a release-hardening gap: retry policy, delivery logs, secret rotation UX, and audit views should be completed before exposing webhooks broadly.
- Vendor analytics/metrics endpoints are now present for the frontend contract, but need seeded/live vendor data validation before calling the vendor portal release-ready.
- Store submission remains blocked on external credentials, production builds, screenshots, legal sign-off, and final app-name/identifier confirmation.

## Release And Store Gaps

- Final store-facing app name remains unconfirmed: `app.json` says `GrowPath Commercial`, while listing copy says `GrowPath AI`.
- Final iOS bundle identifier and Android package must be confirmed in App Store Connect and Google Play Console.
- Production public domain ownership must be confirmed before enabling Android App Links or iOS Associated Domains.
- `EXPO_PUBLIC_TWITCH_PARENT_HOST` must be set for production builds if Twitch embeds ship.
- Real Apple and Google submit credentials must be provided outside source control.
- Production EAS iOS and Android builds must be created and attached as evidence.
- iOS and Android screenshots, feature graphics, privacy URL, support URL, release notes, age rating, data safety, pricing, and review notes need release-owner/legal sign-off.
- Physical-device smoke validation must cover authentication, Personal, Commercial, Facility, payments status, permissions, image upload, notifications, offline/error states, and logout.

## Scan Notes

- Test mocks in Jest and Playwright are expected and were not counted as product placeholders unless they hide skipped/unimplemented behavior.
- UI image placeholders for missing plant photos are valid empty states and were not counted as unfinished work.
- `tmp/`, `test-results/`, and `playwright-report/` are ignored runtime evidence/output folders.
