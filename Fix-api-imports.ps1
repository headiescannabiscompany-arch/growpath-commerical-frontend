
# Fix-api-imports.ps1
# Deterministically rename:
#   - ROUTES (default import) -> routes (or apiRoutes if routes already exists)
#   - client (default import) -> apiClient (or httpClient if apiClient already exists)
# Only touches src/api/*.js files.

$ErrorActionPreference = "Stop"

$files = Get-ChildItem -Path ".\src\api" -Filter "*.js" -File

function HasIdentifier([string]$content, [string]$id) {
  return ($content -match "(^|\W)$([Regex]::Escape($id))(\W|$)")
}

foreach ($f in $files) {
  $p = $f.FullName
  $content = Get-Content -LiteralPath $p -Raw
  $orig = $content

  # --- ROUTES default import rename ---
  # matches: import ROUTES from "./routes.js";
  if ($content -match 'import\s+ROUTES\s+from\s+["'']\./routes\.js["'']\s*;') {
    $routesId = "routes"
    if (HasIdentifier $content "routes") { $routesId = "apiRoutes" }

    $content = [Regex]::Replace(
      $content,
      'import\s+ROUTES\s+from\s+["'']\./routes\.js["'']\s*;',
      "import $routesId from `"./routes.js`";"
    )

    # replace ROUTES identifier usages
    $content = [Regex]::Replace($content, '\bROUTES\b', $routesId)
  }

  # --- client default import rename ---
  # matches: import client from "./client.js";
  if ($content -match 'import\s+client\s+from\s+["'']\./client\.js["'']\s*;') {
    $clientId = "apiClient"
    if (HasIdentifier $content "apiClient") { $clientId = "httpClient" }

    $content = [Regex]::Replace(
      $content,
      'import\s+client\s+from\s+["'']\./client\.js["'']\s*;',
      "import $clientId from `"./client.js`";"
    )

    # If file ALSO has named-import client, do targeted replacements only.
    if ($content -match 'import\s+\{[^}]*\bclient\b[^}]*\}\s+from\s+["'']\./client\.js["'']') {
      $content = $content -replace '\bclient\.', ($clientId + ".")
      $content = $content -replace '\bclient\(', ($clientId + "(")
      $content = $content -replace '\bclient\[', ($clientId + "[")
    } else {
      $content = [Regex]::Replace($content, '\bclient\b', $clientId)
    }
  }

  if ($content -ne $orig) {
    Set-Content -LiteralPath $p -Value $content -Encoding utf8
    Write-Host ("patched: " + $f.Name)
  }
}
