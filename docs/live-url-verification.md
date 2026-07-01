# Live URL Verification

Status: release-machine procedure is automated. Strict preflight runs this check
after production Sentry verification.

The verifier checks the URLs configured for the production EAS profile:

- Privacy policy
- Terms
- Support
- Delete account
- API health
- API readiness
- API health under `/api`

## Commands

Validate configuration without network access:

```powershell
npm.cmd run verify:live-urls -- --dry-run
```

Run the live release-machine check:

```powershell
npm.cmd run verify:live-urls
```

The live check follows redirects, accepts only HTTP 2xx or 3xx-to-2xx final
responses, and writes evidence under `tmp/spec/live-url-checks/`.

Strict preflight also runs the live check:

```powershell
npm.cmd run release:preflight:strict
```

## Passing Result

The command exits `0` and prints:

```text
Live URL verification passed. Evidence: tmp\spec\live-url-checks\<timestamp>.json
```

Generated evidence is intentionally ignored and should be attached to the
release packet, not committed.
