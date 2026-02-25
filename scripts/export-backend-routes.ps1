param(
  [string]$ApiBase = "http://localhost:5001"
)

$ApiBase = $ApiBase.TrimEnd("/")
$outDir = ".\tmp\spec"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$routes = (Invoke-RestMethod -Uri "$ApiBase/api/__debug/routes" -Method GET).routes |
  Sort-Object -Unique

$txtPath = Join-Path $outDir "backend-routes.txt"
$jsonPath = Join-Path $outDir "backend-routes.json"

$routes | Set-Content -Path $txtPath -Encoding UTF8
[pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  apiBase = $ApiBase
  count = $routes.Count
  routes = $routes
} | ConvertTo-Json -Depth 4 | Set-Content -Path $jsonPath -Encoding UTF8

Write-Host "Wrote: $txtPath"
Write-Host "Wrote: $jsonPath"
Write-Host "Route count: $($routes.Count)"
