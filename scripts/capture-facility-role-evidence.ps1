param(
  [string]$ApiBase = $env:EXPO_PUBLIC_API_URL,
  [string]$CredsFile = ""
)

if ([string]::IsNullOrWhiteSpace($ApiBase)) { $ApiBase = "http://localhost:5001" }
$ApiBase = $ApiBase.TrimEnd("/")

$root = ".\tmp\spec\facility-role"
New-Item -ItemType Directory -Force $root | Out-Null

$creds = $null
if (-not [string]::IsNullOrWhiteSpace($CredsFile)) {
  if (-not (Test-Path $CredsFile)) {
    throw "CredsFile not found: $CredsFile"
  }
  $creds = Get-Content $CredsFile -Raw | ConvertFrom-Json
}

function Read-PlainPassword([string]$prompt) {
  $sec = Read-Host -AsSecureString $prompt
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Invoke-JsonRequest {
  param(
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $jsonBody = $null
  if ($Body -ne $null) { $jsonBody = ($Body | ConvertTo-Json -Depth 20) }

  try {
    $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -ContentType "application/json" -Body $jsonBody
    $status = [int]$response.StatusCode
    $text = $response.Content
  } catch {
    $status = 0
    $text = ""
    if ($_.Exception.Response) {
      try { $status = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $text = $reader.ReadToEnd()
      } catch {
        $text = $_.Exception.Message
      }
    } else {
      $text = $_.Exception.Message
    }
  }

  $obj = $null
  if (-not [string]::IsNullOrWhiteSpace($text)) {
    try { $obj = $text | ConvertFrom-Json } catch { $obj = @{ raw = $text } }
  }

  return @{
    status = $status
    body = $obj
    raw = $text
  }
}

$roles = @(
  @{ key = "owner"; expectedRole = "OWNER"; restrictedProbe = $false },
  @{ key = "manager"; expectedRole = "MANAGER"; restrictedProbe = $false },
  @{ key = "staff"; expectedRole = "STAFF"; restrictedProbe = $true },
  @{ key = "viewer"; expectedRole = "VIEWER"; restrictedProbe = $true }
)

$summary = @()

foreach ($role in $roles) {
  $key = $role.key
  $dir = Join-Path $root $key
  New-Item -ItemType Directory -Force $dir | Out-Null

  Write-Host ""
  Write-Host "=== $($key.ToUpper()) ==="
  $email = $null
  $password = $null

  if ($creds -and $creds.$key) {
    $email = [string]$creds.$key.email
    $password = [string]$creds.$key.password
    Write-Host "Using credentials from creds file for $key"
  } else {
    $email = Read-Host "Email for $key"
    $password = Read-PlainPassword "Password for $key"
  }

  $login = Invoke-JsonRequest -Url "$ApiBase/api/auth/login" -Method "POST" -Body @{
    email = $email
    password = $password
  }
  $login | ConvertTo-Json -Depth 20 | Out-File (Join-Path $dir "login.json") -Encoding utf8

  $token = $null
  if ($login.body -and $login.body.token) { $token = [string]$login.body.token }
  if ([string]::IsNullOrWhiteSpace($token)) {
    $summary += [pscustomobject]@{
      role = $key
      loginStatus = $login.status
      mode = ""
      facilityId = ""
      facilityRole = ""
      probeStatus = ""
      pass = "NO"
      note = "login failed"
    }
    continue
  }

  $headers = @{ Authorization = "Bearer $token" }
  $me = Invoke-JsonRequest -Url "$ApiBase/api/me" -Method "GET" -Headers $headers
  $me | ConvertTo-Json -Depth 30 | Out-File (Join-Path $dir "me.json") -Encoding utf8

  $ctx = $me.body.ctx
  $mode = ""
  $facilityId = ""
  $facilityRole = ""
  if ($ctx) {
    if ($ctx.mode) { $mode = [string]$ctx.mode }
    if ($ctx.facilityId) { $facilityId = [string]$ctx.facilityId }
    if ($ctx.facilityRole) { $facilityRole = [string]$ctx.facilityRole }
  }

  $probeStatus = ""
  $probePass = $true
  if ($role.restrictedProbe -and -not [string]::IsNullOrWhiteSpace($facilityId)) {
    $probe = Invoke-JsonRequest -Url "$ApiBase/api/facility/$facilityId/team/invite" -Method "POST" -Headers $headers -Body @{
      email = "probe-$key-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
      role = "VIEWER"
    }
    $probe | ConvertTo-Json -Depth 30 | Out-File (Join-Path $dir "restricted_probe_team_invite.json") -Encoding utf8
    $probeStatus = [string]$probe.status
    $probePass = ($probe.status -eq 403)
  }

  $identityPass = ($mode -eq "facility" -and -not [string]::IsNullOrWhiteSpace($facilityId) -and $facilityRole -eq $role.expectedRole)
  $pass = $identityPass -and $probePass

  $summary += [pscustomobject]@{
    role = $key
    loginStatus = $login.status
    mode = $mode
    facilityId = $facilityId
    facilityRole = $facilityRole
    probeStatus = $probeStatus
    pass = $(if ($pass) { "YES" } else { "NO" })
    note = $(if ($role.restrictedProbe) { "restricted probe expects 403" } else { "identity only" })
  }
}

$summaryPath = Join-Path $root "summary_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$summary | ConvertTo-Json -Depth 10 | Out-File $summaryPath -Encoding utf8

Write-Host ""
Write-Host "Evidence capture complete."
Write-Host "Summary: $summaryPath"
Write-Host "Per-role files: $root\\owner|manager|staff|viewer"
