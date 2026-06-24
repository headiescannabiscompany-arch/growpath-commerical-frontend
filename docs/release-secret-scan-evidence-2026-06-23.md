# Release Secret Scan Evidence

Date reviewed: 2026-06-23
Repository: growpath-commerical-frontend

## Result

No production secrets were found in tracked source files by the local release
secret scan.

## Commands Run

```powershell
git ls-files "*.p8" "*service-account*.json" "GoogleService-Info.plist" "*.keystore" "*.jks" "*.pem" "*.key"
```

Result: no tracked files matched.

Fixed-string private-key marker scan across tracked source directories.

Result: no findings.

```powershell
rg -n --hidden -g '!node_modules/**' -g '!.git/**' -g '!dist/**' -g '!coverage/**' -g '!playwright-report/**' -g '!test-results/**' -g '!tmp/**' -g '!eslint-warnings.json' -g '!eslint-warnings.txt' 'AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9]+|rk_live_[A-Za-z0-9]+|AIza[0-9A-Za-z_-]{35}|ya29\.[0-9A-Za-z_-]+' .
```

Result: no findings.

```powershell
rg -n --hidden -g '!node_modules/**' -g '!.git/**' -g '!dist/**' -g '!coverage/**' -g '!playwright-report/**' -g '!test-results/**' -g '!tmp/**' -g '!eslint-warnings.json' -g '!eslint-warnings.txt' 'service-account-key\.json|GoogleService-Info\.plist|AuthKey_[A-Z0-9]+\.p8|client_secret' .
```

Result: one expected `.gitignore` match for `service-account-key.json`; no
tracked credential file or client secret was found.

## Notes

- `.gitignore` excludes `service-account-key.json` and `*.p8`.
- `eas.json` does not contain App Store Connect or Google Play submit
  credentials.
- Password field names, test credentials, and documentation examples were not
  treated as production secrets unless they matched a real credential pattern or
  tracked credential-file name.

## Remaining External Work

This evidence does not replace the required release-machine and CI secret
review. Apple and Google submit credentials still need to be provisioned outside
source control and verified by Release Engineering.
