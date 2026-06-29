$ErrorActionPreference = "Stop"

$frontendRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Resolve-Path (Join-Path $frontendRoot "..\growpath-commerical")
$backendJest = Join-Path $backendRoot "node_modules\jest\bin\jest.js"
$frontendJest = Join-Path $frontendRoot "node_modules\jest\bin\jest.js"

function Invoke-Step {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string[]]$Arguments,
    [int]$Retries = 0,
    [int]$RetryDelaySeconds = 2,
    [scriptblock]$BeforeAttempt = $null
  )

  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    Write-Host ""
    Write-Host "==> $Name"
    if ($attempt -gt 0) {
      Write-Host "Retry $attempt of $Retries"
    }
    if ($BeforeAttempt) {
      & $BeforeAttempt
    }

    Push-Location $WorkingDirectory
    try {
      & $Command @Arguments
      $exitCode = $LASTEXITCODE
    } finally {
      Pop-Location
    }

    if ($exitCode -eq 0) {
      return
    }

    if ($attempt -lt $Retries) {
      Start-Sleep -Seconds $RetryDelaySeconds
      continue
    }

    throw "$Name failed with exit code $exitCode"
  }
}

Write-Host "GrowPath pre-manual validation"
Write-Host "Frontend: $frontendRoot"
Write-Host "Backend:  $backendRoot"

$previousNodeEnv = $env:NODE_ENV
try {
  $env:NODE_ENV = "test"
  Invoke-Step `
    -Name "Backend facility AI contract" `
    -WorkingDirectory $backendRoot `
    -Command "node" `
    -Arguments @($backendJest, "--runInBand", "--runTestsByPath", "tests\core\ai.call.test.js")
} finally {
  $env:NODE_ENV = $previousNodeEnv
}

Invoke-Step `
  -Name "Frontend route inventory" `
  -WorkingDirectory $frontendRoot `
  -Command "node" `
  -Arguments @("scripts\inventory-ui-routes.cjs")

Invoke-Step `
  -Name "Frontend preservation and AI guards" `
  -WorkingDirectory $frontendRoot `
  -Command "node" `
  -Arguments @(
    $frontendJest,
    "--runInBand",
    "--runTestsByPath",
    "tests\ai\ai.schema.drift.test.js",
    "tests\unit\aiFeatureMatrix.test.ts",
    "tests\entitlements\modeAccess.test.ts",
    "tests\navigation\routeAccess.test.ts",
    "tests\unit\InlineError.test.tsx",
    "tests\unit\AIResultCard.test.tsx",
    "tests\unit\ai-call-normalize.test.ts",
    "src\api\__tests__\facilityWorkflows.test.ts"
  )

Invoke-Step `
  -Name "Frontend delivery guard" `
  -WorkingDirectory $frontendRoot `
  -Command "node" `
  -Arguments @("scripts\verify-delivery.mjs")

Write-Host ""
Write-Host "Pre-manual checks passed."
