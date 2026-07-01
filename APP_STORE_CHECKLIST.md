# App Store And Production Launch Checklist

> Status: Blocked for submission until external release evidence is complete.
> Last reviewed: 2026-07-01

## 1. Release Gate

- [x] Static web workflow validation completed against the live backend for required Personal, Commercial, and Facility flows.
- [x] Backend schema and AI drift validation evidence recorded.
- [x] Source-controlled placeholder EAS submit credentials removed.
- [x] Production EAS profile points at `https://api.growpathai.com`.
- [x] Confirm production DNS and backend health for `https://api.growpathai.com`.
- [x] Current local release scan, focused unit checks, production web export,
      privacy/Home Playwright checks, and personal core-loop Playwright check
      pass. Repeatable command: `npm.cmd run release:preflight`. Evidence:
      `docs/release-readiness-evidence-2026-07-01.md`.
- [ ] Confirm no critical or high release-blocking bugs remain open after
      release-machine checks.

## 2. Store Configuration

- [x] App display name in source: `GrowPath`.
- [x] iOS bundle identifier in source: `com.growpathai.app`.
- [x] Android package in source: `com.growpathai.app`.
- [x] Version in source: `1.0.0`.
- [x] Custom URL scheme in source: `growpath`.
- [ ] Confirm App Store Connect app record matches the bundle identifier.
- [ ] Confirm Google Play Console app record matches the Android package.
- [ ] Confirm public deep-link domain ownership before enabling App Links or Associated Domains.

## 3. Store Metadata

- [x] Draft listing copy exists in `APP_STORE_LISTING.md`.
- [x] Draft support URL: `https://www.growpathai.com/support`.
- [x] Draft privacy URL: `https://www.growpathai.com/privacy`.
- [x] Draft marketing URL: `https://www.growpathai.com`.
- [ ] Legal approval for cannabis-related language.
- [ ] Release-owner approval for final app name, subtitle, keywords, age rating, and review notes.
- [ ] Confirm support, privacy, terms, delete-account, marketing, and API health
      URLs are live from a release machine with working TLS.
- [ ] Complete iOS privacy nutrition labels.
- [ ] Complete Google Play data safety form.
- [x] Source-derived privacy/data-safety answer set exists at
      `docs/store-privacy-data-safety-2026-07-01.md`.

## 4. Assets

- [x] Source icon asset exists at `assets/icon.png`.
- [x] Source splash/white mark asset exists at `assets/icon-white.png`.
- [x] Source banner asset exists at `assets/banner.png`.
- [x] Export final App Store icon package from source brand assets. Evidence:
      `docs/store-assets-evidence-2026-07-01.md`.
- [x] Export Google Play feature graphic. Evidence:
      `docs/store-assets-evidence-2026-07-01.md`.
- [ ] Capture iPhone 6.7 inch screenshots.
- [ ] Capture iPhone 6.5 inch screenshots.
- [ ] Capture iPad 12.9 inch screenshots.
- [ ] Capture Android phone screenshots.
- [ ] Capture Android tablet screenshots.
- [ ] Optional: create app preview video.

## 5. Production Builds

- [ ] Run `eas build --profile production --platform ios`.
- [ ] Run `eas build --profile production --platform android`.
- [ ] Attach iOS build artifact evidence.
- [ ] Attach Android build artifact evidence.
- [ ] Upload iOS build to App Store Connect or TestFlight.
- [ ] Upload Android build to Google Play internal testing.

## 6. Real-Device Smoke Testing

- [ ] Launch app on a physical iOS device.
- [ ] Launch app on a physical Android device.
- [ ] Validate login, logout, and token expiration behavior.
- [ ] Validate Personal grow logs and AI-assisted insight flows.
- [ ] Validate Commercial storefront, products, inventory, orders, links, campaigns, and courses.
- [ ] Validate Facility rooms, batch cycles, SOPs, tasks, reports, equipment, and audit logs.
- [ ] Validate payments/subscription status surfaces without granting access from frontend callbacks.
- [ ] Validate image upload and CSV export/share behavior.
- [ ] Validate offline, timeout, and unavailable-server states.
- [ ] Validate notification permission prompts and fallback states.

## 7. Compliance And Security

- [x] Placeholder submit credentials are not stored in `eas.json`.
- [ ] Confirm Apple and Google submit credentials are available only through trusted release machines or protected CI secrets.
- [ ] Confirm privacy policy and terms are hosted and accessible.
- [x] Confirm account deletion and data export support path is wired in-app.
      Evidence: profile privacy controls and
      `docs/store-privacy-data-safety-2026-07-01.md`.
- [x] Confirm no production secrets are committed. Evidence:
      `docs/release-secret-scan-evidence-2026-06-23.md`.
- [ ] Configure production `EXPO_PUBLIC_SENTRY_DSN`, verify crash capture in a
      production-like build, and confirm support/crash monitoring owners.
- [ ] Confirm geographic, legal, and age-rating decisions for cannabis references.

## 8. Submission

- [ ] Complete App Store Connect listing.
- [ ] Complete Google Play Console listing.
- [ ] Add demo account or review instructions if required.
- [ ] Confirm pricing and availability.
- [ ] Submit iOS build for review.
- [ ] Submit Android build for review.

## 9. Post-Submission

- [ ] Assign release monitoring owner.
- [ ] Assign support escalation owner.
- [ ] Assign crash monitoring owner.
- [ ] Prepare hotfix branch and rollback plan.
- [ ] Track review feedback and resubmission notes.

## Go / No-Go

Launch remains blocked until production builds, real-device smoke testing, store-console forms, legal approval, and named release-owner sign-off are complete.
