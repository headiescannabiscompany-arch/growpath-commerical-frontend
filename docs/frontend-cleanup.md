# Frontend Cleanup Log

## 2026-08-27 evidence-driven baseline

- `npm run scan:full:strict` passed across 1,136 source files and 540 test files.
- The scan found zero API orphans, zero legacy client callers, and zero strict banned source
  findings.
- The apparent `src/api/client.js` / `client.ts` and
  `src/components/EmptyState.js` / `EmptyState.tsx` twin pairs are compatibility wrappers, not
  duplicate implementations. Current JS tests and Commercial JS screens still import the `.js`
  entry points, while TypeScript callers resolve the canonical TypeScript implementations.
- The scanner previously missed those two wrappers because exact text matching did not normalize
  CRLF line endings or the client wrapper's explanatory comment.

## Classified and retained

- 15 JS/TypeScript twin pairs are intentional compatibility wrappers.
- No production source file is approved for deletion from this baseline scan.

## Scanner correction

- Compatibility re-export detection now normalizes CRLF and ignores leading line comments before
  matching the deliberately narrow re-export forms.
- A clean strict scan must report zero duplicate JS/TypeScript implementations and 15
  compatibility wrappers before any later cleanup candidate can be considered.

## Removal rule

- Do not remove a compatibility wrapper until repository imports, runtime/deep links, tests,
  scripts, and production compatibility all prove that its entry point is unused.
- Do not treat a passing orphan scan alone as proof that an app route, provider, worker, webhook,
  migration, or fixture is dead.

## PR/commit reference

- Pending this bounded cleanup packet.
