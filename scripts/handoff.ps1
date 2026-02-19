param([switch]$SkipInstall)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "== git status ==" -ForegroundColor Cyan
git status

Write-Host "`n== git diff ==" -ForegroundColor Cyan
git diff

Write-Host "`n== corruption scan (source only) ==" -ForegroundColor Cyan
rg '\$enc|New-Object|<!doctype html>|</html>' -S `
  --glob '!coverage/**' `
  --glob '!playwright-report/**' `
  --glob '!**/lcov-report/**' `
  --glob '!scripts/handoff.ps1' `
  src tests scripts

if (-not $SkipInstall) {
  Write-Host "`n== install + test ==" -ForegroundColor Cyan
  if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
  npm ci
  npx jest --clearCache
  npm test
} else {
  Write-Host "`n== install + test skipped ==" -ForegroundColor Yellow
}
