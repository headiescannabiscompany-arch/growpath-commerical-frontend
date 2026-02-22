New-Item -ItemType Directory -Force .\tmp\auth-dumps\raw | Out-Null
New-Item -ItemType Directory -Force .\tmp\auth-dumps\share | Out-Null

$API = (("$env:EXPO_PUBLIC_API_URL") -as [string])
if ([string]::IsNullOrWhiteSpace($API)) { $API = "http://localhost:5001" }
$API = $API.TrimEnd("/")

function Read-PlainPassword([string]$prompt) {
  $sec = Read-Host -AsSecureString $prompt
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Dump-AuthInteractive([string]$label) {
  $email = Read-Host "Email for $label"
  $password = Read-PlainPassword "Password for $label"

  $loginBody = @{ email = $email; password = $password } | ConvertTo-Json
  try {
    $login = Invoke-RestMethod "$API/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
  } catch {
    $errFile = ".\tmp\auth-dumps\raw\login_$label.error.txt"
    $_.Exception.Message | Out-File $errFile -Encoding utf8
    Write-Host "Login failed for $label. See $errFile"
    return
  }

  if (-not $login.token) { throw "No token returned for $label" }

  $token = $login.token
  $login.token = "<redacted>"
  $login | ConvertTo-Json -Depth 40 | Out-File ".\tmp\auth-dumps\raw\login_$label.json" -Encoding utf8

  try {
    $me = Invoke-RestMethod "$API/api/me" -Headers @{ Authorization = "Bearer $token" }
  } catch {
    $errFile = ".\tmp\auth-dumps\raw\me_$label.error.txt"
    $_.Exception.Message | Out-File $errFile -Encoding utf8
    Write-Host "ME failed for $label. See $errFile"
    return
  }
  $me | ConvertTo-Json -Depth 40 | Out-File ".\tmp\auth-dumps\raw\me_$label.json" -Encoding utf8

  $loginShare = (Get-Content ".\tmp\auth-dumps\raw\login_$label.json" -Raw | ConvertFrom-Json)
  if ($loginShare.user) {
    if ($loginShare.user.email) { $loginShare.user.email = "<email>" }
    if ($loginShare.user.name) { $loginShare.user.name = "<name>" }
    if ($loginShare.user.id) { $loginShare.user.id = "<id>" }
    if ($loginShare.user._id) { $loginShare.user._id = "<id>" }
  }
  $loginShare | ConvertTo-Json -Depth 40 | Out-File ".\tmp\auth-dumps\share\login_$label.share.json" -Encoding utf8

  $meShare = (Get-Content ".\tmp\auth-dumps\raw\me_$label.json" -Raw | ConvertFrom-Json)
  foreach ($k in @("email","name","fullName","firstName","lastName","phone")) {
    if ($meShare.PSObject.Properties.Name -contains $k) { $meShare.$k = "<redacted>" }
  }
  foreach ($k in @("id","_id","userId","facilityId","companyId")) {
    if ($meShare.PSObject.Properties.Name -contains $k) { $meShare.$k = "<id>" }
  }
  $meShare | ConvertTo-Json -Depth 40 | Out-File ".\tmp\auth-dumps\share\me_$label.share.json" -Encoding utf8
}

Dump-AuthInteractive "personal"
Dump-AuthInteractive "commercial"
Dump-AuthInteractive "facility"

rg -n "password|passphrase|secret" .\tmp\auth-dumps\share
