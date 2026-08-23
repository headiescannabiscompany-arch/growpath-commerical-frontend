# Forum Owner Lifecycle Local Evidence — 2026-08-23

Status: locally accepted; merge, deployment and authenticated production mutation remain
open.

## Exact gap closed

The already-live canonical Forum route correctly hid owner self-reporting and exposed
author-only comment deletion, but the retained production thread still showed a stored
`commentCount` of four while its visible-comments endpoint returned three. Forum also lacked
an owner post edit/delete path, validated comment replies and owner comment editing.
Rebuilding the Forum, sharing, media or reporting architecture was explicitly out of scope.

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
- Replies require a visible parent comment from the same discussion. Comment owners can edit
  their copy through the canonical comment endpoint; the server clears derived moderation
  state, retains the separate moderation-case history, and re-runs the current policy.
- The canonical Expo Router detail gives the owner explicit Edit and confirmed Delete
  controls, explains the immutable privacy boundary, and returns to Forum after deletion.
  Every visible comment exposes Reply; owners receive Edit/Delete while other users retain
  Report. A non-owner thread also exposes the existing shared Follow control for the post
  author, which feeds the already-retained Following forum/video discovery behavior.

## Local verification

Backend candidate `e312e0d`:

- `tests/routes/forum.test.js`
- `tests/contracts/forum-actions.contract.test.js`
- `tests/contracts/forum.feed.pagination.contract.test.js`
- result: 3 suites, 40 tests passed using the backend's locked Express 4 dependency tree;
  focused source lint and `git diff --check` passed.
- the Mongo-backed lifecycle creates a post, comment and validated reply; repairs a
  deliberately stale four-to-two count; rejects another account's comment and post edits;
  accepts their respective owners' edits; preserves grow context and public visibility
  across an owner post edit; soft-deletes as the owner; returns 404 from detail; and removes
  the post from the feed.

Frontend candidate `499f7a5f7d657866b9dd504e9ee042c6f6e67e18` is on
`codex/cleanup-evidence-and-forum-lifecycle`:

- `tests/unit/ForumPostDetailRoute.test.tsx` and
  `tests/unit/community-social-api.test.ts`: 17/17 passed;
- `tests/unit/ForumPostDetailTheme.test.ts`: 4/4 passed after the complete CI packet
  correctly found that its old one-input source guard had not been expanded for the three
  new edit inputs. All four inputs now explicitly use the active palette for placeholder
  and selection colors, and the guard checks every input;
- `npx tsc --noEmit`: passed;
- focused source lint: zero errors;
- `git diff --check`: passed.

An initial broader backend attempt was invalid because Node resolved an unrelated parent
Express 5 installation. It failed before loading Forum routes at the application's existing
`app.options("*", cors())` line. The packet above was rerun with a worktree-local junction to
the exact locked Express 4 dependencies and passed; the temporary junction was then removed.

## Remaining production gate

Frontend CI run `32637192209` is running on the exact corrected frontend SHA. GitHub Actions
is currently prevented from starting backend jobs by the account payment or Actions
spending-limit state. After the frontend gate passes and the owner restores backend Actions,
merge and deploy both exact candidates, then on a disposable owner thread verify corrected
counts, reply, comment edit, post edit/reload, confirmed delete, detail 404 and feed removal.
A separate outside account must still verify follow/comment/reply/report boundaries and Admin
plus delivered-email notification evidence.
