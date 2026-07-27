# Field observations and Discovery production evidence — 2026-07-27

## Release

- Production commit: `088d1eba3934ab37ec83cad5ffdd05e736fb3242`
- Production URL: `https://growpathai.com`
- Render service: `growpath-frontend` (`srv-d8ulmu3eo5us73e2otmg`)
- Verified deployment route: `https://growpathai.com/field-observations`
- Discovery route: `https://growpathai.com/discover`

## Checks completed

- `GET /field-observations` returned HTTP 200 after the merged field-map runtime fix.
- The in-app Browser rendered the interactive `Discovery globe` with zoom, rotate, fullscreen, globe, and location controls.
- With location access not enabled, the globe displayed the United States and explained that viewing location is not published.
- The live Browser console had zero errors on the field-observations page.
- The existing Plant Species/Crop ID interface remained available with its evidence-first upload flow and optional Field Study link; it was not replaced by the globe.
- Discovery rendered a dedicated `Field observations` rail with an `Explore the public plant map` action and opt-in privacy guidance.
- `GET /discover` returned HTTP 200; the live Browser console had zero errors.

Evidence type: HTTP headers, signed-in/public in-app Browser DOM inspection, and browser-console inspection. No screenshot or video is claimed by this record.
