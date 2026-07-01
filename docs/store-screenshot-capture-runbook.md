# Store Screenshot Capture Runbook

Status: capture procedure is defined. Screenshots must still be captured from
validated production builds before store submission.

## Required Device Classes

Capture from the production iOS and Android builds after physical-device smoke
passes.

| Store target | Required evidence variable | Notes |
| --- | --- | --- |
| iPhone 6.7 inch | `GROWPATH_SCREENSHOT_IOS_67` | Current large iPhone class accepted by App Store Connect |
| iPhone 6.5 inch | `GROWPATH_SCREENSHOT_IOS_65` | Required when App Store Connect requests 6.5 inch assets |
| iPad 12.9 inch | `GROWPATH_SCREENSHOT_IPAD_129` | Use tablet layout, not scaled phone screenshots |
| Android phone | `GROWPATH_SCREENSHOT_ANDROID_PHONE` | Google Play phone screenshots |
| Android tablet | `GROWPATH_SCREENSHOT_ANDROID_TABLET` | Google Play tablet screenshots |

## Required Scenes

Use real production-build screens and avoid test-only overlays, debug banners,
fake notifications, or unsupported feature claims.

1. Login or legal positioning screen.
2. Personal Home with active grow summary, tasks, logs, alerts, and photos.
3. Grow log detail or new log with environment fields and photo attachment.
4. AI-assisted plant insight screen with educational/disclaimer positioning.
5. Tools or export screen showing grow record utility.
6. Course/community screen if included in the submitted build.
7. Commercial or Facility dashboard if included in the submitted build.

## File Convention

Store screenshots under ignored release evidence, then attach them to the
release packet:

```text
tmp/spec/store-screenshots/ios-67/
tmp/spec/store-screenshots/ios-65/
tmp/spec/store-screenshots/ipad-129/
tmp/spec/store-screenshots/android-phone/
tmp/spec/store-screenshots/android-tablet/
```

Use short scene filenames:

```text
01-login.png
02-personal-home.png
03-grow-log-photo.png
04-ai-insight.png
05-tools-export.png
06-course-community.png
07-facility-commercial.png
```

## Evidence Recording

After screenshots are captured and reviewed, record the evidence paths:

```powershell
npm.cmd run release:record-evidence -- --template screenshots
```

Fill each environment variable with the corresponding screenshot directory or
release-packet artifact path, then run the printed command. The go/no-go gate
requires `tmp/spec/store-screenshots/` evidence with status `passed`.

## Review Criteria

- Screenshots come from production builds, not local web export.
- No debug menus, browser chrome, simulator controls, or test IDs are visible.
- Text is legible and not clipped.
- Cannabis/legal positioning matches approved copy.
- No personal data from a real user is visible.
- AI output is framed as educational guidance, not guaranteed diagnosis.
