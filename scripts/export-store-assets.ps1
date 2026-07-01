param(
  [string]$OutputDir = "store-assets\graphics"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$out = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Resolve-AssetPath {
  param([string]$RelativePath)
  return Join-Path $root $RelativePath
}

function New-StoreImage {
  param(
    [string]$Source,
    [string]$Destination,
    [int]$Width,
    [int]$Height,
    [string]$Mode = "fit",
    [string]$Background = "#1A1A1A",
    [switch]$IgnoreSourceAlpha
  )

  $sourceImage = [System.Drawing.Image]::FromFile($Source)
  $drawSource = $sourceImage
  try {
    if ($IgnoreSourceAlpha) {
      $opaqueSource = New-Object System.Drawing.Bitmap($sourceImage.Width, $sourceImage.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
      for ($y = 0; $y -lt $sourceImage.Height; $y++) {
        for ($x = 0; $x -lt $sourceImage.Width; $x++) {
          $pixel = ([System.Drawing.Bitmap]$sourceImage).GetPixel($x, $y)
          $opaqueSource.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($pixel.R, $pixel.G, $pixel.B))
        }
      }
      $drawSource = $opaqueSource
    }

    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($Background))

        $targetAspect = $Width / $Height
        $sourceAspect = $drawSource.Width / $drawSource.Height

        if ($Mode -eq "cover") {
          if ($sourceAspect -gt $targetAspect) {
            $cropHeight = $drawSource.Height
            $cropWidth = [int]($cropHeight * $targetAspect)
            $cropX = [int](($drawSource.Width - $cropWidth) / 2)
            $cropY = 0
          } else {
            $cropWidth = $drawSource.Width
            $cropHeight = [int]($cropWidth / $targetAspect)
            $cropX = 0
            $cropY = [int](($drawSource.Height - $cropHeight) / 2)
          }
          $srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropWidth, $cropHeight)
          $destRect = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
        } else {
          $scale = [Math]::Min($Width / $drawSource.Width, $Height / $drawSource.Height)
          $drawWidth = [int]($drawSource.Width * $scale)
          $drawHeight = [int]($drawSource.Height * $scale)
          $drawX = [int](($Width - $drawWidth) / 2)
          $drawY = [int](($Height - $drawHeight) / 2)
          $srcRect = New-Object System.Drawing.Rectangle(0, 0, $drawSource.Width, $drawSource.Height)
          $destRect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawWidth, $drawHeight)
        }

        $graphics.DrawImage($drawSource, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
      } finally {
        $graphics.Dispose()
      }

      $bitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    if ($drawSource -ne $sourceImage) {
      $drawSource.Dispose()
    }
    $sourceImage.Dispose()
  }
}

function Assert-Image {
  param(
    [string]$Path,
    [int]$Width,
    [int]$Height
  )

  if (!(Test-Path $Path)) {
    throw "Missing generated asset: $Path"
  }

  $image = [System.Drawing.Image]::FromFile($Path)
  try {
    if ($image.Width -ne $Width -or $image.Height -ne $Height) {
      throw "Invalid dimensions for $Path. Expected ${Width}x${Height}, got $($image.Width)x$($image.Height)."
    }
    if ($image.PixelFormat.ToString() -match "Argb|PArgb|Alpha") {
      throw "Generated asset still has alpha channel: $Path"
    }
  } finally {
    $image.Dispose()
  }
}

$icon = Resolve-AssetPath "assets\icon.png"
$banner = Resolve-AssetPath "assets\banner.png"

$appStoreIcon = Join-Path $out "app-store-icon-1024.png"
$googlePlayIcon = Join-Path $out "google-play-icon-512.png"
$googleFeature = Join-Path $out "google-play-feature-graphic-1024x500.png"
$manifest = Join-Path $out "manifest.json"

New-StoreImage -Source $icon -Destination $appStoreIcon -Width 1024 -Height 1024 -Mode "fit" -IgnoreSourceAlpha
New-StoreImage -Source $icon -Destination $googlePlayIcon -Width 512 -Height 512 -Mode "fit" -IgnoreSourceAlpha
New-StoreImage -Source $banner -Destination $googleFeature -Width 1024 -Height 500 -Mode "cover"

Assert-Image -Path $appStoreIcon -Width 1024 -Height 1024
Assert-Image -Path $googlePlayIcon -Width 512 -Height 512
Assert-Image -Path $googleFeature -Width 1024 -Height 500

$manifestData = [ordered]@{
  generatedBy = "scripts/export-store-assets.ps1"
  sourceIcon = "assets/icon.png"
  sourceBanner = "assets/banner.png"
  assets = @(
    [ordered]@{ file = "app-store-icon-1024.png"; width = 1024; height = 1024; alpha = $false; target = "Apple App Store icon" },
    [ordered]@{ file = "google-play-icon-512.png"; width = 512; height = 512; alpha = $false; target = "Google Play app icon" },
    [ordered]@{ file = "google-play-feature-graphic-1024x500.png"; width = 1024; height = 500; alpha = $false; target = "Google Play feature graphic" }
  )
}

$manifestData | ConvertTo-Json -Depth 5 | Set-Content -Path $manifest -Encoding UTF8

Write-Host "Exported store assets to $out"
