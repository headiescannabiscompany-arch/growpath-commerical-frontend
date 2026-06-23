# Release Config Evidence

Date reviewed: 2026-06-23
Repository: growpath-commerical-frontend

## Confirmed In Source

- App display name: `GrowPath`
- Slug: `growpath`
- Version: `1.0.0`
- iOS bundle identifier: `com.growpathai.app`
- iOS build number: `1`
- Android package: `com.growpathai.app`
- Android version code: `1`
- Custom URL scheme: `growpath`
- iOS tablet support: enabled
- Android verified App Links: not configured
- iOS Associated Domains: not configured
- Production EAS profile: store distribution, Release build configuration, Android App Bundle
- Production API URL: `https://api.growpathai.com`
- Submit credentials: intentionally not stored in `eas.json`; see `docs/eas-submit-runbook.md`

## Confirmed Assets

- `assets/icon.png`: 1024x1024 PNG, used for Expo icon, iOS icon, Android adaptive foreground, and web favicon.
- `assets/icon-white.png`: 205x220 PNG, used as splash image on dark background.
- `assets/banner.png`: 1536x1024 PNG, available as a brand/login visual.

## Confirmed Permissions And Privacy Strings

- iOS photo library usage string is present.
- iOS camera usage string is present.
- iOS photo-library save usage string is present.
- Android permissions include camera and image/media read access.
- `expo-image-picker` plugin permission strings are present for photos and camera.

## Store Metadata Sources

- Support URL: `https://www.growpathai.com/support`
- Privacy URL: `https://www.growpathai.com/privacy`
- Marketing URL: `https://www.growpathai.com`
- Listing source: `APP_STORE_LISTING.md`
- Asset/copy draft source: `docs/app-store-asset-drafts.md`

## External Confirmation Still Required

- Store-facing app name is confirmed as `GrowPath`.
- iOS bundle identifier and Android package are confirmed as `com.growpathai.app`.
- Confirm production public domain ownership before enabling Android App Links or iOS Associated Domains.
- Confirm `https://api.growpathai.com` DNS and backend health before production builds. Current verification attempt failed because `api.growpathai.com` did not resolve.
- `EXPO_PUBLIC_TWITCH_PARENT_HOST` is optional for V1 because live sessions open Twitch externally; set it only if embedded Twitch playback ships.
- Confirm App Store Connect and Google Play Console records match the identifiers above.
- Confirm legal approval for cannabis-related listing language, age rating, and jurisdiction disclaimer.
