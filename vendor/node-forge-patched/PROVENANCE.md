# node-forge 1.4.0 — local security backport

This is a private, source-vendored copy of `node-forge` **1.4.0**, identified as
`1.4.0+growpath.1`. It is not an upstream 1.4.1 release. The upstream package has
no published fix for GHSA-86w9-cpqp-85rv as of 2026-10-05.

## Provenance and license

- Base: https://registry.npmjs.org/node-forge/-/node-forge-1.4.0.tgz
- Base npm integrity: `sha512-LarFH0+6VfriEhqMMcLX2F7SwSXeWwnEAJEsYm5QKWchiVYVvJyV9v7UDvUv+w5HO23ZpQTXDv/GxdDdMyOuoQ==`
- Source: https://github.com/digitalbazaar/forge/tree/v1.4.0/lib
- All 49 `lib/*.js` files are included; all except `rsa.js` are byte-identical
  to that installed, integrity-pinned package. `UPSTREAM_SHA256.json` records
  the unmodified SHA-256 hashes. The original complete `LICENSE` and source
  copyright notices are retained. GrowPathAI uses the offered BSD-3-Clause
  license. No prebuilt/minified browser bundle or Flash artifact is included.
- Advisory: https://github.com/advisories/GHSA-86w9-cpqp-85rv
- Reporter: https://github.com/digitalbazaar/forge/issues/1149

## Changes

1. Backport the `rsa.js` hunk from open upstream PR
   https://github.com/digitalbazaar/forge/pull/1152, commit
   `ceba34402e329f0365134f23fe19898756527d65`. The PR is **unmerged**; it has
   peer review, but is not represented here as an upstream release.
   The nested `DigestAlgorithm` must contain exactly the OID and its optional
   NULL element. The existing outer count check and verification remain active.
2. Additional local hardening, 2026-10-05: reject a present NULL parameter whose
   contents are nonempty. The upstream-only patch still accepts interior garbage
   in that NULL payload. The independent regression script demonstrates this
   upstream-only failure before verifying the local rejection. No legitimate
   NULL payload is lost: ASN.1 NULL has zero content octets.
3. Additional local hardening, 2026-10-05: require the captured algorithm OID to
   match its canonical DER encoding. `derToOid` otherwise discards unfinished
   arcs and normalizes non-minimal base-128 encodings; the prior upstream and
   NULL-only patches accepted those malformed algorithm bytes. Independent
   tests reproduce all three malformed cases with ephemeral-key signatures and
   reject them after this guard. This is evidence of malformed-encoding
   acceptance, not a claim of having demonstrated a private-key-free forgery.

No cryptographic algorithm, padding policy, key generation, signing, or public
API is replaced. Absent SHA parameters and present empty NULL parameters remain
accepted; MD5's existing required-NULL behavior is retained. Existing explicit
non-default verification options are not broadened.

SHA-256 for `lib/rsa.js`:

- Original 1.4.0: `fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50`
- Upstream PR only: `acc22e5d36e27832c34e02dd3933aad7977d45b047eead5016520735efedc9c5`
- Intermediate backport plus NULL validation: `17d78037b133e363454173728fb76e57ed16897350956c82c52c51ff5d053c57`
- Final backport plus NULL and canonical OID validation: `5b8cc269824047324b36a681d3482dc3002e04fc99ae40c63c5c0440537e1493`

## Verification and integration

Run `node scripts/verify-node-forge-backport.cjs` for source-integrity,
vulnerable-control, malformed-DigestInfo, valid signature, RSA-PSS, RSA-OAEP,
certificate and CSR regressions. After installing the local file dependency,
run it with `--installed` to verify that the resolved package is this exact copy.
All test keys are ephemeral synthetic keys generated in memory; no credentials
or application records are read or printed.

Integrate using a local `file:vendor/node-forge-patched` dependency/override and
regenerate the lockfile normally. Do not relabel this package as a fictitious
fixed upstream version, change its name to evade the audit, or waive advisories.
The independent local verification supplements, not replaces, the normal audit.
If the audit still blocks this local patch, keep the release blocked and record
that truth. Replace the local fork after an actual upstream fixed release has
been reviewed and verified against these regressions.
