# App Store / Deployment Prep Checklist

## 1. App Store Assets

- [ ] Screenshots for all device sizes (iOS, Android)
- [ ] App icons (all required resolutions)
- [ ] Feature graphics (Google Play)
- [ ] App descriptions (short and long)
- [ ] Keywords (App Store Optimization)
- [ ] Privacy policy URL
- [ ] Support/contact URL

## 2. Metadata & Configuration

- [ ] Complete app.json (name, slug, version, orientation, icon, splash, platforms, privacy, etc.)
- [ ] Set bundle identifiers (iOS) and package names (Android)
- [ ] Configure permissions (camera, notifications, etc.)
- [ ] Add privacy policy to app and store listing

## 3. Production Builds

- [ ] Run `eas build --profile production --platform ios`
- [ ] Run `eas build --profile production --platform android`
- [ ] Download and test builds on real devices
- [ ] Validate all features and entitlements in production mode

## 4. Store Submission

- [ ] Fill out all app store forms (App Store Connect, Google Play Console)
- [ ] Upload production builds
- [ ] Add release notes and version info
- [ ] Submit for review

## 5. Post-Submission

- [ ] Monitor for approval or feedback
- [ ] Prepare for hotfixes or resubmission if needed
- [ ] Announce launch to users
