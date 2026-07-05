param(
  [string]$OutputDir = "store-assets\graphics"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $root
try {
  node scripts/export-store-assets.cjs --output-dir $OutputDir
} finally {
  Pop-Location
}
