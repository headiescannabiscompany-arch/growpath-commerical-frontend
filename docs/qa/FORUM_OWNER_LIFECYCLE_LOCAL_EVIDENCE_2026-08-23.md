# Forum Owner Lifecycle Local Evidence — 2026-08-23

Status: owner lifecycle live accepted; outside-account participation and delivered
notification evidence remain open.

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

Backend final feature head `fc6bdc1fb4b8561998cc4da9921a49a7e4212409`:

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

Frontend feature head `ba5bb39cd7a7f3a14bb5ef2cce98b3b86ae20760`:

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

## Merge, deployment and production acceptance

- Backend PR `#225` merged as `324d4025905cab6f3163e911db6eb486444df7fd`.
  Its rebased feature head passed Backend CI run `32642557443` and exhaustive CI run
  `32642557445` (2,973 tests plus the API security scan). The merged SHA passed main Backend
  CI run `32643240601` and deployed successfully through Render deploy
  `dep-da5fi715efls739lr120`.
- Frontend PR `#758` merged as `317cf4d119cde37b3147cc8b4424fce93f9011ea`.
  Exact-head Frontend CI run `32637232720`, merged-SHA Frontend CI run `32643391799`, and
  Production Build Preflight `32643391724` passed. Render deploy
  `dep-da5fjjm7bikc73bkt35g` succeeded.
- Authenticated production mutation created disposable thread
  `6a8afc491b46e1d6f0350149`, created an owner comment and validated reply, edited the
  comment, edited the post, and proved the edited title/body/author/comment/reply survived
  reload. This exposed one web-only defect: the native `Alert` confirmation rendered but
  did not invoke its destructive callback in the web build.
- Frontend PR `#759` replaced the native-only confirmation with an accessible in-page
  confirmation and preserved populated author display immediately after edit responses.
  Feature head `7262ad2224c1f21705847e44117c23c8c4aa58d9` passed 17/17 focused tests, TypeScript,
  lint, formatting and full Frontend CI run `32644615434`. It merged as
  `ffaee89e7e4f80c34720cc7845b6c2aab42f2660`; main Frontend CI run `32645134610` and
  Production Build Preflight `32645134594` passed. Render deploy
  `dep-da5g3cgae00c73b93dfg` succeeded.
- On the exact live SHAs, the same owner opened the in-page warning, confirmed deletion,
  returned to Forum, received the unavailable detail state on reload, and verified the
  deleted title was absent from All Discussions.

## Exact remaining boundary

A separate outside account must verify follow, comment, reply and report boundaries plus
Admin and delivered-email notification evidence. Two disposable posts created while
deliberately exercising cannabis-visibility filtering remain hidden from this viewer and
are queued for Admin synthetic-data cleanup: `6a8afaf61b46e1d6f0350083` and
`6a8afb981b46e1d6f03500e6`. They must not be treated as user content or silently forgotten.
