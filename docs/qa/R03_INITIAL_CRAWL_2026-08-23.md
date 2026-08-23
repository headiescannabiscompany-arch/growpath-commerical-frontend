# R-03 initial crawl evidence

Date: 2026-08-23  
Matrix row: `R-03`  
Status: partial — initial automated and signed-in Personal slices passed; the complete
cross-role crawl, proof-based cleanup, post-cleanup freeze and final full pass remain open.

## Candidate identity

- Frontend production bundle exercised: `d3babaff35570564e849379fab2f68f391931b9c`.
- Frontend canonical `main` after the documentation-only P-02/P-03–P-06/Nature evidence
  merge: `85c16f5b1dae2ff2d820b75ff8b4ccfb0f1a6bea`.
- Backend production fingerprint exercised:
  `growpath-backend|git=3baaae9fcd55aa567a37e8c7499d33a3517c0287|ts=2026-08-23T05:06:25.460Z`.

The `85c16f5b` frontend merge changes acceptance documentation only; it does not replace or
invalidate the `d3babaff` served UI evidence. It is not the final frozen release SHA.

## Automated initial-crawl gates

The following commands passed from a clean frontend worktree:

- `node scripts/verify-live-urls.cjs`
  - privacy, terms, support and communities;
  - Personal grow deep link;
  - delete-account, workspace-choice/switch and gift-claim routes;
  - API health, readiness and API-health routes;
  - retained output:
    `tmp/spec/live-url-checks/2026-08-23T05-19-41-962Z.json`.
- `npm run scan:release`: 1,126 files scanned; two allowlisted URLs; passed.
- `npm run audit:full-surface`: 335 route files, 322 frontend routes and 225 backend
  route declarations; zero errors and zero warnings.
- `npm run audit:growpath-system`: all 32 registered modules present; decision checks
  passed.
- `npm run verify:codex-workflow`: all 11 workflow requirements passed.

### Current-candidate continuation — 2026-08-23 17:25 UTC

The same non-authenticated packet was rerun after the B-02/business retention reconciliation,
with current production frontend candidate `6791268981826f1154dae0db1a780a33e1fff676`
and backend candidate `be00d33ff66fea5322fa6e7cac68fe21298d4753`:

- `node scripts/verify-live-urls.cjs` passed 12/12 targets: Privacy, Terms, Support,
  Communities, Personal grow deep link, account deletion, workspace choice/switch, gift
  claim, API health, readiness and API-health alias. The retained result is
  `tmp/spec/live-url-checks/2026-08-23T17-25-25-363Z.json`.
- `npm run scan:release` passed 1,127 files with only the two approved local URL entries.
- `npm run audit:full-surface` found 336 frontend route files, 323 frontend routes and 225
  backend route declarations with zero errors and zero warnings.
- `npm run audit:growpath-system` found all 32 registered foundations present.
- `npm run verify:codex-workflow` passed all 11 workflow requirements.

This advances the automated/public crawl only. It does not replace the still-open signed-in
role, mutation, provider, responsive/theme, accessibility or recovery passes.

### Nested-worktree test-runner portability repair

The current candidate audit exposed a Windows-only test-discovery defect when the repository
was run from a nested `.codex-worktrees` path. Jest combined `<rootDir>` globs with mixed slash
styles and reported zero tests even though the suites were present. `jest.config.cjs` now uses
root-independent discovery globs and slash-independent, escaped absolute ignore patterns. A
focused regression suite protects both discovery and the frontend exclusions for embedded
backend and dependency directories.

After the repair, `npm run verify:connected-workflows` passed end to end from the nested
worktree: lint passed, all 59 selected suites and 478 tests passed, and the production web
export passed. The run retained existing React `act(...)` warnings in Communities, Forum,
VirtualizedList and BackendCalculatorToolScreen output; those warnings remain visible as
test-quality findings and were not suppressed or misreported as failures.

