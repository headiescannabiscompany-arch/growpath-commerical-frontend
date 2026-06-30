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
- Validated vendor analytics, metrics, soil mixes, equipment, and order screens against seeded backend response envelopes; fixed the mobile vendor metrics mix form layout.
- Removed dead frontend-repo backend shim files that contained demo/stub routes and old backup AI handlers.
- Replaced Content Marketplace static sales, analytics, and upload success flows with API-backed runtime state.
- Added picker-based Marketplace content and thumbnail uploads; selected files are persisted before the draft is saved.
- Added webhook signing-secret creation/rotation, signed test delivery, and delivery-log visibility to the app webhook management surface.
- Added automatic signed webhook dispatch for facility task assignment, overdue task, and team invite events.
- Added automatic signed webhook dispatch for compliance-required and compliance-missed log events; hid the automation webhook option until a real automation trigger producer exists.
- Mounted and verified the backend `/api/marketplace` surface for browse, create, publish, analytics, download, and purchase counters.
- Added backend webhook endpoint coverage for list, create, update, and delete.
- Replaced the backend guild browse stub with DB-backed canonical `/api/guilds` routes and membership synchronization.
- Mounted subscription, legacy subscribe-status/trial, IAP verification, and facility-billing routers used by the frontend.
- Blocked direct fake paid subscription activation; paid access now requires checkout webhook or verified in-app purchase.

## Active Product Gaps Still To Finish

- Automation webhook dispatch still needs a real automation trigger producer before exposing `AUTOMATION_TRIGGERED` broadly.
- Store submission remains blocked on external credentials, production builds, screenshots, legal sign-off, and final app-name/identifier confirmation.

## Release And Store Gaps

- Final store-facing app name is confirmed as `GrowPath`.
- Final iOS bundle identifier and Android package must be confirmed in App Store Connect and Google Play Console.
- Production public domain ownership must be confirmed before enabling Android App Links or iOS Associated Domains.
- `EXPO_PUBLIC_TWITCH_PARENT_HOST` is optional for V1 live cards because Twitch opens externally; set it only if embeds ship.
- Real Apple and Google submit credentials must be provided outside source control.
- Production EAS iOS and Android builds must be created and attached as evidence.
- iOS and Android screenshots, feature graphics, privacy URL, support URL, release notes, age rating, data safety, pricing, and review notes need release-owner/legal sign-off.
- Physical-device smoke validation must cover authentication, Personal, Commercial, Facility, payments status, permissions, image upload, notifications, offline/error states, and logout.

## Scan Notes

- Test mocks in Jest and Playwright are expected and were not counted as product placeholders unless they hide skipped/unimplemented behavior.
- UI image placeholders for missing plant photos are valid empty states and were not counted as unfinished work.
- `tmp/`, `test-results/`, and `playwright-report/` are ignored runtime evidence/output folders.
