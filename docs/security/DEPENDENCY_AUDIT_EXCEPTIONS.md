# Dependency audit exceptions

## `image-size` build-tool denial of service — expires 2026-09-08

GitHub published two high-severity denial-of-service advisories for the npm
`image-size` package:

- `GHSA-w3rx-r6r6-pgpr` — ICNS parser infinite loop;
- `GHSA-5p2g-fcmc-qvqq` — JXL and HEIF parser infinite loops.

As reviewed on 2026-08-08, GitHub lists every released version through `2.0.2` as
affected and lists no first patched version. GrowPathAI currently receives
`image-size@1.2.1` transitively from Metro through Expo SDK 54. npm's proposed
forced remediation downgrades Expo to SDK 53, which is a breaking application and
native-build change and is not an acceptable unattended security fix.

The package is present in the Metro/Expo build toolchain. It is not the backend
path used to inspect user-uploaded production media. CI therefore permits only
these two exact advisories and only the reviewed Expo/Metro dependency chain until
the expiration date above. The gate continues to fail for:

- any other high or critical advisory;
- any new direct advisory on a package in the chain;
- a changed `image-size` lockfile version;
- an expanded dependency chain not named in the reviewed exception; or
- the passing of the expiration date.

At expiry—or sooner if `image-size`, Metro, or Expo publishes a compatible patched
release—remove the exception and update the dependency lockfile under the normal
Expo compatibility and production-build gates. Do not extend the date without a
new advisory and dependency-path review.
