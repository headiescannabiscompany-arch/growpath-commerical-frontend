# Workspace Access and Route Recovery Production Evidence - 2026-08-03

## Scope and release identity

This record covers the authenticated, non-destructive production acceptance pass for
the Personal, Commercial, and Facility workspace route-recovery release. The pass
verified workspace eligibility, top-level route identity, tab labels, horizontal
bounds, nested-route recovery controls, and fresh browser-console state. It did not
create, edit, delete, publish, purchase, invite, or otherwise mutate a production
record.

- Production URL: `https://growpathai.com`
- Release source commit: `5d65bcca54fd755dfefc43c30c58e817c0a0edde`
- Release pull request: `#287`
- Release merge SHA: `db816c6fdf22c9e1f87388ef8f81ea307979b67a`
- Heading hotfix source commit: `ed8a66e3b3aba1951483e9fca7f8feb1991a8054`
- Heading hotfix pull request: `#288`
- Final merge SHA: `a6530eec1a20d6ee42f3f21980b29e3b63a8b14f`
- Production bundle observed at the end of the pass:
  `https://growpathai.com/_expo/static/js/web/index-4cd43153d895b3b3f59d1369a1c378ef.js`
- Final live observation timestamp: `2026-08-03T14:06:52.496Z`
- Session: authenticated Facility-plan owner account, switched explicitly among
  Personal, Commercial, and Facility workspaces
- Production writes: none

The Render dashboard was signed out and no Render API credential was available, so
this record does not claim a Render deployment ID. Production delivery is supported
by the changed production bundle and by release-specific behavior that was absent
before the merge: the Facility-plan owner account exposed Commercial workspace entry,
and Commercial Forum rendered the hotfixed `Brand Forum / Q&A` level-one heading.

## Automated release gates

Both post-merge workflows passed against each exact main SHA:

| Merge SHA                                  | Frontend CI   | Production Build Preflight |
| ------------------------------------------ | ------------- | -------------------------- |
| `db816c6fdf22c9e1f87388ef8f81ea307979b67a` | `30810168803` | `30810168752`              |
| `a6530eec1a20d6ee42f3f21980b29e3b63a8b14f` | `30818000587` | `30818000851`              |

Before the first release commit, the worktree also passed:

- all 89 frontend CI batches;
- 21 backend suites / 193 tests;
- the grow-workspace visual Playwright spec in both desktop and narrow/mobile
  emulation projects;
- TypeScript, lint, Prettier, route audit/inventory, delivery, and diff checks; and
- the complete production release preflight after an isolated clean-cache browser
  gate passed all eight checks.

The narrow Playwright project is local emulation. It is not production-mobile or
physical-device evidence.

## Production workspace and route results

The account workspace chooser showed all three eligible workspaces: Personal,
Commercial, and Facility. Entering Commercial reached `/home/commercial`; entering
Facility reached `/home/facility/dashboard`; and returning to Personal restored the
Personal workspace routes.

### Personal top-level routes

The following final-bundle routes each rendered the listed level-one heading, exactly
the six labels `Home`, `Grows`, `Forum`, `Discover`, `More`, and `Profile`, zero
horizontal overflow, and zero fresh browser-console errors:

| Route                      | Level-one heading          |
| -------------------------- | -------------------------- |
| `/home/personal`           | `Your Garden`              |
| `/home/personal/grows`     | `Grows`                    |
| `/home/personal/community` | `Forum / Q&A`              |
| `/home/personal/discover`  | `Discover`                 |
| `/home/personal/more`      | `More Personal Workspaces` |
| `/home/personal/profile`   | `Profile`                  |

### Commercial top-level routes

The following final-bundle routes each rendered the listed level-one heading, exactly
the six labels `Dashboard`, `Storefront`, `Feed / Campaigns`, `Forum`, `More`, and
`Profile`, zero horizontal overflow, and zero fresh browser-console errors:

| Route                         | Level-one heading            |
| ----------------------------- | ---------------------------- |
| `/home/commercial`            | `Dashboard`                  |
| `/home/commercial/storefront` | `Storefront`                 |
| `/home/commercial/feed`       | `Feed / Campaigns`           |
| `/home/commercial/community`  | `Brand Forum / Q&A`          |
| `/home/commercial/more`       | `More Commercial Workspaces` |
| `/home/commercial/profile`    | `Profile`                    |

The first production pass found that Commercial Forum lacked a semantic level-one
heading. The hotfix established one `Brand Forum / Q&A` level-one heading and five
level-two section headings; the final-bundle retest passed with zero overflow and zero
fresh console errors.

### Facility routes

Facility Dashboard rendered the labels `Dashboard`, `Grows`, `Tasks`, `Compliance`,
`More`, and `Profile`. The following operational routes each rendered the listed
level-one heading, one visible Back control, zero horizontal overflow, and zero fresh
browser-console errors:

| Route                       | Level-one heading             |
| --------------------------- | ----------------------------- |
| `/home/facility/tasks`      | `Facility Tasks`              |
| `/home/facility/rooms`      | `Facility Rooms & Workspaces` |
| `/home/facility/plants`     | `Facility Plants`             |
| `/home/facility/sop-runs`   | `SOP Library & Runs`          |
| `/home/facility/audit-logs` | `Audit Logs`                  |
| `/home/facility/feed`       | `Facility Outreach`           |
| `/courses`                  | `Courses`                     |
| `/forum`                    | `Forum / Q&A`                 |

### Field Study recovery

In Personal mode, a deliberately missing Field Study detail route rendered:

- one `Field Study unavailable` level-one heading;
- the alert `Field Study not found`;
- one Back control and one Retry control;
- zero horizontal overflow; and
- zero fresh browser-console errors.

The same route correctly denied access while Facility mode was active. No valid Field
Study record was changed.

## Evidence boundary and remaining acceptance

This pass is exact-SHA production desktop-web DOM and console evidence. No final-SHA
screenshot or video file is claimed, and an attempted Browser viewport override did
not change the controlled window from `1280 x 720`. The local narrow Playwright pass
therefore remains local emulation only.

The following remain open and must not be inferred from this release:

- remaining Personal Free/Pro, Commercial, Facility Owner/Manager/Staff/Viewer, and
  shared-record mutation/session chains;
- keyboard-only focus order, screen-reader software, font scaling, measured contrast,
  production-mobile, and physical-device coverage;
- a final screenshot/video evidence pack tied to a production SHA;
- real paid-course and Facility settlement, trial-expiry/downgrade, and naturally
  occurring dispute evidence;
- owner-approved knowledge sources, licenses, formulas, labels, pricing, media, and
  launch decisions;
- independent outside-user validation and owner-approved account cleanup; and
- Apple/Google/EAS/Sentry/legal/store-console setup and physical iOS/Android release
  builds.
