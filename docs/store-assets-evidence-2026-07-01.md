# Store Assets Evidence - 2026-07-01

Status: icon and Google Play feature graphic export package is generated from
the current source brand assets. Final screenshots still require production
builds and real-device capture.

## Repeatable Export Command

```text
npm.cmd run export:store-assets
```

The command runs `scripts/export-store-assets.ps1`, exports tracked assets under
`store-assets/graphics`, and validates dimensions plus opaque pixel format.

## Generated Assets

| File | Source | Size | Pixel format | Store target |
| --- | --- | --- | --- | --- |
| `store-assets/graphics/app-store-icon-1024.png` | `assets/icon.png` | 1024x1024 | Opaque RGB PNG | Apple App Store icon |
| `store-assets/graphics/google-play-icon-512.png` | `assets/icon.png` | 512x512 | Opaque RGB PNG | Google Play app icon |
| `store-assets/graphics/google-play-feature-graphic-1024x500.png` | `assets/banner.png` | 1024x500 | Opaque RGB PNG | Google Play feature graphic |
| `store-assets/graphics/manifest.json` | generated | n/a | JSON | Asset manifest |

## Notes

- The icon source stores visible background RGB under transparent alpha. The
  export script intentionally preserves source RGB while removing alpha, which
  makes the store icons opaque without changing the artwork.
- The Google Play feature graphic uses a centered cover crop from
  `assets/banner.png` because Google Play requires 1024x500.
- Store screenshots are not generated here. They must be captured from
  validated production iOS and Android builds.
