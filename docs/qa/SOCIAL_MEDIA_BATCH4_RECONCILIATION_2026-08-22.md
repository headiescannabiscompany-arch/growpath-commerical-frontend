# Community, media, Lives and courses — Batch 4 reconciliation

Date: 2026-08-22  
Frontend baseline: `689474493cd82a866e6c8b20df781950c37fb378`

## Retained architecture

The retained Hosted Live/OBS implementation is preserved. Current main retains the two
broadcast modes, reusable owner-isolated channel model, explicit private draft and publish
transition, player/chat/overlay/replay surfaces, viewer controls, and canonical session
sharing. The older lifecycle branch is not replayed because its final tree predates newer
privacy, integration, Admin and navigation work.

The exact discovery-link branch is likewise already represented by current main. The dirty
canonical-sharing worktree's only semantic change was preserved as commit `83aa8f7e`; an
attempted cherry-pick was empty because current main already labels unpublished sessions
as private drafts and withholds public sharing controls. No retained worktree was deleted.

## Automated evidence

- 75 assertions passed across 10 focused suites for Live Studio, Live viewer/session,
  directory, Commercial Lives, video discovery/library/detail, course creation/detail,
  and public share targets.
- A focused rerun of Live viewer, Studio and directory behavior passed 34 assertions.
- The private-draft regression is present in both implementation and test: an unpublished
  record cannot display a public badge or public share panel.

## Remaining construction boundary

This reconciliation does not mark S-01 through S-08 live accepted. Existing canonical
public records (videos, Lives, Forum, courses, storefronts and opted-in Nature findings)
already share their stable record URLs. Private owner-scoped material still correctly
opens a reviewed public-copy draft rather than silently publishing private data.

P-10 and S-06 still require one deliberately designed revocable snapshot/viewer lifecycle
for a grow timeline. It must persist a sanitized snapshot, keep editing separate from the
published copy, expose review/cancel/publish/reload/copy/native-share/withdraw, and never
leak exact location, private operational fields, evidence permissions or later private
edits. This must reuse a shared public-copy contract rather than mutate the Grow itself or
create a parallel social-media subsystem.
