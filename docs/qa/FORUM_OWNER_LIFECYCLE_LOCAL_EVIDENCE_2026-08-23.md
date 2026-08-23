# Forum Owner Lifecycle Local Evidence — 2026-08-23

Status: locally accepted; merge, deployment and authenticated production mutation remain
open.

## Exact gap closed

The already-live canonical Forum route correctly hid owner self-reporting and exposed
author-only comment deletion, but the retained production thread still showed a stored
`commentCount` of four while its visible-comments endpoint returned three. Forum also lacked
an owner post edit/delete path. Rebuilding the Forum, comment composer, sharing, media or
reporting architecture was explicitly out of scope.

## Candidate behavior

- Detail and public/latest/trending/following feeds derive comment totals from the same
  visibility, moderation and cannabis-content policy used by the comments endpoint.
- Deleting a comment writes an authoritative remaining visible-comment total instead of a
  blind decrement.
- `PATCH /api/forum/:id` is owner-only, requires non-empty content, bounds editable fields,
  and deliberately keeps author identity, workspace context, linked records and visibility
  immutable. It re-runs moderation and replaces the feed projection.
- `DELETE /api/forum/:id` is owner-only and soft-deletes the retained record with
  `owner_deleted`, actor and timestamp evidence while removing every feed projection.
- The canonical Expo Router detail gives the owner explicit Edit and confirmed Delete
  controls, explains the immutable privacy boundary, and returns to Forum after deletion.
  Other users retain Report rather than owner controls.

## Local verification

Backend candidate `219ca91`:

- `tests/routes/forum.test.js`
- `tests/contracts/forum-actions.contract.test.js`
- `tests/contracts/forum.feed.pagination.contract.test.js`
- result: 3 suites, 37 tests passed using the backend's locked Express 4 dependency tree;
  focused source lint and `git diff --check` passed.
- the Mongo-backed lifecycle creates a post and comment, repairs a deliberately stale
  four-to-one count, rejects another account's edit, preserves grow context and public
  visibility across an owner copy edit, soft-deletes as the owner, returns 404 from detail,
  and removes the post from the feed.

Frontend candidate is on `codex/cleanup-evidence-and-forum-lifecycle`:

- `tests/unit/ForumPostDetailRoute.test.tsx` and
  `tests/unit/community-social-api.test.ts`: 14/14 passed;
- `npx tsc --noEmit`: passed;
- focused source lint: zero errors;
- `git diff --check`: passed.

An initial broader backend attempt was invalid because Node resolved an unrelated parent
Express 5 installation. It failed before loading Forum routes at the application's existing
`app.options("*", cors())` line. The packet above was rerun with a worktree-local junction to
the exact locked Express 4 dependencies and passed; the temporary junction was then removed.

## Remaining production gate

GitHub Actions is currently prevented from starting backend jobs by the account payment or
Actions spending-limit state. After the owner restores Actions, merge and deploy both exact
candidates, then on a disposable owner thread verify corrected counts, edit/reload, confirmed
delete, detail 404 and feed removal. A separate outside account must still verify
follow/comment/reply/report boundaries and Admin plus delivered-email notification evidence.
