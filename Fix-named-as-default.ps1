# Fix-named-as-default.ps1
# Rename default imports that use exported names: ROUTES -> routes, client -> apiClient (across src)

$files = Get-ChildItem -Path ".\src" -Recurse -File -Include *.js,*.jsx,*.ts,*.tsx

function HasId([string]$content, [string]$id) {
  return ($content -match "(^|\W)$([Regex]::Escape($id))(\W|$)")
}

foreach ($f in $files) {
  $p = $f.FullName
  $content = Get-Content $p -Raw
  $orig = $content

  # import ROUTES from "...";
  if ($content -match 'import\s+ROUTES\s+from\s+["\'][^"\']+["\']\s*;') {
    $routesId = "routes"
    if (HasId $content "routes") { $routesId = "apiRoutes" }

    $content = [Regex]::Replace(
      $content,
      'import\s+ROUTES\s+from(\s+["\'][^"\']+["\']\s*;)',
      "import $routesId from`$1"
    )
    $content = [Regex]::Replace($content, '\bROUTES\b', $routesId)
  }

  # import client from "...";
  if ($content -match 'import\s+client\s+from\s+["\'][^"\']+["\']\s*;') {
    $clientId = "apiClient"
    if (HasId $content "apiClient") { $clientId = "httpClient" }

    $content = [Regex]::Replace(
      $content,
      'import\s+client\s+from(\s+["\'][^"\']+["\']\s*;)',
      "import $clientId from`$1"
    )
    $content = [Regex]::Replace($content, '\bclient\b', $clientId)
  }

  if ($content -ne $orig) {
    Set-Content -Path $p -Value $content -Encoding utf8
    Write-Host "patched: $($f.FullName)"
  }
}
