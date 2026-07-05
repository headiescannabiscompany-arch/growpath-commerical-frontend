# Release Evidence Commands - 2026-07-05

Use these commands only after the named owner has verified the corresponding
release item. Generated JSON evidence is intentionally written under `tmp/spec/`
and is not committed.

## EAS Production Builds

First fix the Expo robot/token permission issue. The current `EXPO_TOKEN`
authenticates as `GrowPathAI Production Build Token (robot)`, but only has
`Viewer` role on `etgujays-organization`.

Then rerun `Production Build Preflight` failed jobs or run:

```powershell
$env:GROWPATH_PRODUCTION_BUILD_CONFIRM="BUILD_PRODUCTION_GROWPATH"
npm.cmd run release:builds -- --execute
```

Evidence target: `tmp/spec/release-builds/`.

## Data Rights Disposable Account

Use only a disposable account created for this release check.

```powershell
$env:GROWPATH_DATA_RIGHTS_API_URL="https://api.growpathai.com"
$env:GROWPATH_DATA_RIGHTS_EMAIL="<disposable-account-email>"
$env:GROWPATH_DATA_RIGHTS_PASSWORD="<disposable-account-password>"
$env:GROWPATH_DATA_RIGHTS_CONFIRM="DELETE_DISPOSABLE_ACCOUNT:<disposable-account-email>"
node scripts/verify-data-rights-live.cjs
```

Evidence target: `tmp/spec/data-rights-live/`.

## Monitoring

```powershell
$env:GROWPATH_RELEASE_EVIDENCE_CONFIRM="RECORD_RELEASE_EVIDENCE"
$env:GROWPATH_EVIDENCE_RECORDED_BY="<name-or-release-machine>"
$env:GROWPATH_SENTRY_EVENT_URL="<required>"
$env:GROWPATH_MONITORING_BUILD="<required>"
$env:GROWPATH_CRASH_OWNER="<required>"
$env:GROWPATH_TRIAGE_SLA="<required>"
npm.cmd run release:record-evidence -- monitoring
```

## Physical Device Smoke

```powershell
$env:GROWPATH_RELEASE_EVIDENCE_CONFIRM="RECORD_RELEASE_EVIDENCE"
$env:GROWPATH_EVIDENCE_RECORDED_BY="<name-or-release-machine>"
$env:GROWPATH_SMOKE_TESTER="<required>"
$env:GROWPATH_IOS_DEVICE="<required>"
$env:GROWPATH_ANDROID_DEVICE="<required>"
$env:GROWPATH_IOS_BUILD="<required>"
$env:GROWPATH_ANDROID_BUILD="<required>"
$env:GROWPATH_SMOKE_RESULT="passed"
npm.cmd run release:record-evidence -- device-smoke
```

## Store Screenshots

```powershell
$env:GROWPATH_RELEASE_EVIDENCE_CONFIRM="RECORD_RELEASE_EVIDENCE"
$env:GROWPATH_EVIDENCE_RECORDED_BY="<name-or-release-machine>"
$env:GROWPATH_SCREENSHOT_IOS_67="<required>"
$env:GROWPATH_SCREENSHOT_IOS_65="<required>"
$env:GROWPATH_SCREENSHOT_IPAD_129="<required>"
$env:GROWPATH_SCREENSHOT_ANDROID_PHONE="<required>"
$env:GROWPATH_SCREENSHOT_ANDROID_TABLET="<required>"
npm.cmd run release:record-evidence -- screenshots
```

## Store Submission

```powershell
$env:GROWPATH_RELEASE_EVIDENCE_CONFIRM="RECORD_RELEASE_EVIDENCE"
$env:GROWPATH_EVIDENCE_RECORDED_BY="<name-or-release-machine>"
$env:GROWPATH_IOS_APP_RECORD_CONFIRMED="yes"
$env:GROWPATH_ANDROID_APP_RECORD_CONFIRMED="yes"
$env:GROWPATH_IOS_PRIVACY_NUTRITION_COMPLETED="yes"
$env:GROWPATH_GOOGLE_DATA_SAFETY_COMPLETED="yes"
$env:GROWPATH_STORE_PRICING_CONFIRMED="yes"
$env:GROWPATH_REVIEW_NOTES_CONFIRMED="yes"
npm.cmd run release:record-evidence -- store-submission
```

## Legal Sign-Off

```powershell
$env:GROWPATH_RELEASE_EVIDENCE_CONFIRM="RECORD_RELEASE_EVIDENCE"
$env:GROWPATH_EVIDENCE_RECORDED_BY="<name-or-release-machine>"
$env:GROWPATH_LEGAL_APPROVER="<required>"
$env:GROWPATH_RELEASE_OWNER="<required>"
$env:GROWPATH_APPROVED_LISTING_VERSION="<required>"
$env:GROWPATH_APPROVED_PRIVACY_VERSION="<required>"
$env:GROWPATH_AGE_RATING_DECISION="<required>"
$env:GROWPATH_JURISDICTION_NOTES="<required>"
npm.cmd run release:record-evidence -- legal
```

## Named Owners

```powershell
$env:GROWPATH_RELEASE_EVIDENCE_CONFIRM="RECORD_RELEASE_EVIDENCE"
$env:GROWPATH_EVIDENCE_RECORDED_BY="<name-or-release-machine>"
$env:GROWPATH_RELEASE_OWNER="<required>"
$env:GROWPATH_QA_OWNER="<required>"
$env:GROWPATH_SUPPORT_OWNER="<required>"
$env:GROWPATH_CRASH_OWNER="<required>"
$env:GROWPATH_RELEASE_MONITORING_OWNER="<required>"
$env:GROWPATH_TRIAGE_SLA="<required>"
npm.cmd run release:record-evidence -- owners
```

## Hotfix And Rollback

```powershell
$env:GROWPATH_RELEASE_EVIDENCE_CONFIRM="RECORD_RELEASE_EVIDENCE"
$env:GROWPATH_EVIDENCE_RECORDED_BY="<name-or-release-machine>"
$env:GROWPATH_HOTFIX_OWNER="<required>"
$env:GROWPATH_ROLLBACK_OWNER="<required>"
$env:GROWPATH_HOTFIX_BRANCH="<required>"
$env:GROWPATH_ROLLBACK_PLAN="<required>"
$env:GROWPATH_SUPPORT_ESCALATION="<required>"
npm.cmd run release:record-evidence -- hotfix
```

## Final Gate

```powershell
npm.cmd run release:go-no-go
```
