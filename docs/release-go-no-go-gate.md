# Release Go/No-Go Gate

Status: automated final gate is defined. It must remain `NO-GO` until all
external release evidence has been produced on a trusted release machine.

## Command

```powershell
npm.cmd run release:go-no-go
```

The command checks source-controlled release artifacts and ignored release
evidence directories. It exits non-zero until every required external artifact
exists with the expected status.

The gate also validates evidence shape. A bare status-only JSON file is not
enough for critical release buckets; build evidence must include both iOS and
Android results, live URL evidence must include every required URL, and manual
approval evidence must include the expected owner, approval, screenshot, or
store-console fields.

## Required Evidence

The gate requires tracked artifacts for listing copy, privacy/data-safety
answers, store graphics, monitoring verification, live URL verification,
data-rights verification, production build/device-smoke runbooks, and this
go/no-go gate definition.

Store screenshot capture procedure is tracked in
`docs/store-screenshot-capture-runbook.md`.

It also requires JSON evidence under these ignored directories:

| Evidence | Directory | Required status |
| --- | --- | --- |
| Strict preflight | `tmp/spec/strict-preflight/` | `passed` |
| Live URLs | `tmp/spec/live-url-checks/` | `passed` |
| Sentry native crash verification | `tmp/spec/monitoring-validation/` | `passed` |
| Data export/delete | `tmp/spec/data-rights-live/` | `passed` |
| Production builds | `tmp/spec/release-builds/` | `passed` |
| Physical-device smoke | `tmp/spec/release-device-smoke/` | `passed` |
| Store screenshots | `tmp/spec/store-screenshots/` | `passed` |
| Store-console forms | `tmp/spec/store-submission/` | `passed` |
| Legal sign-off | `tmp/spec/legal-release-signoff/` | `approved` |
| Named owners | `tmp/spec/release-owners/` | `approved` |
| Hotfix/rollback plan | `tmp/spec/hotfix-rollback/` | `approved` |

Generated evidence is intentionally ignored by git. Attach it to the release
packet, then run this gate from the release machine.

`npm.cmd run release:preflight:strict` writes strict-preflight evidence
automatically after all strict checks pass.

Use `npm.cmd run release:record-evidence -- <type>` to write guarded evidence
for manual approval buckets. Supported types are:

- `owners`
- `legal`
- `hotfix`
- `store-submission`
- `screenshots`
- `device-smoke`
- `monitoring`

The recorder requires `GROWPATH_RELEASE_EVIDENCE_CONFIRM=RECORD_RELEASE_EVIDENCE`
and type-specific environment variables; it refuses blank approvals.

Print the exact PowerShell template for a type with:

```powershell
npm.cmd run release:record-evidence -- --template owners
npm.cmd run release:record-evidence -- --template legal
npm.cmd run release:record-evidence -- --template hotfix
npm.cmd run release:record-evidence -- --template store-submission
npm.cmd run release:record-evidence -- --template screenshots
npm.cmd run release:record-evidence -- --template device-smoke
npm.cmd run release:record-evidence -- --template monitoring
```

## Current Expected Result

In this workspace, the gate should currently return `NO-GO` because production
Sentry, live URL evidence, data-rights evidence, production builds,
physical-device smoke, store screenshots, legal sign-off, named owners, and
hotfix/rollback evidence have not been produced here.
