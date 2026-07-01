# Release Sign-Off Runbook

Status: sign-off procedure is defined. The approvals themselves must still be
recorded by named owners on the trusted release machine.

Use this runbook after strict preflight, live URL checks, data-rights
verification, production builds, physical-device smoke, monitoring validation,
and store screenshots have passed.

## Store Console Forms

Complete the App Store Connect and Google Play Console forms from approved
source documents only:

- App name, subtitle, description, keywords, screenshots, support URL, privacy
  URL, marketing URL, review notes: `APP_STORE_LISTING.md`
- Apple privacy nutrition and Google Play data safety answers:
  `docs/store-privacy-data-safety-2026-07-01.md`
- Store graphics source package: `docs/store-assets-evidence-2026-07-01.md`
  and `store-assets/graphics/`

After both consoles are complete and reviewed, record evidence:

```powershell
npm.cmd run release:record-evidence -- --template store-submission
```

Every generated confirmation value must be `yes`, `true`, or `1`; the
go/no-go gate rejects blank or negative values.

## Legal Approval

Legal approval must cover:

- Cannabis-related language, jurisdiction notes, and age-rating decision.
- AI-assisted diagnosis limitations and educational framing.
- Image upload, retention, and signed URL handling.
- Account deletion, data export, privacy policy, and terms links.
- Store listing copy and privacy/data-safety answers.

Record approval:

```powershell
npm.cmd run release:record-evidence -- --template legal
```

## Named Owners

Before submission, assign named humans or accountable on-call rotations for:

- Release owner.
- QA owner.
- Support owner.
- Crash-monitoring owner.
- Release monitoring owner.
- Triage SLA.

Record owner evidence:

```powershell
npm.cmd run release:record-evidence -- --template owners
```

## Hotfix And Rollback

Before submission, confirm:

- Hotfix owner.
- Rollback owner.
- Hotfix branch name.
- Rollback plan for withdrawing, disabling, or replacing a bad build.
- Support escalation path for store review or production incidents.

Record rollback evidence:

```powershell
npm.cmd run release:record-evidence -- --template hotfix
```

## Final Gate

Run the final gate after all evidence is recorded:

```powershell
npm.cmd run release:go-no-go
```

Do not submit to either store until it prints `GO: all required release evidence
is present.`
