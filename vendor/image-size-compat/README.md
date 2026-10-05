# image-size compatibility adapter

This private package preserves the callable CommonJS API exposed by
`image-size` 1.2.1 while delegating image parsing and asynchronous file reads to
the patched upstream `image-size` 2.0.4 package.

It exists for Expo SDK 54's Metro 0.83 dependency, which calls
`require("image-size")` as a function with both `Buffer` data and filesystem
paths. Upstream 2.x intentionally changed its root CommonJS export to an object
and moved filesystem reads to `image-size/fromFile`.

The adapter keeps these 1.x contracts:

- callable CommonJS, `default`, and `imageSize` exports;
- synchronous `Buffer`, `Uint8Array`, and string-path use;
- callback-based string-path use;
- `disableFS`, `disableTypes`, `setConcurrency`, and `types` exports; and
- the 512 KiB synchronous file-read limit and legacy invocation errors.

All format detection and parsing is performed by the aliased, unmodified
`image-size-modern` dependency at exactly version 2.0.4. No 1.x parser is
vendored or executed.

Upstream provenance: <https://codeberg.org/image-size/image-size>

Upstream npm package: `image-size@2.0.4`

Security provenance:

- ICNS infinite-loop advisory:
  <https://github.com/advisories/GHSA-w3rx-r6r6-pgpr>
- JXL/HEIF infinite-loop advisory:
  <https://github.com/advisories/GHSA-5p2g-fcmc-qvqq>
- upstream parser fix:
  <https://codeberg.org/image-size/image-size/commit/e6e83a5578961de81f6d5834d90fb7430d8f29a5>

License: MIT. See `LICENSE`.
