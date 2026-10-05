# Local braces security backport

This is a local MIT-licensed fork of `braces@3.0.3`, not a maintained upstream
release or a claim that upstream 3.0.3 is safe. Its package identity is
`@growpathai/braces-compat@3.0.3-growpath.1`; it is private and must not be published.

## Source and reason

- Source tarball: https://registry.npmjs.org/braces/-/braces-3.0.3.tgz
- Source repository: https://github.com/micromatch/braces/tree/3.0.3
- MIT copyright/license is retained verbatim in `LICENSE`.
- Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- Upstream report/recommended guard: https://github.com/micromatch/braces/issues/70
- Reviewed 2026-10-05: the advisory lists **no patched version**. Upstream issue
  70 remains open; its recommendation is to bound parser nesting. No unreviewed
  upstream branch or unrelated behavior change was imported.

`INTEGRITY.json` records the npm tarball integrity and SHA-256 of each original
source file, plus SHA-256 of every local runtime, fixture, metadata and license
file. The original source was read from the locked 3.0.3 installation. The 140
ordinary-input fixtures capture that installation's four public method results
before applying this patch; they are not generated from the patched code.

## Narrow local change

- `lib/depth.js`: hard, non-overridable 64-block nesting ceiling and a controlled
  `SyntaxError` with code `ERR_BRACES_MAX_DEPTH`.
- `lib/parse.js`: check the actual parser stack before entering braces or
  parentheses. Quoted, escaped and bracket-literal delimiters are not counted.
- `lib/compile.js`, `lib/expand.js`, `lib/stringify.js`: guard recursion for
  callers that supply ASTs directly, including cyclic/deep AST node links.
- `lib/expand.js`: bound recursive queue appends and raw-AST parent-chain walks.
- `lib/utils.js`: bound recursive flattening, including cyclic arrays.
- All other runtime behavior and the existing 10,000-character/range guards are
  retained. The `index.js` API, constants and `fill-range` dependency are unchanged.

The parser permits 64 nested brace/parenthesis blocks. Tree walkers allow the
root/terminal-node overhead as well. Nested inputs beyond this boundary now fail
deterministically rather than reaching the JavaScript call-stack limit. Consumers
must handle the validation exception, just as they must handle the pre-existing
maximum-length/range exceptions. This does not promise safety for arbitrary
exponential expansion, malicious getters/proxies, unlimited range options, or all
denial-of-service classes.

## Integration and verification

Override every `braces` dependency with `file:./vendor/braces-compat`, generate the
lock with npm, and verify **all** installed resolutions use this local package.
Do not relabel this as a fixed upstream version or suppress its advisory.

Run `node scripts/verify-braces-security-backport.cjs` in CI after installation.
The check validates hashes, installed resolution, ordinary compatibility and
isolated attacks under child-process timeouts. `--vendor-only` exists solely for
pre-integration development and must not be the release/CI invocation.

Retire this fork when an upstream fix with compatible behavior is published,
reviewed and validated against the same regressions. A local fork needs active
maintenance; an npm audit result alone cannot assess these source changes.
