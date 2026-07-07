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

function Assert-NoMatches {
  param(
    [string]$Name,
    [string]$Pattern,
    [string[]]$Paths
  )

  Write-Host ""
  Write-Host "==> $Name"

  $output = & rg $Pattern @Paths -n 2>&1
  $exitCode = $LASTEXITCODE

  if ($exitCode -eq 1) {
    Write-Host "No matches found."
    return
  }

  if ($exitCode -eq 0) {
    $output | ForEach-Object { Write-Host $_ }
    throw "$Name found disallowed matches"
  }

  $output | ForEach-Object { Write-Host $_ }
  throw "$Name scan failed with exit code $exitCode"
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

Assert-NoMatches `
  -Name "Commercial terminology guard" `
  -Pattern "trial grow|Trial Grow|Commercial Grow|Commercial Post|Store in Trials|grow/trial" `
  -Paths @(
    "src\app\home\commercial",
    "src\app\store",
    "src\screens",
    "tests\unit"
  )

Invoke-Step `
  -Name "Commercial storefront and inventory regressions" `
  -WorkingDirectory $frontendRoot `
  -Command "node" `
  -Arguments @(
    $frontendJest,
    "--runInBand",
    "--runTestsByPath",
    "tests\unit\CommercialInventoryCreateRoute.test.tsx",
    "tests\unit\CommercialLegacyScreens.test.tsx",
    "tests\unit\CommercialProfileRoute.test.tsx",
    "tests\unit\CommercialReportsScreen.test.tsx",
    "tests\unit\CommercialToolsScreen.test.tsx",
    "tests\unit\StorefrontScreen.test.tsx",
    "tests\unit\StoreIndex.test.tsx"
  )

Invoke-Step `
  -Name "Connected workflow guard" `
  -WorkingDirectory $frontendRoot `
  -Command "node" `
  -Arguments @("scripts\verify-connected-workflows.cjs")

Write-Host ""
Write-Host "Pre-manual checks passed."
Write-Host ""
Write-Host "Deferred user/human verification queue:"
Write-Host "- Log in as free/pro personal, commercial, and facility accounts with current seeded credentials."
Write-Host "- Confirm mode switching lands in the correct workspace and does not loop."
Write-Host "- Commercial: create/edit storefront, view as user, create product/course/live/feed campaign, and confirm public storefront navigation."
Write-Host "- Product: verify image, size/weight, grow interests, NPK, guaranteed analysis, ingredients, directions, and application rate appear on owner and public detail."
Write-Host "- Feed: confirm campaign cards behave as ads/outreach and CTA buttons open product/course/live/storefront/forum targets."
Write-Host "- Forum: confirm discussion/Q&A remains separate from feed campaigns."
Write-Host "- Facility: confirm room import preview can create rooms/devices from controller-style names."
Write-Host "- AI/tool workflows: run Soil Builder, NPK, Dry Amendment, Topdress, IPM Scout, Harvest Readiness, Dry/Cure, Tissue Culture, Clone Rooting, Auto Grow Calendar, Pheno Hunt, Genetics Inventory, Nutrient Source Comparison, pH/EC, Run Comparison, Soil Nutrient Batch, Stress Test, Crop Steering, and Species/Crop ID; confirm each can save ToolRun/log/task where offered."
Write-Host "- Tool task plans: confirm IPM tasks preserve GrowPath AI plus GPT verification context, pH/EC tasks schedule calibration and follow-up, run comparison tasks create repeatable next-run actions, and crop identity tasks update crop-specific targets/tags."
Write-Host "- Recipe/product workflow: convert a recipe to product draft and verify generated specs stay attached."
Write-Host "- Task review: confirm ToolRun-created tasks link back to the source grow/tool result and appear in Task Center/Schedule."
