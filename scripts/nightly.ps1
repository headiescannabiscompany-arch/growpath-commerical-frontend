$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$outDir = Join-Path $root "tmp\overnight"
New-Item -ItemType Directory -Force $outDir | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$summaryPath = Join-Path $outDir "summary_night.txt"
"Nightly run started: $timestamp" | Out-File -FilePath $summaryPath -Encoding utf8

$failed = $false

function Run-Step {
  param(
    [string]$Name,
    [string]$Command,
    [string]$LogFile
  )

  Write-Host "==> $Name"
  Add-Content -Path $summaryPath -Value ""
  Add-Content -Path $summaryPath -Value "[$Name] command: $Command"

  & cmd /d /s /c "$Command > `"$LogFile`" 2>&1"
  Get-Content $LogFile
  if ($LASTEXITCODE -ne 0) {
    $script:failed = $true
    Add-Content -Path $summaryPath -Value "[$Name] FAILED (exit $LASTEXITCODE)"
  } else {
    Add-Content -Path $summaryPath -Value "[$Name] PASSED"
  }
}

Run-Step "Typecheck" "npx tsc --noEmit" (Join-Path $outDir "typecheck_night.txt")
Run-Step "Lint" "npm run lint" (Join-Path $outDir "lint_night.txt")
Run-Step "Tests" "npm test -- --runInBand --forceExit" (Join-Path $outDir "test_night.txt")
Run-Step "VerifyDelivery" "npm run verify:delivery" (Join-Path $outDir "verify_night.txt")
Run-Step "SensitiveCopy" "npm run check:sensitive-copy" (Join-Path $outDir "sensitive_night.txt")
Run-Step "DriftScan" "npm run drift:scan" (Join-Path $outDir "drift_night.txt")

$endTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $summaryPath -Value ""
Add-Content -Path $summaryPath -Value "Nightly run finished: $endTime"

if ($failed) {
  Add-Content -Path $summaryPath -Value "Result: FAILED"
  exit 1
}

Add-Content -Path $summaryPath -Value "Result: PASSED"
exit 0
