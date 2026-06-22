# EAS Submit Runbook

> Status: release-engineering handoff

`eas.json` intentionally does not store App Store Connect or Google Play submit
credentials. Keep Apple IDs, team IDs, ASC app IDs, API keys, and Google service
account JSON outside source control.

## Required Secrets

- Apple account with App Store Connect access for the GrowPath app.
- App Store Connect app ID.
- Apple team ID.
- Google Play service account JSON with release permissions.

## Local Submit

Run these only from a trusted release machine after production builds are
created and validated:

```powershell
eas submit --platform ios --profile production --latest `
  --apple-id "$env:EAS_APPLE_ID" `
  --asc-app-id "$env:EAS_ASC_APP_ID" `
  --apple-team-id "$env:EAS_APPLE_TEAM_ID"
```

```powershell
eas submit --platform android --profile production --latest `
  --key "$env:GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"
```

## CI Submit

Use the same values as protected CI secrets. The Google service account should be
written to a temporary file during the job and deleted after submit completes.

## Deep Links

The app currently keeps the custom scheme from `app.json`. Do not add Android
App Links or iOS Associated Domains until the final public domain is confirmed
and the hosted `assetlinks.json` / Apple app-site-association files are live.