The repair and evidence merged through frontend PRs 767 and 768. The resulting exact-main
frontend candidate is `b0708b16f95ef50b46c2f43e888dd7ab554944f8`. Production Build
Preflight run `32657135541` passed, and exact-main Frontend CI run `32657135493` passed every
step in 11m42s: install, Expo version verification, Expo Doctor, production dependency audit,
lint, TypeScript, sensitive-copy guard, Browser workflow contract, delivery guard and the
full batched test suite. The only annotation was GitHub's Node action-runtime deprecation
notice; it did not fail the gate.

Production was last modified at `2026-08-23T18:11:41Z` and continued to serve the unchanged
product bundle `index-b00e54ff415ca6b258ada3205c0e36fb.js`; the candidate changed test and
evidence infrastructure, not shipped product behavior. The public packet passed 12/12 again
at `2026-08-23T18:14:25Z`, retained as
`tmp/spec/live-url-checks/2026-08-23T18-14-25-578Z.json`. Backend health remained green.

### Public presentation crawl — 2026-08-23 18:19 UTC

A fresh unauthenticated browser crawl loaded Home, Features, Pricing, Personal Grower,
Commercial Cultivation, Facility Management, Creators/Educators, Courses, Forum and Support.
Each route rendered one clear H1, meaningful product copy and its intended public or
sign-in-required state without a crash or access-boundary error. The Facility page accurately
advertised the Facility → Room → Grow → Plant hierarchy and server-enforced roles; Pricing
showed the current Free, Pro, Commercial and Facility amounts; Courses truthfully displayed
an empty public catalog; Forum kept discussions behind attributable sign-in; Support exposed
the intended issue categories and direct inbox guidance.

The crawl found one bounded professional-presentation defect: every client-side route kept
the generic `GrowPath | Grow planning, tracking, and facility tools` browser title. The
production export script already owns correct route-specific SEO titles and descriptions, so
the repair must reuse that canonical registry at runtime rather than introduce page-local
copies. Final acceptance must verify title, description, canonical and social metadata after
client navigation as well as in each exported HTML entry. This defect is now explicit and is
not permission to rebuild the public pages that otherwise passed.

The metadata defect is live accepted on frontend main
`c8b50286957805b43171e5219a51f8b56319d7bf` (PR `#769`). The production exporter and
runtime now consume one shared route-metadata registry. Focused DOM acceptance proved title,
description, robots, Open Graph and canonical changes, and the production export plus SEO
verifier passed. PR CI run `32658736562` passed completely; exact-main Frontend CI run
`32659415264` and Production Build Preflight run `32659415253` also passed. In production, a fresh navigation to
`/features?verify=runtime-public-metadata-live` rendered title and `og:title`
`GrowPathAI Features | Connected cultivation workflows`, the route-specific description,
`index,follow`, and canonical `https://growpathai.com/features`. This closes only the bounded
public runtime-metadata defect; it does not close the remaining final-candidate crawl below.

- `npm run validate:v1-matrix`, `npm run validate:v1-ui-surface`,
  `npm run validate:frontend-runtime-contract`, and
  `npm run validate:backend-route-contract`: passed.
- `npm run guard`: passed every enforced contract, contamination check, delivery scan,
  and the seed-ready Diagnosis/IPM and Facility planning lanes.

The guard correctly retained, rather than hiding, these non-code evidence gates:

- Plant Identification needs the remaining reviewed real-world media records before its QA
  catalog can enter strict seed-ready mode.
- Living Soil Labs commerce needs owner-supplied product evidence and exact commercial
  configuration before its QA catalog can enter strict mode.
- The Facility simulator is seed-ready but still needs its 27 named staging/browser
  acceptance records.

These are not reasons to rebuild their existing product assemblies.

## Signed-in Personal production slices

Account/workspace: owner Personal workspace, Pro plan.  
Theme observed: Night.  
Viewport: current Codex in-app Browser desktop viewport.

Verified without changing account settings or publishing content:

- Personal Home loaded a populated active-grow command center with working, grow-scoped
  links for grow, journal/photo entry, AI tools, diagnosis, tasks and integrations.
- The Home mini globe rendered with an honest zero-public-observation state, explicit
  location-off explanation, Globe and Plant ID links, and no fabricated pins.
- Profile loaded real plan, AI-credit, notification, theme, billing/data-rights and
  workspace controls.
- Profile loaded real video quota from the protected backend: `673.7 MB used of 10.0 GB`
  and `9.3 GB` remaining.
