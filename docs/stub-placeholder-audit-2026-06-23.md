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

## Active Product Gaps Still To Finish

- Content marketplace sales and analytics tabs still contain hardcoded example earnings, downloads, ratings, sales rows, and chart rows. Finish by normalizing `getSalesData()` into summary, monthly series, recent sales, and per-upload analytics; remove all static money/download/rating values.
- Marketplace upload modal still behaves like a local success flow. Finish by collecting real form state, validating title/description/category/price/files, calling `uploadContent`, showing upload errors, and refreshing uploads after success.
- Backend webhook endpoints are not present in this frontend repo. The frontend now calls `/api/webhooks` and `/api/webhooks/:id`; backend must provide list, create, update, delete, auth, facility scoping, event validation, signature secret handling, delivery retries, and audit logs.
- Vendor analytics/metrics backend endpoints must support `/api/vendors/me/analytics`, `/api/vendors/me/orders`, `/api/vendors/me/metrics`, `/api/vendors/me/soil-mixes`, and `/api/vendors/me/equipment`, or the frontend route should be updated to the final authenticated-vendor contract.
- Source-controlled backend shim files still include demo/stub routes: `backend/stubbedRoutes.js`, `backend/routes/personal.js`, `backend/routes/commercial.js`, and `backend/fanoutNotifications.js`. These should be deleted from production wiring or replaced with database-backed route modules in the backend repository.
- `backend/routes/ai.call.backup.js` contains old TODO-backed AI handlers. Confirm it is excluded from runtime and tests, then remove it or archive it outside production source.
- Old Detox file `e2e/growLogs.e2e.js` still contains login TODO comments. Replace with real test-user login setup or remove it if Playwright is the canonical E2E suite.

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