- `Manage My Videos` opened `/videos?tab=library`, which showed the same approximately
  674 MB / 10 GB quota and two workspace videos. The route exposed discover/library tabs,
  hosted-versus-external storage copy, provider choices and visibility controls.
- The Personal grow list persisted four current grows after its loading state and exposed
  search, archive, journal, tasks, AI Tools, Timeline, integrations and PDF export paths.
- The known disposable Plant-ID grow opened with its persisted crop identity, Grow Calendar,
  Plants, Journal, Tasks, AI Tools, Automation, Timeline, Compare, integrations, report and
  share paths.

## Mutation and cleanup note

The two known disposable Plant-ID grow IDs remain:

- `6a8a27ee0ad1a2c8f9e57fa6`
- `6a8a27d80ad1a2c8f9e57f95`

The in-app Archive control was reached again on deployed frontend `c32c8676`. Both semantic
and visible-DOM clicks stalled at the JavaScript confirmation boundary, while a fresh tab
still showed four active grows and both Archive controls. No archive success is claimed: both
records are verified active. The exact remaining action is for the owner to accept the two
reversible archive confirmations in the product UI. Do not use the automation limitation as
evidence of a product defect or rebuild Archive without a human reproduction.

## Continued signed-in Personal crawl

The same Personal Pro session continued on the served `d3babaff` product behavior before the
Facility repair deployment. These are live route and state checks, not permission to rewrite
the retained implementations:

- Personal Home completed its asynchronous load and exposed the real active grow plus exact
  grow, log, photo, AI, diagnosis, task, journal and integration destinations. The empty
  telemetry, task, diagnosis, journal and photo states remained honest and actionable.
- The visual Grow timeline loaded one retained event with Lifecycle/Month/Week/Day controls,
  source link, viewer-friendly and visual exports, and the separate reviewed share route.
  The share route produced an exact private preview, stated its private-field exclusions,
  disclosed cannabis/hemp visibility handling and exposed separate Cancel and Publish Copy
  actions. Cancel returned to Personal without publishing.
- AI Tools completed its live credit load at `87 / 100`, explained 13 charged requests and
  zero refunds, and exposed Harvest Readiness Calculator by its full product name with a
  grow-optional boundary.
- Lives rendered an honest zero-session directory with All, Campaign-linked, Upcoming, Live
  now, Premieres and Replays states. Live Studio retained the existing private draft,
  live/premiere choice, outside URL or GrowPath-hosted choice, Twitch/YouTube/Kick/Facebook
  Live/Instagram/other destinations, schedule/reminders, GrowPath chat, outside-picker feed,
  review-before-publish flow and Discord announcement integration. No draft was changed or
  published.
- The published-video viewer retained native playback controls, reporting, Follow,
  Discussion, Copy Link and reviewed external share targets. Forum rendered its honest empty
  discussion state, diagnosis/grow templates and video-library entry. Courses rendered the
  retained private QA course and author workflow without claiming public inventory.
- The canonical notification center loaded real categories, device-push state, unread task
  notifications and source actions. Live evidence exposed a bounded usability defect:
  Personal task notifications linked only to the general task list and offered a redundant
  Create Task action even though the source task already existed.
- Direct Commercial and Platform Admin URLs failed closed for this non-authorized identity;
  the session then returned to Personal.

The notification defect is live accepted at frontend merge
`5cb107aa2ecb63e4d94d28bbc02edbe22c3971a5`, Render deploy
`dep-da590nrl550s7383paq0`. Personal task sources carry their exact task ID and task-origin
notifications no longer offer a duplicate Create Task action. The retained notification used
for production acceptance referenced a task that had already been removed; the exact link
therefore opened the required authorized "not found or no longer available" state with a
`View all tasks` escape instead of fabricating a task or silently opening the general queue.
The complete CI job passed before merge. Do not rebuild this notification handoff.

## Nature and integration continuation evidence

- Personal Field Studies retained separate `Maydale Nature Classroom` and `Raleigh park`
  studies. Maydale is public but contains zero observations. Raleigh contains one private
  Magnolia draft with attached photo evidence; the product correctly states that device
  coordinates, public Field Study state, approximate-location consent and explicit
  observation publication are still required. Therefore the public globe's zero-pin state is
  a truthful data state, not evidence of a missing map implementation.
- The current Plant ID/Nature entry already supports up to 12 photos, video with frame
  extraction, retained source photo/video metadata, authorized current-device GPS, reviewed
  manual pin placement, observation date, optional Field Study linkage and a separate
  approximate-public-location opt-in. Nothing is published by default. Fresh non-sensitive
  Maydale media plus owner confirmation at publication time remains the exact P-05/N-01 live
  mutation gate; legacy recovery is optional. Do not rebuild the location/date/pin pipeline.
- Personal Data Integrations loaded its implemented provider catalog, encrypted credential
  entry, test/connect states, review-gated provider structure mapping, Growlink read-only
  flow and exact-grow history import. The live crawl found three bounded presentation defects:
  duplicate route/screen headings, a Home telemetry link that dropped its active-grow context,
  and a raw internal Grow ID field. The current branch preserves the provider engine while
  hiding the duplicate header, carrying `growId` from Home, validating deep links against the
  active workspace and presenting only named owned-grow choices. Focused tests and TypeScript
  pass. The repair merged as frontend `1f800c87bfb57b8f6093887a43be94664f818d70`
  after the complete GitHub CI job `97156220951` passed and deployed successfully as Render
  `dep-da59lo3bc2fs73am0rr0`. Live Personal regression proved one page heading, four named
  owned-grow choices, no raw Grow ID input, a selected Grow revealing the retained mapping
  and read-only provider controls, and the Home telemetry action preserving exact active Grow
  `6a8a27ee0ad1a2c8f9e57fa6`. A fabricated deep-linked Grow ID produced the explicit
  workspace-unavailable alert, selected nothing and kept provider/mapping actions gated.
  Personal Data Integrations is live accepted; Commercial remains a separate authorized-login
  role regression, not a reason to rebuild this shared screen.

## P-10 timeline publication and export evidence

- The reviewed timeline workflow was exercised with an owned disposable Grow. Cancel
  published nothing. A cannabis-specific copy published only after exact preview and then
  failed closed for a viewer that did not satisfy the cannabis-interest gate. Withdrawal
  made its old URL unavailable without changing the private Grow.
- A non-cannabis one-event timeline for Grow `6a603a8fda5c5bfdc030ac1b` published as frozen
  version 1. Its unguessable public viewer rendered the selected event, snapshot disclaimer,
  reporting, copy/device share and Facebook, X, Bluesky, Reddit, LinkedIn, email and text
  actions. Withdrawal then made the same URL unavailable. No temporary public copy remains.
- The first publish exposed an infrastructure limit rather than an application failure: the
  MongoDB cluster had reached 500 of 500 collections. Proof-based cleanup removed only the
  unrelated `sample_mflix` demo database (six collections) and 87 exactly empty collections
  ending `_test` from the active production database. Source scans found no production model,
  route or service references to those names. Production retained 105 active collections,
  zero `_test` collections and 92 free cluster slots; API health passed afterward.
- The viewer-friendly export loaded the real Grow package (3 logs, 4 tasks, 23 ToolRuns) and
  downloaded a valid 15,601-byte visual-timeline HTML file. Inspection found no account,
  workspace, authorization, database or telemetry secrets, but one saved AI journal note
  printed a large raw JSON payload and internal `evidenceFingerprint`. Frontend `dfc10201`
  now centralizes export formatting, preserves ordinary prose, replaces machine payloads with
  a private-record handoff and bounds oversized prose. It merged in PR 748 as
  `e3d33b5302613492324e697d7a094b5681f0c873` after GitHub job `97158494956` passed and
  deployed successfully as Render `dep-da59vjuq1p3s73b2h8n0`.
- Live regression then found the same raw payload in the private on-screen eight-row preview,
  although the download generator was sanitized. The preview now reuses the same formatter
  while leaving the evidence-oriented CSV unchanged. PR 749 passed the complete GitHub job
  `97160455770`, merged as `c32c8676b31d17a80b784b08e526407d4412e86b` and deployed as
  Render `dep-da5a7gs9v7es73f1pq50`. The real production package now displays `Tool:
harvest_readiness. Detailed evidence remains in the private GrowPath record.` and contains
  no visible raw JSON or `evidenceFingerprint`. Together with the previously inspected real
  HTML file, exact shared formatter, focused sanitizer tests and both complete CI passes, this
  closes P-10 live acceptance. The ordinary final-candidate crawl should repeat one file
  download in a download-enabled browser; repeated automatic downloads were not emitted by
  the in-app browser after the prior QA file was preserved and removed.

## Continued signed-in Commercial crawl

- The signed-in Living Soil Labs owner crawl loaded Storefront, Feed / Campaigns, Forum,
  More and Profile under the same explicit Commercial workspace. The Storefront remained a
  truthful unpublished draft at 2/14 launch checks; Feed retained an empty-state draft
  boundary; Forum displayed the existing support discussion under the verified brand; and
  More retained visible links to Commercial destinations intentionally omitted from the
  compact six-tab bar.
- The crawl found one bounded usability defect in quick product creation: the ordinary form
  exposed Stripe IDs and raw Inventory, Product Line, recipe, batch, evidence-run and course
  IDs even though readable owner-scoped Inventory and Product Line choices were already
  loaded. The candidate branch now makes those named choices the normal workflow and moves
  every technical identifier behind an explicitly opened `Advanced product links` control.
  Empty named-choice lists remain truthful optional-link states. The raw fields and their
  existing payload behavior remain available to authorized advanced users rather than being
  removed.
- Local and live acceptance are complete on frontend `ee1e90f3`: `StorefrontRoute.test.tsx` proves the raw controls are absent
  initially, become available after expansion and still submit the exact links; all 10
  focused tests pass and `tsc --noEmit` passes. Production showed the named B-02 Inventory
  choice while raw Stripe and database fields were absent, restored every field through the
  explicit Advanced control, and hid them again without a record mutation.
- The next Commercial Grows crawl found a real empty-state defect: when no grow existed, the
  page linked Integrations and PDF Export to URLs ending in an empty `growId=`. The candidate
  replaces those unusable links with a direct Create Grow prerequisite action while retaining
  the exact grow-scoped links once a grow exists. Local and live acceptance are complete on
  frontend `8ccfb6e7`: all five focused route tests and `tsc --noEmit` passed; production showed
  three Create Grow paths and no Integrations or PDF Export link while the Commercial workspace
  remained empty. Exact-main release gates remain open until their workflow conclusions are
  recorded.
- A read-only Commercial route pass also loaded Discover, Notifications, Tasks, Courses,
  Lives, External Channels, Orders, Analytics, Product Lines, Product Batches, Product Trials,
  Inventory Support, Horticulture Operations, Public Links and AI Tools without authentication,
  transport-code or failed-load presentation. Truthful empty states remained distinct from
  failures. Lives retained the existing direct Live Studio entry for GrowPath/OBS streaming,
  chat overlays and premieres while separately reporting that Twitch OAuth is not configured.
- The Commercial Lives candidate now loads readable owner-authorized Course, Product, Feed
  campaign and accessible Forum-thread choices, provides direct creation/review paths for
  empty lists, and retains raw IDs only behind an explicitly opened advanced control. Focused,
  full, deployment and live acceptance of this candidate remain open.

## Exact remaining R-03 work

1. Complete authenticated Personal, Commercial, Facility and Admin role/state/action
   scenarios, including populated, empty, denied, retry, persistence and cleanup evidence.
2. Complete provider/device gates already named by their owning matrix rows. Record an exact
   blocker where an owner credential, physical device or fresh real-world observation is
   required.
3. Run the complete responsive/theme/keyboard/focus/accessibility and professional visual
   presentation crawl on the candidate.
4. Classify cleanup candidates only with route/import/provider/worker/webhook/migration/data
   compatibility proof; remove only proven unreachable, superseded or duplicate code in
   small reversible commits.
5. Freeze new frontend/backend SHAs, run affected plus full release gates, deploy those exact
   SHAs, and repeat the complete crawl. Only that final post-cleanup pass may close `R-03`.
