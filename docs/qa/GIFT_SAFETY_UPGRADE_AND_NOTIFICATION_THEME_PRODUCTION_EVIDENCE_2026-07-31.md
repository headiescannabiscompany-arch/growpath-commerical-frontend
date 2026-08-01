# Gift Safety, Upgrade Heading, and Notification Theme Production Evidence

Date: 2026-07-31 (America/New_York)

## Releases

- Backend gift-checkout safety: PR `#96`, main `adb08e0`
- Backend main CI: `30676063902` (passed)
- Frontend gift-checkout safety: `24831d73`
- Gift Frontend CI: `30676117061` (passed)
- Gift Production Build Preflight: `30676116976` (passed)
- Personal upgrade heading: `53c4495a`
- Heading Frontend CI: `30676475482` (passed)
- Heading Production Build Preflight: `30676475467` (passed)
- Notification Center active-theme fix: `520ede43`
- Notification Frontend CI: `30676909346` (passed)
- Notification Production Build Preflight: `30676909387` (passed)
- Facility More heading hierarchy: `18b1e149`
- Facility More Frontend CI: `30677284453` (passed)
- Facility More Production Build Preflight: `30677284452` (passed)
- Facility Integrations active-theme fix: `612c4cab`
- Facility Integrations Frontend CI: `30677646664` (passed)
- Facility Integrations Production Build Preflight: `30677646668` (passed)
- Facility Pulse protection/theme implementation: `ee1ee1d4`
- Facility history-import combined release: `52b42ba6`
- Combined Frontend CI: `30678355952` (passed)
- Combined Production Build Preflight: `30678355928` (passed)
- Shared Environment Review active-theme fix: `af2acc6f`
- Environment Review Frontend CI: `30678713687` (passed)
- Environment Review Production Build Preflight: `30678713688` (passed)
- Shared mix-builder chooser active-theme fix: `092ce73b`
- Mix-builder chooser Frontend CI: `30679308195` (passed)
- Mix-builder chooser Production Build Preflight: `30679308212` (passed)

## Confirmed gift defect and safety boundary

The former frontend collected a recipient email, optional recipient name and
message, and a monthly or yearly gift term, then opened the ordinary
subscription checkout. The authoritative backend did not consume those gift
fields. Its webhook granted the plan to the payer, so taking payment could not
fulfill the advertised recipient handoff.

The production backend now reports `giftCheckoutConfigured: false` and rejects
`giftMode: true` before user lookup or Stripe with HTTP 409 and code
`GIFT_SUBSCRIPTION_NOT_CONFIGURED`. The response states that no checkout or
payment was created. The production frontend reads that capability, disables
`Gift someone else`, omits all recipient fields, explains that recipient
fulfillment and claim delivery are not configured, and retains ordinary
buy-for-me checkout.

This is a payment-safety closure only. Recipient claim, delivery email,
activation, privacy, and recipient-side acceptance remain open, so the gift
subscription feature is not marked complete.

## Live gift and heading acceptance

Signed-in production Browser checks covered `/offers` and
`/home/personal/upgrade` without opening Stripe:

- `Gift subscriptions unavailable` was disabled.
- The unavailable explanation was visible and recipient inputs were absent.
- Ordinary Pro, Commercial, and Facility actions remained at $10, $50, and
  $100 per month.
- No checkout session, payment, subscription, trial, or account mutation was
  created.
- The Personal upgrade page exposed exactly one level-one heading,
  `Upgrade Account`; the internal route title `upgrade/index` was absent.

## Confirmed Notification Center theme defect and live acceptance

With the signed-in Facility account reporting `Current: AUTO / Resolved:
NIGHT`, Dashboard, Profile, and the read-only Inventory create route already
used the Night palette. The shared Notification Center was the confirmed
mismatch: it retained a light green/white canvas and cards.

Frontend `520ede43` replaced those fixed colors with the active app palette for
the page, header, cards, filters, badges, text, links, status feedback, and
loading indicator. The production page
`/home/notifications?workspace=facility` was then reloaded after both safeguards
passed. It displayed the dark blue-gray Night canvas and cards, bright text,
and blue active actions. All six category switches remained visible and on:
Task reminders, Forum replies, Video activity, Courses and lives, Commerce
updates, and Facility alerts. No switch was changed and no preference was
saved during acceptance.

The Browser was returned to `/home/facility/dashboard`; the account was not
logged out.

## Facility More heading hierarchy

The same signed-in production pass found two level-one headings on
`/home/facility/more`: the navigator title `More` and the page-owned title
`More Facility Workspaces`. Frontend `18b1e149` hides only that route's
navigator header and keeps the descriptive page heading plus every destination
and compact bottom tab.

After both safeguards passed, the final production DOM contained one native
`h1` / one explicit level-one heading, `More Facility Workspaces`, followed by
four explicit level-two group headings. The Night palette remained intact and
all Facility operations, admin/records, learning/community, and workspace links
remained visible. No destination or record action was invoked.

## Facility Integrations Night theme

The next signed-in production inspection confirmed that
`/home/facility/integrations` still rendered a fixed light canvas, white
provider cards, off-white content cards, and day-only green actions while the
Facility account was resolved to Night.

Frontend `612c4cab` moved the page, provider choices, cards, inputs, mapping
rows, provider statuses, text, borders, feedback, and actions onto the active
app palette. After both safeguards passed, the production route displayed the
dark blue-gray canvas and cards, bright text, and blue actions while retaining
Pulse, TrolMaster, controller-history import, and all eight planned provider
entries. The Viewer boundary still prevented adding a Pulse connection. No
provider was selected, no external email link opened, no file was uploaded,
and no integration or mapping record changed.

## Facility integration direct-route protection

The production Viewer could not press `Connect Pulse` from Integrations, but
direct navigation to `/home/facility/tools/pulse` bypassed that presentation
guard and exposed the connection label, secret API-key input, and verification
action. The form also retained a white card, white fields, and a day-only green
action in resolved Night mode. The linked history-import route similarly
rendered nearly black explanatory/empty-state text on the dark canvas, and its
Integrations entry was still actionable for the Viewer.

Frontend `ee1ee1d4` added owner/manager enforcement inside the Pulse route,
removed provider credential and verification controls for other roles, moved
the route to the active palette, and corrected its page/subheading hierarchy.
Frontend `52b42ba6` applied the same owner/manager boundary before grow loading
or importer rendering, themed the history route, and disabled both write entry
points on the Integrations page for the Viewer. The newer combined release
superseded the standalone Pulse preflight, so production acceptance relies on
the two passing `52b42ba6` safeguards listed above.

Live final-SHA acceptance proved:

- `Connect Facility Pulse` and `Import Facility grow history` both exposed
  `aria-disabled=true` on Integrations.
- Direct Pulse showed a Night-themed `Pulse connection setup is read-only`
  alert, one level-one page heading, one level-two status heading, and no label,
  API-key, verification, or discovered-device controls.
- Direct history import showed a Night-themed `Grow history import is
  read-only` alert, one level-one page heading, one level-two status heading,
  and no grow selector, grow API result, or shared importer/uploader.
- No API key, file, provider request, connection, mapping, grow, or imported
  history record was created or changed.

## Shared Environment Review Night theme

Production Facility Environment Review reused the Personal implementation but
retained a white canvas, light telemetry panel, white inputs, dark day-only
labels, and green action styling under resolved Night mode. Its rule-based
analysis was intentionally still available to the Viewer and clearly stated
that it uses no AI credits; save remained unavailable without a selected grow,
so no permission defect was inferred from the calculation controls.

Frontend `af2acc6f` converted the shared page, labels, inputs, telemetry panel,
status/locked treatments, and primary action to the active app palette. After
both safeguards passed, signed-in production acceptance covered the same code
through both routes:

- `/home/facility/tools/environment` rendered the Night palette with the full
  input set, disabled grow prefill, ready result surface, no-credit disclosure,
  and no selected-grow save context intact.
- `/home/personal/tools/environment-analysis` rendered the same Night palette
  and controls after switching to Personal without logging out.
- No input was changed, no analysis/API or AI request was submitted, no result
  was copied, and no tool run, log, task, grow, credit, or other record changed.
- The session was returned to `/home/facility/dashboard`.

## Shared mix-builder chooser Night theme

The Facility Soil & Nutrient Mix Builders hub retained nearly black headings
and explanation text on the Night canvas, white builder cards, and a day-only
green library action. The route wraps the same chooser used by Personal, so the
fixed styles were shared even though each workspace preserved different
destination paths and context.

Frontend `092ce73b` moved the chooser canvas, text, cards, separators, and
library action to the active app palette. After both safeguards passed,
production acceptance covered:

- `/home/facility/tools/recipe-builder`, with Night-themed Nutrient Mix Builder,
  Soil Mix Builder, and Products & Label Library destinations retaining their
  Facility paths.
- `/home/personal/tools/recipe-builder`, with the same Night palette and all
  three destinations retaining their Personal paths after a workspace switch.
- The two-builder semantic boundary remained explicit: the reusable label
  library stores shared inputs and is not presented as a third mix builder.
- No destination was opened, no form or product label was changed, and no mix,
  tool run, task, log, grow, credit, or other record changed.
- The session was returned to `/home/facility/dashboard` without logout.

## Automated verification

## Facility Audit Entity History Night theme

Production entity-scoped audit history retained a dark-on-dark page heading
and white day-only history cards. Frontend `ee82245c` moved loaded and status
states, history cards, timestamps, summaries, and detail links to the active
palette while preserving the filtered immutable event set.

- Production Build Preflight `30683127914` passed in 3m22s and Frontend CI
  `30683127932` passed in 5m19s.
- Nine focused audit/compliance tests passed, including Audit Detail and entity
  history Night palettes, exact readable audit presentation, raw-identifier
  boundaries, list/loading semantics, and compliance drill-in back routes.
  Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
- Signed-in production acceptance followed an existing task-linked audit event
  to its read-only entity history and confirmed one level-one heading plus the
  three expected Created/Updated cards, timestamps, summaries, and detail links.
- No detail link was opened from the history page and no task, audit event, or
  record changed. The session was returned to the Facility dashboard without
  logout.

## Facility Audit Log Detail Night theme

Production Audit Log Detail retained a dark-on-dark page heading and white
day-only summary/raw-record cards under resolved Night. Frontend `d0268128`
moved loaded and status states, metadata, cards, links, and selectable raw JSON
to the active palette while preserving the immutable payload unchanged.

- Production Build Preflight `30682823366` passed in 3m33s and Frontend CI
  `30682823363` passed in 6m55s.
- Eight focused audit/compliance tests passed, including the Night palette,
  readable audit presentation, raw-identifier boundary, entity drill-in, list
  semantics, loading state, and compliance back routes. Targeted ESLint, full
  frontend `tsc --noEmit`, and `git diff --check` passed.
- Signed-in production acceptance opened an existing weekly token-reset event
  read-only and confirmed one level-one heading, readable summary/metadata, the
  immutable-record disclosure, and the exact raw JSON on the Night palette.
- No link, filter, audit action, token action, or record mutation was invoked;
  the session was returned to the Facility dashboard without logout.

## Facility SOP Start and Compare Night theme

Production Start SOP Run and Compare SOP Runs retained dark-on-dark headings
and copy, white day-only inputs/cards, and fixed day actions on the Night
canvas. Frontend `87bb32c7` moved the start form to the active palette and
added an explicit level-one page heading. Frontend `c2fc55b5` moved the compare
chooser, selection summaries, run cards, actions, and empty/error states to the
palette and includes the Start fix in the final deployed asset.

- SOP Start Production Build Preflight `30681990245` and Frontend CI
  `30681990244` passed. Final combined SOP Compare Production Build Preflight
  `30682494069` passed in 3m19s and Frontend CI `30682494076` passed in 6m56s.
- Sixteen focused SOP tests passed across run evidence, completed-run locking,
  back routes, Library/Start/Compare Night palettes, comparison semantics,
  authoring, upload, retirement, and one-off creation. Targeted ESLint, full
  frontend `tsc --noEmit`, and `git diff --check` passed.
- The production host initially retained the prior asset after the Start gates;
  acceptance waited until it published `index-0e41fd6fc35a77343c421ed10231d1d1.js`,
  which contains final `c2fc55b5`.
- Signed-in production acceptance confirmed both pages use the Night palette
  and one level-one page heading. Start retained empty title, optional/unselected
  template, untouched one-off steps/notes, and disabled Start. Compare retained
  zero selected runs, its truthful insufficient-history message, and disabled
  Compare.
- No template was selected, no text was entered, and no SOP, run, checklist,
  comparison, task, audit event, or record changed. The session was returned to
  the Facility dashboard without logout.

## Facility SOP Library Night theme and heading hierarchy

Production SOP Library retained nearly black headings/copy, white starter and
active-SOP cards, and a pale day-only Viewer notice on the Night canvas.
Frontend `baf4f2d7` moved the complete Viewer and owner/manager library/editor
surface to the active palette. Its first live check also exposed all three
major headings as level one; follow-up `994f376b` established one level-one
page heading, two level-two sections, and a level-three supporting-documents
heading when the editor is available.

- Final Production Build Preflight `30681718327` passed in 3m27s and Frontend
  CI `30681718326` passed in 5m04s. The color implementation gates also passed:
  preflight `30681401023` and Frontend CI `30681401052`.
- Fourteen focused SOP tests passed for back routes, run evidence, pending and
  completed-run controls, comparison, reviewed authoring, upload, retirement,
  one-off run creation, Night palette, and heading levels. Targeted ESLint,
  full frontend `tsc --noEmit`, and `git diff --check` passed.
- Signed-in Viewer production acceptance confirmed all standard starter cards,
  the read-only permission notice, the active three-step SOP, and the existing
  Start run link remained readable and present under resolved Night.
- The existing SOP was not opened or started; no template, upload, checklist,
  run, task, audit event, or record changed. The session was returned to the
  Facility dashboard without logout.

## Facility Analytics Night contrast

Production Facility Analytics used the Night canvas but retained nearly black
day-only title, explanatory copy, metric values, labels, and details, making
the operational summary unreadable. Frontend `c00d8702` moved those headings,
metrics, details, and borders to the active palette.

- Production Build Preflight `30681037874` passed in 2m25s and Frontend CI
  `30681037883` passed in 6m52s.
- Two focused analytics tests passed, including the recorded/unknown stability
  contract and an explicit Night-palette regression. Targeted ESLint, full
  frontend `tsc --noEmit`, and `git diff --check` passed.
- Signed-in production acceptance confirmed readable Facility Analytics title,
  explanatory copy, all six metric values/labels/details, and the correctly
  rendered training-assignment separator under `AUTO / Resolved: NIGHT`.
- No refresh, campaign, metric, navigation, or record mutation was invoked; the
  session was returned to the Facility dashboard without logout.

## Shared Products & Label Library Night theme

Production Facility Products & Label Library retained a white canvas, dark
day-only headings, white actions and inputs, and a light empty-state card under
resolved Night mode. Frontend `23749f92` moved the shared Personal/Facility
catalog canvas, text, cards, selection states, inputs, chips, and actions to the
active palette.

- Production Build Preflight `30680714742` passed in 3m10s and Frontend CI
  `30680714723` passed in 6m33s.
- Six focused catalog/chooser tests passed, including an explicit Night-palette
  regression. Targeted ESLint, full frontend `tsc --noEmit`, and
  `git diff --check` passed.
- Signed-in production checks covered `/home/facility/tools/ingredient-library`
  and `/home/personal/tools/ingredient-library`, including the empty catalog,
  actions, media/AI disclosure, and actual populated/default form-control area.
- No action that changes state was invoked: no media upload, AI extraction,
  favorite/confidence/release toggle, value edit, save, archive, ingredient,
  credit, or other record changed.
- The session was returned to the Facility dashboard without logout.

## Shared Soil Mix Builder Night theme

Production Facility Soil Mix Builder retained a white canvas, dark day-only
headings and labels, pale guidance card, and white form inputs under resolved
Night mode. Its science-basis component was already corrected by `391dc109`,
which isolated the remaining mismatch to the shared backend-calculator shell.

Frontend `aae5e7c6` moved that common shell's canvas, headings, guidance and AI
cards, grow selectors, labels, option cards, inputs, actions, and feedback to
the active palette. Production Build Preflight `30680374034` passed in 3m24s
and Frontend CI `30680374024` passed in 6m55s.

- Twelve focused shared-calculator/Soil Builder tests passed, including an
  explicit Night-palette regression. Targeted ESLint, full frontend
  `tsc --noEmit`, and `git diff --check` passed.
- Signed-in production checks covered `/home/facility/tools/soil-builder` and
  `/home/personal/tools/soil-builder`, including the top guidance/science
  surfaces and the actual labels and populated input region.
- All expected guidance, prefill state, AI action, recipe fields, and run action
  remained present. No field value, AI request, calculator run, ToolRun, task,
  log, batch, product draft, grow, credit, or record changed.
- The shared-shell conversion benefits its other calculator routes, but this
  acceptance claim is limited to the Soil Mix Builder routes inspected live.
- The session was returned to the Facility dashboard without logout.

## Shared Nutrient Mix Builder Night theme

The shared NPK screen retained a light canvas and day-only form surfaces under
resolved Night mode. Frontend `e3e8f975` moved the complete builder to the
active palette. The first production retest correctly caught one remaining
light island in the reused science-basis component; follow-up `391dc109` moved
that shared panel to the palette as well.

- Production Build Preflight `30680014007` passed in 3m13s and Frontend CI
  `30680013998` passed in 5m29s for the final follow-up.
- Sixteen focused NPK/back-route tests passed for the main conversion; twelve
  focused NPK/Soil tests passed for the shared science-panel follow-up. Targeted
  ESLint, full frontend `tsc --noEmit`, and `git diff --check` also passed.
- Signed-in production checks of `/home/facility/tools/npk` and
  `/home/personal/tools/npk` showed the Night canvas, science panel, AI panel,
  form controls, presets, target profile, water baseline, and product row with
  no remaining light island.
- No input or preset was changed; AI, calculation, copy, save, ToolRun, task,
  log, grow, credit, and record mutations were not invoked. The session was
  returned to the Facility dashboard without logout.
- The shared science component also benefits Soil Builder, but this does not
  claim complete live Night-theme acceptance for the full Soil Builder screen.

- Backend gift routes/webhooks/Facility billing: 31 focused tests passed.
- Frontend gift checkout/API safety: 34 focused tests passed.
- Personal upgrade heading/navigation: 23 focused tests passed.
- Notification Center: 5 focused tests passed, including an explicit Night
  palette regression.
- Facility tab policy: 4 focused tests passed, including the More route's
  single-heading ownership rule.
- Facility Integrations: 3 focused tests passed, including an explicit Night
  palette regression and the existing mapping workflow coverage.
- Facility Pulse: 3 focused tests passed for Night styling, owner/manager
  access, Viewer direct-route denial, connection verification, device discovery,
  and mapping handoff.
- Facility history/Integrations boundary: 8 focused tests passed for Night
  styling, owner/manager access, Viewer direct-route denial, disabled entry
  points, grow selection, importer handoff, and integration mapping behavior.
- Shared Environment Review: 11 focused environment/back-route tests passed,
  including an explicit Night palette regression and existing task metadata,
  analysis, and shared-back contracts.
- Shared mix-builder chooser: 3 focused tests passed for the Night palette,
  canonical two-builder boundary, label-library link, and Personal/Facility
  destination-context preservation.
- Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed
  for the Notification Center release.

## Facility Compliance AI Dashboard Night theme and report presentation

Production Facility Compliance AI Dashboard used a Night canvas with unreadable
day-only heading and explanatory copy, then exposed the complete backend report
as a raw JSON block. Frontend `fd12330e` moved the route to the active palette
and replaced that developer representation with read-only operational cards
while preserving every value and its source semantics.

- Production Build Preflight `30683445378` passed in 2m44s and Frontend CI
  `30683445381` passed in 5m22s. The production host published the new
  `index-400fc34a43b07938332b33e1de46db2c.js` asset.
- Ten focused audit/compliance tests passed, including readable report sections,
  raw-JSON exclusion, truthful unknown-value handling, and an explicit Night
  palette regression. Targeted ESLint, full frontend `tsc --noEmit`, and
  `git diff --check` passed.
- Signed-in Viewer production acceptance confirmed one level-one Compliance AI
  Dashboard heading and level-two Tasks, Compliance records, Automation, and
  Team sections. Live values remained Tasks `1 / 0 / 0 / 0`, Compliance logs
  `0` with missed in seven days shown as `Unknown`, Automation `0 / 0`, and
  Team `4` with Manager, Owner, Staff, and Viewer each `1`.
- The raw backend JSON was absent from the user-facing page, the resolved Night
  canvas was `rgb(14, 20, 27)`, primary headings were `rgb(244, 247, 251)`, and
  supporting labels were `rgb(201, 212, 223)`.
- No AI call, compliance action, task, team, automation, token, audit event, or
  record changed. The session was returned to the Facility dashboard without
  logout.

## Facility Compliance Report Detail Night theme and readable evidence

Production Facility Compliance Report Detail retained a day-only black title
and white raw-JSON card on the resolved Night canvas. Frontend `2e35c3bc`
replaced that developer representation with a read-only, palette-aware report
while preserving the requested report reference and every backend value.

- Production Build Preflight `30683756768` passed in 3m06s and Frontend CI
  `30683756507` passed in 6m52s. The production host published the new
  `index-db220078365029fecc1426a0c36a4b91.js` asset.
- Eleven focused audit/compliance tests passed, including the report-detail
  headings, readable sections, raw-JSON exclusion, truthful unknown-value
  handling, and explicit Night-palette regression. Targeted ESLint completed
  without errors, full frontend `tsc --noEmit` passed, and `git diff --check`
  passed.
- Signed-in Viewer production acceptance of the `latest` report confirmed one
  level-one heading; level-two Tasks, Compliance records, Automation, and Team
  sections; Tasks `1 / 0 / 0 / 0`; Compliance logs `0` and missed `Unknown`;
  Automation `0 / 0`; and Team `4` with Staff, Viewer, Owner, and Manager each
  `1`.
- The raw JSON and all white cards were absent. The live report canvas rendered
  `rgb(14, 20, 27)` and both page and section headings rendered
  `rgb(244, 247, 251)`.
- No link or mutation control was invoked; no compliance action, task, team,
  automation, token, audit event, AI call, or record changed.

## Facility AI Validation Lab Night theme

Production Facility AI Validation Lab retained black day-only title,
instructions, section labels, and field text on the resolved Night canvas.
Frontend `440c4d6f` moved the complete lab canvas, copy, all inputs and
placeholders, actions, errors, choices, and response card to the active palette.

- Production Build Preflight `30684066382` passed in 3m16s and Frontend CI
  `30684066385` passed in 5m10s. The production host published the new
  `index-fa3835fb3bb6ece69eabd842d517824d.js` asset.
- Six focused AI Validation tests passed, including parsing and feedback safety
  contracts plus an explicit Night-palette regression. Targeted ESLint completed
  without errors, full frontend `tsc --noEmit` passed, and `git diff --check`
  passed.
- Signed-in Viewer production acceptance confirmed the Night canvas
  `rgb(14, 20, 27)`, title and all nine field values `rgb(244, 247, 251)`,
  supporting copy `rgb(201, 212, 223)`, field surfaces `rgb(21, 29, 39)`, and
  borders `rgb(40, 53, 69)`. No white field or black field text remained.
- No field was changed and no verify, compare, feedback, training export, AI,
  credit, audit, task, or record action was invoked.

## Facility AI Templates Night theme and heading ownership

Production Facility AI Templates retained black day-only title and guidance,
four white workflow cards, and a raw route-name shell heading under resolved
Night. Frontend `a1acb469` moved the page and all workflow cards to the active
palette and named the route. Its first live retest correctly caught duplicate
level-one headings; follow-up `6bdc6e39` let the page own the single semantic
heading while preserving the corrected palette.

- Final Production Build Preflight `30684597821` passed in 3m26s and Frontend
  CI `30684597811` passed in 4m35s. The palette implementation gates also
  passed: preflight `30684328317` in 3m13s and Frontend CI `30684328316` in
  6m40s. The production host published the final
  `index-ee37a4e4b8b9733f928018cd83d01cd5.js` asset.
- Six focused template-theme and Facility tab-shell tests passed, including the
  Night palette and single-heading ownership contracts. Targeted ESLint
  completed without errors, full frontend `tsc --noEmit` passed, and
  `git diff --check` passed. The test runner emitted its existing Expo Go push
  warning without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one AI
  Templates heading, Night workflow cards `rgb(21, 29, 39)`, primary card copy
  `rgb(244, 247, 251)`, supporting copy `rgb(201, 212, 223)`, and zero white
  workflow cards. All four named template links remained present.
- No template link was opened and no prompt, AI request, credit, task, audit
  event, or record changed.

## Facility selector Night theme and identifier privacy

Production Facility selector retained black day-only title, guidance, facility
name, and internal identifier plus a white selection card under resolved Night.
Frontend `0d3d9361` moved loaded, loading, empty, action, logout, and refresh
states to the active palette and replaced the user-facing database identifier
with the accurate `Facility workspace` label without changing selection logic.

- Production Build Preflight `30684827654` passed in 3m24s and Frontend CI
  `30684827640` passed in 7m13s. The production host published the new
  `index-823fced4d1104d827177a249b413dd18.js` asset.
- The focused selector Night-palette test passed. Targeted ESLint completed
  without errors, full frontend `tsc --noEmit` passed, and `git diff --check`
  passed. The test runner emitted its existing Expo Go push warning without a
  test failure.
- Signed-in Viewer production acceptance confirmed one level-one Select a
  Facility heading, the correct `Triple Bag Genetics, llc` choice, dark card
  `rgb(21, 29, 39)`, primary copy `rgb(244, 247, 251)`, supporting copy
  `rgb(201, 212, 223)`, and no visible internal facility identifier.
- Select, Log out, refresh, onboarding, account-switch, and support actions were
  not invoked. Facility selection, authentication, membership, audit events,
  and records did not change, and the session returned to the Facility
  dashboard without logout.

## Facility Plant Issue Diagnosis heading ownership

Production Facility photo-diagnosis route already rendered its full form in the
correct Night palette, but the tab shell added an inaccurate `Trichome Analysis`
level-one heading above the page-owned `Plant Issue Diagnosis` level-one
heading. Frontend `d625e495` hid that redundant shell header and retained the
accurate page-owned heading without changing the diagnosis workflow.

- Production Build Preflight `30685127040` passed in 3m26s and Frontend CI
  `30685127048` passed in 6m55s. The production host published the new
  `index-1defcf4812f84931414382aafa2bfae5.js` asset.
- Six focused Facility tab-shell tests passed, including accurate single-heading
  ownership for photo diagnosis. Targeted ESLint, full frontend `tsc --noEmit`,
  and `git diff --check` passed. The test runner emitted its existing Expo Go
  push warning without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one Plant
  Issue Diagnosis heading, all twelve inspected fields on Night surfaces
  `rgb(21, 29, 39)` with text `rgb(244, 247, 251)`, zero white content
  surfaces, and the empty-state Run Diagnosis action still disabled.
- No input, photo, video, campaign, diagnosis, AI request, credit, task, log,
  audit event, or record changed. The session returned to the Facility dashboard
  without logout.

## Facility Grow Intelligence hierarchy and action names

Production Facility AI Tools already used the correct Night palette, but the tab
shell exposed raw route name `ai-tools` as the page's only level-one heading.
The visible `Facility Grow Intelligence` title and tool groups were ordinary
text, and eight actions reused generic visual labels without unique accessible
names. Frontend `ebd87b2c` established an accurate page-owned heading,
level-two workflow/tool-library headings, and uniquely named actions without
changing any destinations or AI-credit behavior.

- Production Build Preflight `30685472965` passed in 3m36s and Frontend CI
  `30685472958` passed in 6m36s. The production host published the new
  `index-65d9df489c10807f1bd8fd9701a81d0a.js` asset.
- Eight focused AI-tools and Facility tab-shell tests passed. Targeted ESLint,
  full frontend `tsc --noEmit`, and `git diff --check` passed. The test runner
  emitted its existing Expo Go push warning without a test failure.
- Signed-in Viewer production acceptance confirmed one level-one Facility Grow
  Intelligence heading; six level-two headings for five workflows and Tool
  Library; eight uniquely named Open actions; the Night canvas
  `rgb(14, 20, 27)`; title `rgb(244, 247, 251)`; and zero white content
  surfaces.
- No campaign, credit-help link, AI/tool/report action, prompt, AI request,
  credit, task, log, audit event, or record changed. The session returned to the
  Facility dashboard without logout.

## Facility Reports heading hierarchy

Production Facility Reports already used the correct Night palette and truthful
report values, but the tab shell owned a generic `Reports` level-one heading.
The visible `Facility Reports` title and Tasks, Compliance, Team, and Automation
sections were ordinary text. Frontend `eb0368ff` established one accurate
page-owned heading and four semantic report-section headings without changing
refresh, export, report loading, or values.

- Production Build Preflight `30685832550` passed in 3m22s and Frontend CI
  `30685832545` passed in 6m28s. The production host published the new
  `index-280d17f670ccdbc52f454bc19f37f499.js` asset.
- Nine focused Facility Reports viewer-access and tab-shell tests passed.
  Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
  The test runner emitted its existing Expo Go push warning without a test
  failure.
- Signed-in Viewer production acceptance confirmed one level-one Facility
  Reports heading; level-two Tasks, Compliance, Team, and Automation headings;
  Tasks `1 / 0 / 0 / 0`; Compliance logs `0` with missed `Not tracked`; Team
  `4` with Staff, Viewer, Owner, and Manager each `1`; Automation `0 / 0`; the
  Night canvas `rgb(14, 20, 27)`; and zero white content surfaces.
- Refresh and export were not invoked. No download, report, compliance action,
  task, team, automation, audit event, or record changed. The session returned
  to the Facility dashboard without logout.

## Facility Analytics heading hierarchy

Production Facility Analytics retained the previously verified Night contrast
and truthful unknown/zero metrics, but its tab shell owned a generic `Analytics`
level-one heading. The accurate `Facility Analytics` title and six operational
metric titles were ordinary text. Frontend `51966ec6` established one accurate
page-owned heading and six semantic metric-section headings without changing
data loading, calculations, campaign placement, or styling.

- Production Build Preflight `30686171456` passed in 3m11s and Frontend CI
  `30686171460` passed in 6m34s. The production host published the new
  `index-1bb33297d1267ba1f02a5d89049dfda8.js` asset.
- Eleven focused Facility Analytics and tab-shell tests passed. Targeted ESLint,
  full frontend `tsc --noEmit`, and `git diff --check` passed. The test runner
  emitted its existing Expo Go push warning without a test failure.
- Signed-in Viewer production acceptance confirmed one level-one Facility
  Analytics heading and level-two Stable rooms, Task completion, SOP
  compliance, Sensor alerts, Active batches, and Training completion headings.
  The truthful zero/unknown values remained unchanged, the Night canvas was
  `rgb(14, 20, 27)`, the title was `rgb(244, 247, 251)`, and zero white content
  surfaces remained.
- No campaign, metric, navigation, refresh, analytics, task, audit event, or
  record action was invoked. The session returned to the Facility dashboard
  without logout.

## Facility Integrations heading hierarchy

Production Facility Integrations retained the previously verified Night palette
and Viewer-safe disabled controls, but its tab shell owned a generic
`Integrations` level-one heading. The accurate `Connect rooms and sensor data`
title and operational sections were ordinary text. Frontend `92d48fea`
established one accurate page-owned heading and semantic headings for every
integration card, including the conditional connection/mapping surfaces,
without changing permissions or workflow behavior.

- Production Build Preflight `30686480340` passed in 3m28s and Frontend CI
  `30686480332` passed in 6m25s. The production host published the new
  `index-a5c329f3b62e84a22e168219b67b9a19.js` asset.
- Fourteen focused Facility Integrations and tab-shell tests passed, including
  Viewer denial, provider selection, mapping confirmation, auto-build, Night
  palette, and heading ownership. Targeted ESLint, full frontend
  `tsc --noEmit`, and `git diff --check` passed. The test runner emitted its
  existing Expo Go push warning without a test failure.
- Signed-in Viewer production acceptance confirmed one level-one Connect rooms
  and sensor data heading; level-two Pulse read-only telemetry, Import
  controller and grow history, and More providers headings; the Night canvas
  `rgb(14, 20, 27)`; zero white content surfaces; and both write actions still
  disabled for the Viewer.
- No provider selection, connector, import, mapping, auto-build, email,
  developer portal, room, telemetry, audit event, or record action was invoked.
  The session returned to the Facility dashboard without logout.

## Facility Viewer notification-type control re-verification

The earlier user report that this Facility user type could not see notification
types was rechecked directly after the route-polish releases. No current defect
was reproduced, so no speculative code change was made.

- Five focused Notification Center tests passed, including the active Night
  palette, workspace-correct Profile link, Facility-user category save payload,
  source filters, single-read behavior, and mark-all-read behavior. Targeted
  ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
- Signed-in Facility Viewer production acceptance at
  `/home/notifications?workspace=facility` confirmed one Notification Center
  heading and seven visible checked switches: Device push, Task reminders,
  Forum replies, Video activity, Courses and lives, Commerce updates, and
  Facility alerts.
- The inbox exposed Unread and All plus the same six category filters. Delivery
  status explicitly listed all six enabled categories, Device push reported
  enabled, the Profile settings link remained Facility-scoped, the Night canvas
  was `rgb(14, 20, 27)`, and the heading was `rgb(244, 247, 251)`.
- No switch, filter, Save, Profile, read-state, push permission, notification,
  preference, audit event, or record action was invoked. This proves control
  visibility and current persisted state; it does not claim an external device
  push receipt.

## Facility Team heading hierarchy and Viewer read-only state

Production Facility Team retained the correct Night palette and role gates, but
its tab shell owned a generic `Team` level-one heading. The accurate `Facility
Team` title and role-specific Team access notice were ordinary text. Frontend
`508a69e6` established one accurate page-owned heading and a semantic access
section heading without changing invitations, assignments, roles, removals, or
roster data.

- Production Build Preflight `30686819846` passed in 3m36s and Frontend CI
  `30686819858` passed in 6m44s. The production host published the new
  `index-2024648f8152a5eb2c2a214cee87fd16.js` asset.
- Fifteen focused Facility Team role/workflow and tab-shell tests passed,
  covering Owner invitation/removal, Manager assignment access, Viewer
  read-only behavior, and heading ownership. Targeted ESLint, full frontend
  `tsc --noEmit`, and `git diff --check` passed. The suite retained its existing
  asynchronous React and Expo Go warnings without a test failure.
- Signed-in Viewer production acceptance confirmed one level-one Facility Team
  heading, one level-two Team access heading, the loaded four-member roster,
  the correct read-only role notice, zero invite/assign/change/remove actions,
  the Night canvas `rgb(14, 20, 27)`, and zero white content surfaces.
- No roster row, refresh, invitation, assignment, role, removal, member,
  authentication, audit event, or record action was invoked. The session
  returned to the Facility dashboard without logout.

## Facility Sales and Transfers heading hierarchy and Viewer read-only state

Production Sales and Transfers retained the correct Night palette, truthful
empty state, and Viewer restriction, but its tab shell owned the generic
`Sales` level-one heading while the accurate workflow title was ordinary text.
Frontend `fdc9cdca` established one page-owned Licensed Sales & Transfers
heading without changing inventory loading, transfer records, role gates,
shipment transitions, recipient details, manifests, or totals.

- Production Build Preflight `30687266646` passed in 3m10s and Frontend CI
  `30687266654` passed in 6m20s. The production host published the new
  `index-bd5f2dcb04fe9c0f80170be006492a52.js` asset.
- Sixteen focused Facility Transfers workflow, Viewer route, and tab-shell
  tests passed. Targeted ESLint, full frontend `tsc --noEmit`, and
  `git diff --check` passed. The suite retained its existing Expo Go push
  warning without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one
  Licensed Sales & Transfers heading, the Viewer read-only notice, zero
  create-transfer actions, the truthful zero-record/draft/revenue state, the
  Night canvas `rgb(14, 20, 27)`, bright heading text `rgb(244, 247, 251)`, and
  zero white content surfaces.
- No transfer, inventory, shipment, recipient, license, manifest, carrier,
  tracking, refresh, audit event, billing, or record action was invoked. The
  session returned to the Facility dashboard without logout.

## Facility Rooms heading hierarchy and Viewer read-only state

Production Rooms retained the correct Night palette, all 15 room records, and
Viewer restrictions, but its tab shell owned the generic `Rooms` level-one
heading while the accurate page title and room-workflow sections were ordinary
text. Frontend `a2c40372` established a page-owned Facility Rooms & Workspaces
heading plus structured room sections without changing loading, room records,
ordering, equipment, batch cycles, integrations, or role gates.

- Production Build Preflight `30687648716` passed in 3m31s and Frontend CI
  `30687648717` passed in 7m00s. The production host published the new
  `index-3eb1408aeeaff8c843d1c6827e8dd953.js` asset.
- Twenty-five focused Facility Rooms workflow, Viewer route, tab-shell, and
  canonical API-wrapper tests passed. Targeted ESLint, full frontend
  `tsc --noEmit`, and `git diff --check` passed. The suite retained its existing
  asynchronous React and Expo Go push warnings without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one
  Facility Rooms & Workspaces heading; Arrange room workspaces, New Room, and
  Room Workspace level-two headings; active-room, Equipment, and Batch Cycles
  level-three headings; all 15 rooms; the Night canvas `rgb(14, 20, 27)`;
  bright heading text `rgb(244, 247, 251)`; and zero white content surfaces.
- The dashboard and Rooms route both settled at 15 rooms. A zero-room snapshot
  observed while the route progress indicator was active changed to 15 after
  the existing requests completed, so no false data or loading fix was made.
- The Viewer exposed zero create, delete, reorder, add-equipment, or
  create-cycle controls. No room, grow, integration, tool, equipment, batch
  cycle, tracking mode, refresh, audit event, billing, or record action was
  invoked. The session returned to the Facility dashboard without logout.

## Facility Tasks heading hierarchy, compact tab label, and Viewer state

Production Tasks retained the correct Night palette, one genuine completed
cross-role task, and Viewer restrictions, but its tab shell owned the generic
`Tasks` level-one heading while Task access, Task queue, Status, and Source were
ordinary text. Frontend `e602d9dd` established one page-owned Facility Tasks
heading and structured queue sections without changing task creation, links,
filters, assignment, completion, or persistence. Live verification then caught
that the route title had expanded the bottom tab label to `Facility Tasks`;
frontend `181a9034` restored the compact `Tasks` tab label before evidence
closure.

- Final Production Build Preflight `30688277902` passed in 3m36s and Frontend
  CI `30688277911` passed in 5m21s. The production host published the new
  `index-b8472b218fa3cab616d35f3498a6ded4.js` asset. The preceding hierarchy
  build also passed Preflight `30688007741` in 3m22s and Frontend CI
  `30688007745` in 6m37s.
- Thirty focused Facility Tasks workflow, role-access, canonical API-wrapper,
  and tab-shell tests passed. Targeted ESLint, full frontend `tsc --noEmit`, and
  `git diff --check` passed. The suite retained its existing VirtualizedList
  timing and Expo Go push warnings without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one
  Facility Tasks heading; Task access and Task queue level-two headings;
  Status and Source level-three headings; the compact selected `Tasks` tab;
  one genuine completed cross-role task; the Night canvas `rgb(14, 20, 27)`;
  bright heading text `rgb(244, 247, 251)`; and zero white content surfaces.
- The Viewer exposed zero task-creator or create-task controls. No filter, task
  link, task, assignment, completion, source, refresh, audit event, billing, or
  record action was invoked. The session returned to the Facility dashboard
  without logout.

## Facility Compliance hierarchy and Viewer SOP-run permission gate

Production Compliance retained the correct Night palette, readable compliance
evidence, and most Viewer restrictions, but its tab shell owned the generic
`Compliance` level-one heading while all workflow sections were ordinary text.
More importantly, every SOP template row exposed a `Start run` action to the
Viewer even though the top-level start action and other compliance writes were
correctly hidden. Frontend `68ea5bf9` established one page-owned Facility
Compliance heading, structured compliance sections, and applied the existing
compliance-write gate to per-template SOP-run navigation without changing
Owner/Manager/Staff writer behavior.

- Production Build Preflight `30688565734` passed in 3m14s and Frontend CI
  `30688565753` passed in 7m02s. The production host published the new
  `index-e76c464995dca992ff5ae75139eeee7f.js` asset.
- Thirty-one focused Compliance facility-label, Owner/Viewer SOP-navigation,
  report/AI route, and tab-shell tests passed. Targeted ESLint, full frontend
  `tsc --noEmit`, and `git diff --check` passed. The suite retained its existing
  Expo Go push warning without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one
  Facility Compliance heading; six level-two workflow headings; the compact
  selected `Compliance` tab; the real active SOP template; 67 readable audit
  events; zero open deviations and pending verifications; the Night canvas
  `rgb(14, 20, 27)`; bright heading text `rgb(244, 247, 251)`; and zero white
  content surfaces.
- The Viewer exposed zero top-level or per-template SOP-run starts, deviation
  creation, deviation resolution, verification approval, or verification
  rejection controls. No readiness action, export, AI request, SOP navigation,
  audit-log navigation, deviation, verification, template, run, refresh, audit
  event, billing, or record action was invoked. The session returned to the
  Facility dashboard without logout.

## Facility Grows hierarchy and Viewer grow-write permission gate

Production Facility Grows used the correct Night palette and truthful empty
state, but the tab shell owned the generic `Grows` level-one heading while the
accurate page title was ordinary text. More importantly, the Viewer saw a
`Start a facility grow` action even though the shared role policy reserves
facility grow writes for Owners and Managers. Frontend `05c41bda` established
one page-owned Facility Grows heading, preserved the compact `Grows` tab label,
and applied the existing grow-write entitlement plus Owner/Manager role gate
without changing Manager behavior.

- Production Build Preflight `30688958541` passed in 3m13s and Frontend CI
  `30688958532` passed in 6m44s.
- Fifty-four focused Facility Grows route, tab-shell, role-policy, and
  mode-access tests passed. Targeted ESLint, full frontend `tsc --noEmit`, and
  `git diff --check` passed. The suite retained its existing VirtualizedList
  timing and Expo Go warnings without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one
  `Facility Grows` heading; one level-two `No facility grows yet` heading; the
  compact selected `Grows` tab; the truthful `0 grows` count; the Night canvas
  `rgb(14, 20, 27)`; and bright heading text `rgb(244, 247, 251)`. No white
  page-content surface remained; the separate Report Bug control was the only
  detected white element.
- The Viewer exposed zero start-grow controls and received the explicit
  Owner/Manager access notice. No grow, room, plant, task, refresh, navigation,
  audit event, billing, or record action was invoked, and the session remained
  signed in.

## Facility Inventory hierarchy, Night theme, and Viewer write gate

Production Facility Inventory already used the correct Night palette, truthful
zero-inventory state, and Viewer write restriction, including a safe read-only
handoff at the direct create URL. Its tab shell nevertheless owned the generic
`Inventory` level-one heading while the accurate route title and empty-state
title were ordinary text. Frontend `725e55cc` established a page-owned Facility
Inventory heading and structured empty-state heading. The first live retest
caught that the Inventory tab declaration had not wired the shared header
policy, so follow-up `063f32b0` hid the duplicate shell heading and preserved
the accurate route title.

- Final Production Build Preflight `30689517665` passed in 2m51s and final
  Frontend CI `30689517661` passed in 6m55s. The superseded first deployment was
  not accepted after live verification exposed its duplicate heading.
- Twenty-one focused Facility Inventory list/create-route and tab-shell tests
  passed. Targeted ESLint, full frontend `tsc --noEmit`, and
  `git diff --check` passed. The suite retained its existing Expo Go warning
  without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one
  `Facility Inventory` heading; one level-two `No inventory items yet.`
  heading; the truthful `0 items | 0 units on hand` state; the Night canvas
  `rgb(14, 20, 27)`; bright heading text `rgb(244, 247, 251)`; and no white
  page-content surface. The separate Report Bug control was the only detected
  white element.
- The Viewer exposed zero create-item controls on the inventory list. Direct
  navigation to `/home/facility/inventory/new` retained one `Inventory is
  read-only` heading, the same Night colors, an Owner/Manager access notice, a
  safe return action, and zero form fields or create actions. No reload, sales,
  transfer, AI review, create, return, item, inventory, audit event, billing, or
  record action was invoked, and the session remained signed in.

## Facility Plants hierarchy and centralized write gate

Production Facility Plants already used the correct Night palette, truthful
zero-plant state, and a read-only Viewer presentation. Its tab shell owned the
generic `Plants` level-one heading while the accurate route title, coverage,
creation, and empty-state titles were ordinary text. Source verification also
found the route's local role check allowed `STAFF` to create plants even though
the centralized role policy grants `PLANTS_WRITE` only to Owners and Managers.
Frontend `0a3f2922` established one page-owned Facility Plants heading and three
structured workflow headings, then replaced the drifting local check with both
the centralized plants-write capability and an explicit Owner/Manager role
gate.

- Production Build Preflight `30689901483` passed in 3m06s and Frontend CI
  `30689901520` passed in 5m26s.
- Fifty-eight focused Facility Plants Manager/Staff/Viewer, stale-capability,
  tab-shell, role-policy, and mode-access tests passed. Targeted ESLint, full
  frontend `tsc --noEmit`, and `git diff --check` passed. The suites retained
  their existing Expo Go warnings without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one
  `Facility Plants` heading; level-two `Plant coverage`, `Add Plant`, and
  `No plants yet` headings; truthful zero active/missing-room/missing-batch
  values; the Night canvas `rgb(14, 20, 27)`; bright heading text
  `rgb(244, 247, 251)`; and no white page-content surface. The separate Report
  Bug control was the only detected white element.
- The Viewer exposed zero plant fields, stage/room/grow controls, plant links,
  or create actions and received the accurate Owner/Manager access notice. No
  plant, stage, room, grow, refresh, link, create, audit event, billing, or
  record action was invoked, and the session remained signed in.

## Facility Grow Journal hierarchy and centralized write gate

Production Facility Logs already used the correct Night palette, truthful
zero-entry state, and read-only Viewer presentation. Its tab shell owned the
generic `Logs` level-one heading while the useful journal title and empty-state
title were ordinary text. Source verification also found that the write UI
checked role only and bypassed the centralized `GROWLOGS_WRITE` capability.
Frontend `73b00f69` established page-owned journal and empty-state headings and
requires both the centralized capability and an Owner/Manager/Staff role. The
first live retest caught that the visible root heading still said only `Grow
Journal` while the route title said `Facility Grow Journal`; follow-up
`39b5a9a3` aligned the final visible title and added root-route coverage.

- Final Production Build Preflight `30690355620` passed in 2m59s and final
  Frontend CI `30690355627` passed in 6m57s. The superseded first deployment was
  not accepted after live verification exposed the title mismatch.
- Fifty-nine focused Facility Logs Staff/Viewer, stale-capability, root/context
  heading, tab-shell, role-policy, and mode-access tests passed. Targeted
  ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed. The
  suites retained their existing Expo Go warnings without a test failure.
- Signed-in Viewer production acceptance confirmed exactly one level-one
  `Facility Grow Journal` heading; one level-two `No log entries yet` heading;
  the truthful `0 entries` state; the Night canvas `rgb(14, 20, 27)`; bright
  heading text `rgb(244, 247, 251)`; and no white page-content surface. The
  separate Report Bug control was the only detected white element.
- The Viewer exposed zero journal-type, title, note, save, or entry-link
  controls. No journal type, title, note, save, refresh, entry, link, audit
  event, billing, or record action was invoked, and the session remained signed
  in.

## Facility Audit Logs Night theme and 67-event evidence acceptance

Production Facility Audit Logs was re-audited after the surrounding Facility
workflow corrections. The reported color issue was not reproducible on this
route: its canvas, heading, event cards, metadata, and detail links already use
the active Night palette. The route also retained one accurate page heading and
the full real evidence trail, so no speculative code change was made.

- Eleven focused Facility audit-list/detail/entity, Night-palette, readable
  evidence, loading-heading, and shared-back tests passed. Targeted ESLint, full
  frontend `tsc --noEmit`, and `git diff --check` passed.
- Signed-in Viewer production acceptance confirmed exactly one level-one
  `Audit Logs` heading; 67 rendered event cards and 67 read-only `Open Detail`
  links after scrolling through the complete list; the real token reset, team,
  SOP, compliance, inventory, task, room, and other historical events; the
  Night canvas `rgb(14, 20, 27)`; bright heading text `rgb(244, 247, 251)`; and
  no white page-content surface. The separate Report Bug control was the only
  detected white element.
- No refresh, detail link, event, team, SOP, compliance, inventory, task, room,
  token, audit, billing, or record action was invoked. Scrolling only rendered
  the remaining virtualized rows; the session remained signed in.

## Facility SOP Runs Night theme and Viewer mutation gates

Production Facility SOP Runs retained a correct Night index and real completed
run evidence, but the Viewer saw a Start Run link and the direct start route had
no entitlement guard. The run-detail route also relied only on completed status
to disable mutations, so an active run could expose checklist and completion
writes to a read-only role. Its detail evidence remained day-only with a white
card and lacked page-owned semantic headings. Frontend `a027a1a1` applied the
centralized `SOP_RUNS_WRITE` gate across the index, direct start route, and
detail mutation handlers/controls, while moving the complete detail surface to
the active palette and structuring its evidence headings.

- Production Build Preflight `30690905972` passed in 3m07s and Frontend CI
  `30690905927` passed in 6m39s.
- Sixty-one focused SOP index/start/detail, Owner/Manager/Viewer,
  compliance-link, Night-palette, role-policy, and mode-access tests passed.
  Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
  The suites retained their existing Expo Go warnings without a test failure.
- Signed-in Viewer production acceptance confirmed one level-one `SOP Library
  & Runs` heading; level-two `Run evidence summary` and `Run history` headings;
  the real one-of-one completed run with three-of-three reviewed steps and zero
  pending steps; retained SOP Library and Compare links; the Night canvas
  `rgb(14, 20, 27)`; and no Start Run link.
- Direct Viewer navigation to `/home/facility/sop-runs/start` produced a
  form-free `SOP runs are read-only` handoff with an Owner/Manager notice and a
  safe return action. The real completed run detail retained its title, status,
  timestamps, three reviewed checklist steps, and locked-evidence notice under
  one level-one run heading and one level-two `Checklist evidence` heading.
  Its Night detail used bright heading text `rgb(244, 247, 251)` and zero white
  page-content surfaces; the separate Report Bug control was the only detected
  white element.
- The Viewer detail exposed zero step-update, add-step, or complete-run
  controls. No template, comparison, step, note, status, completion, refresh,
  SOP write, audit event, billing, or record action was invoked; only read-only
  route navigation occurred, and the session remained signed in.

## Facility AI Ask workspace-selector Night theme and credit disclosure

Production Facility AI Ask already rendered its canvas, context, assistant
message, evidence picker, composer, and input with the active Night palette,
but its three workspace choices retained fixed daytime-blue styling. It also
offered Send without a nearby explanation of when that action uses a credit.
Frontend `f938e5ff` moved the selector's inactive and active states to the
current palette and added a pre-send Facility-credit disclosure without
changing request, evidence, entitlement, or billing behavior.

- Production Build Preflight `30691319619` passed in 3m20s and Frontend CI
  `30691319611` passed in 6m36s.
- Six focused shared AI-screen and Facility AI Ask palette tests passed.
  Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
  The suites retained their existing Expo Go warnings without a test failure.
- Signed-in Viewer production acceptance confirmed one level-one `AI` heading;
  retained Single user, Commercial, and Facility workspace choices; Night
  inactive selector surfaces `rgb(21, 29, 39)` with accent borders/text
  `rgb(120, 170, 255)`; active Facility surface `rgb(120, 170, 255)` with white
  text; and input surface `rgb(21, 29, 39)` with bright text
  `rgb(244, 247, 251)`. The separate Report Bug control was the only detected
  white element.
- The deployed composer now states that an accepted request uses Facility AI
  credits and that adding evidence alone does not use a credit. Send remained
  disabled with an empty prompt. No workspace, prompt, media, Send, AI request,
  credit, task, log, diagnosis, tool run, audit event, billing, or record action
  was invoked, and the session remained signed in.

## Shared Harvest Readiness photo-evidence Night theme and hierarchy

Production Facility Harvest Readiness already used the active Night palette for
the shared calculator, fields, guidance, media picker, and credit disclosures,
but its photo checklist and photo-notes field remained white with black text.
The shell supplied the only heading while the visible estimate title and major
workflow sections were unstructured. Frontend `f25e6de2` moved the complete
photo-analysis card, checklist, notes, analysis, warning, feedback, and result
surfaces to the active palette, and gave the shared calculator title/guidance
plus Harvest photo sections semantic heading levels. Calculation, media,
evidence restoration, AI charging/refunds, and save/writeback behavior were not
changed.

- Production Build Preflight `30691729668` passed in 3m12s and Frontend CI
  `30691729677` passed in 6m46s.
- Ten focused Harvest Readiness tests passed, covering the Night palette,
  headings, complete/incomplete photo guards, no-charge incomplete evidence,
  saved-evidence restoration, successful analysis, provider-failure recovery,
  decision tasks, and harvest-batch writeback. Targeted ESLint, full frontend
  `tsc --noEmit`, and `git diff --check` passed. Existing React test-timing
  warnings did not fail the suite.
- Signed-in Viewer production acceptance confirmed one level-one `Harvest
  Readiness` heading; level-two `Harvest Readiness Estimate`, `How this tool
  works`, and `AI trichome photo estimate (optional)` headings; and one
  level-three `Photo checklist before analysis` heading. The checklist and
  notes now use Night surface `rgb(21, 29, 39)`, border `rgb(40, 53, 69)`, and
  bright text `rgb(244, 247, 251)`. All visible headings use the same bright
  text, and the separate Report Bug control was the only detected white
  element.
- The live route retained zero Facility grows, zero selected grow, zero media,
  the exact one-credit successful-action/refund disclosures, an aria-disabled
  photo-analysis action, and a disabled grow-context prefill. No field, grow,
  media, notes, calculator, AI analysis, prefill, credit, ToolRun, Saved Run,
  task, log, plant history, harvest batch, audit event, billing, or record
  action was invoked, and the session remained signed in.

## Shared Feeding Schedule Night theme and Facility AI handoff

Production Facility Feeding Schedule retained a white day-only canvas, black
field values on transparent inputs, white result metrics, green day-only
actions, and no semantic structure below the shell heading under resolved
Night mode. The result surface's shared `Ask AI About This` action also routed
Facility users into Personal AI. Frontend `4b1a5894` moved the shared planner
and reusable result surface to the active palette and structured their visible
titles; the live retest then confirmed the cross-workspace AI destination, and
follow-up `c3916684` kept the generated review prompt inside Facility AI Ask.
Neither revision changed schedule generation, rule review, AI charging, or
journal/task writebacks.

- Final Production Build Preflight `30692358799` passed in 3m10s and final
  Frontend CI `30692358811` passed in 5m32s. The first theme deployment also
  passed, but was not accepted as final after live review exposed the Facility
  AI handoff mismatch.
- Fifteen focused Feeding Schedule generation/review/task-metadata, shared-back,
  Night-palette, result-surface, and Facility-AI destination tests passed.
  Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
- Signed-in Viewer production acceptance confirmed one level-one `Feeding
  Schedule` heading; level-two `Feeding Schedule Planner`, `AI grow-context
  prefill`, and `Feeding schedule` headings; and one level-three `Assumptions`
  heading. All 11 inspected inputs use Night surface `rgb(21, 29, 39)`, border
  `rgb(40, 53, 69)`, and bright text `rgb(244, 247, 251)`. Secondary result
  actions use the same Night surface with accent border/text
  `rgb(120, 170, 255)`, every heading uses bright text, and the separate Report
  Bug control was the only detected white element.
- The live no-grow state retained its disabled AI prefill, free rule-engine
  disclosure, zero schedule rows, LOW review risk with its truthful warning,
  and no save/writeback actions. Navigation-only acceptance of `Ask AI About
  This` landed on `/home/facility/ai-ask` with the review prompt prefilled;
  Send was not invoked. No input, generate, copy, AI Send, credit, schedule,
  ToolRun, Saved Run, journal, task, grow, audit event, billing, or record action
  was invoked, and the session remained signed in.

## Facility Dry Amendment Mix Night-theme no-change acceptance

Production Facility Dry Amendment Mix was audited after the shared calculator
and result-surface releases. The reported color problem was not reproducible on
this route: its complete builder already used the active Night palette, its
shell and visible calculator/guidance titles had semantic structure, and its
AI-guided control only prepares a local calculator brief rather than calling a
provider. No speculative route-specific code change was made.

- Fourteen focused Dry Amendment calculation, saved-run, batch-task,
  production-batch, product-draft, AI-brief, shared-back, and shared-result
  palette tests passed. Targeted ESLint, full frontend `tsc --noEmit`, and
  `git diff --check` passed.
- Signed-in Viewer production acceptance confirmed one level-one `Dry
  Amendment Mix` heading; level-two `Dry Amendment Mix Builder` and `How this
  tool works` headings; all 21 inspected inputs on Night surface
  `rgb(21, 29, 39)` with border `rgb(40, 53, 69)` and bright text
  `rgb(244, 247, 251)`; themed local-brief and calculation actions; and zero
  white page-content surfaces. The separate Report Bug control was the only
  detected white element.
- The page retained its truthful no-credit calculator disclosure, default
  recipe/ingredient values, no-grow state, and disabled downstream writebacks
  until a successful run supplies their required context. No field, AI brief,
  calculation, ToolRun, Saved Run, batch task, production batch, product draft,
  grow, log, task, plant history, credit, audit event, billing, or record action
  was invoked, and the session remained signed in.

## Facility Feed Night theme and Viewer read-only acceptance

Production Facility Feed rendered its outreach heading, explanatory card,
filter panel, chips, search field, and empty state with white day-only surfaces
and dark text under resolved Night mode. Viewer publishing controls were
correctly absent. Frontend `2cdff5f3` moved the complete shared
Commercial/Facility campaign surface—including owner-only creation,
destination, schedule, review, analytics, populated post, and action states—to
the active palette, added readable placeholder colors, and structured the
visible workflow sections without changing campaign permissions or behavior.

- Production Build Preflight `30692783353` passed in 3m25s and Frontend CI
  `30692783365` passed in 6m42s.
- Sixteen focused Facility Viewer/Owner, Commercial campaign, destination,
  schedule/review, source-link, and shared Night-palette tests passed. Targeted
  ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed. The suites
  retained their existing Expo Go warning without a test failure.
- Signed-in Viewer production acceptance confirmed one level-one `Facility
  Outreach` heading and level-two `Promoted Outreach`, `Filter`, and `No
  campaigns yet` headings. The selected filter uses accent surface/border
  `rgb(120, 170, 255)` with white text; four unselected filters and the search
  field use Night surface `rgb(21, 29, 39)`, border `rgb(40, 53, 69)`, and
  bright text `rgb(244, 247, 251)`. The search placeholder is readable muted
  text `rgb(201, 212, 223)`, all page headings are readable, and the separate
  Report Bug control was the only detected white element.
- The truthful zero-campaign state, direct-sales prohibition, and five filter
  choices remained present. The Viewer exposed zero campaign title/body,
  create, upload, destination, schedule, publish, analytics, or management
  controls. No filter, search, refresh, campaign, destination, image, schedule,
  report, hide, publish, analytics, audit event, billing, or record action was
  invoked, and the session remained signed in.

## Facility Task Detail Night theme and persisted evidence hierarchy

Production's genuine completed cross-role Facility task detail rendered both
evidence cards as white day-only surfaces with black copy and exposed no
semantic headings. Viewer update controls were correctly absent. Frontend
`41158ca8` moved loaded/loading/empty, read-only, writer form, assignment,
linkage, status, feedback, and destructive-action states to the active palette,
and established one task-title heading plus workflow/record-summary section
headings without changing task data or permissions.

- Production Build Preflight `30693137826` passed in 3m22s and Frontend CI
  `30693137824` passed in 6m44s.
- Twenty-nine focused Facility task list/detail, source-link, assignment,
  Owner/Manager/Viewer, role-policy, Night-palette, and heading tests passed.
  Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
  Existing React test-timing and Expo Go warnings did not fail the suites.
- Signed-in Viewer production acceptance confirmed the real task title as the
  single level-one heading and level-two `Task Workflow` and `Record Summary`
  headings. Both evidence cards use Night surface `rgb(21, 29, 39)`, border
  `rgb(40, 53, 69)`, and bright heading text `rgb(244, 247, 251)`; the separate
  Report Bug control was the only detected white element.
- The same persisted record retained `Completed`, its July 22 due date, July 22
  creation timestamp, July 23 update timestamp, manual/no-linked-record source,
  no room, assigned-team-member presentation, and optional proof/approval. The
  Viewer exposed zero title, notes, due-date, assignment, source, room,
  proof/approval, save, completion/reopen, or deletion controls. No refresh,
  task, assignment, source, room, status, proof, approval, deletion, audit
  event, billing, or record action was invoked, and the session remained signed
  in.

## Facility Grow, Plant, and Journal Detail Night themes

Production's Facility workspace truthfully contained zero grows, zero plants,
and zero journal entries, so no populated detail record could be opened without
manufacturing data. Safe direct navigation confirmed all three not-found states
had no semantic heading. Authoritative route source also confirmed each loaded
detail card still hardcoded white/day colors. Frontend `789bc78a` moved the
complete grow overview/workspace, plant evidence, and journal evidence detail
states to the active palette and added accurate loaded/not-found headings. The
routes remain read-only; no mutation behavior was added.

- Production Build Preflight `30693532144` passed in 3m20s and Frontend CI
  `30693532141` passed in 5m26s.
- Ten focused loaded-grow, grow/plant index, detail-heading, and explicit
  grow/plant/journal Night-palette tests passed. Targeted ESLint, full frontend
  `tsc --noEmit`, and `git diff --check` passed.
- Signed-in Viewer production acceptance was intentionally limited to the real
  zero-record condition: direct safe references produced level-one `Grow not
  found`, `Plant not found`, and `Log entry not found` headings with bright
  Night text `rgb(244, 247, 251)`. None exposed a white page-content surface;
  the separate Report Bug control was the only detected white element.
- Focused loaded-state tests prove that grow cards/summary/workspace actions,
  plant key/value evidence, and journal key/value evidence use their active
  palette. This is not claimed as populated production-record acceptance; a
  genuine future record is still required for that live evidence. No record was
  created to force it. No refresh, contextual tool, workspace action, grow,
  plant, journal entry, task, AI request, credit, audit event, billing, or record
  action was invoked, and the session remained signed in.

## Facility Inventory Detail Night theme and truthful unavailable state

Production's safe unavailable-item route rendered three white day-only cards,
five empty disabled inputs, disabled save controls, and a generic record-summary
shell under resolved Night mode. It had no semantic heading. Although the
Viewer could not submit those controls, the empty edit form misleadingly
presented a nonexistent record as editable inventory. Frontend `0f230792`
moved the complete loaded, read-only, writer, status, feedback, metadata, and
destructive states to the active palette; added a page title plus structured
section headings for real records; and replaces unavailable records with one
concise read-only handoff. The centralized inventory-write gate and all
mutation handlers remain unchanged.

- Production Build Preflight `30693842830` and Frontend CI `30693842838`
  passed.
- Four focused route, shared-back, mutation, Night-palette, and unavailable-
  state tests passed. Targeted ESLint, full frontend `tsc --noEmit`, and
  `git diff --check` passed.
- Signed-in Viewer production acceptance confirmed one level-one `Inventory
  item not found` heading in bright Night text `rgb(244, 247, 251)`. Its single
  content card uses Night surface `rgb(21, 29, 39)` and border
  `rgb(40, 53, 69)`. The route contains zero inputs and only Back plus the
  separate Report Bug control; Report Bug was the only detected white element.
- The workspace truthfully contains zero inventory items, so populated live-
  record acceptance remains open. Focused loaded-state tests prove that item,
  quantity, metadata, form, and writer-only destructive surfaces derive from
  the active palette. No item was created to force evidence. No field,
  quantity, reason, save, removal, refresh, inventory, audit event, billing, or
  record action was invoked, and the session remained signed in.

## Facility Plant Issue Diagnosis Night-theme no-change acceptance

Production Facility Plant Issue Diagnosis was audited immediately after the
Inventory Detail correction. The reported color problem was not reproducible
on this shared Facility diagnosis route: its form, guidance, evidence controls,
readiness state, and page title already use the active Night palette. No
speculative code change was made.

- Thirty-one focused shared diagnosis, root-route, and Facility-tab tests
  passed. Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check`
  passed. The existing Expo Go notification warning did not fail the suites.
- Signed-in Viewer production acceptance confirmed one level-one `Plant Issue
  Diagnosis` heading. All 12 inspected text inputs use Night surface
  `rgb(21, 29, 39)`, border `rgb(40, 53, 69)`, and bright text
  `rgb(244, 247, 251)`. The separate Report Bug control was the only detected
  white element.
- The route retained crop-identity caution, written/context inputs, media
  privacy and evidence guidance, provider/image-readiness disclosure, and a
  disabled diagnosis action until evidence exists. No field, media, upload,
  diagnosis, AI request, credit, result, ToolRun, task, log, grow, audit event,
  billing, or record action was invoked, and the session remained signed in.

## Facility Compliance Logs direct-route theme, hierarchy, and permission repair

Production `/home/facility/compliance/reports` exposed a `Record Log` action to
the signed-in Viewer, had no semantic heading, and bypassed the active palette.
Its zero-log writer state was also functionally incomplete: it displayed the
action without the required title field, so an authorized user could not create
the first record from that route. Frontend `525e0970` rebuilt the direct route
around the centralized `COMPLIANCE_WRITE` capability plus Facility role policy,
keeps Viewer presentation read-only, restores the complete eight-type form for
Owner/Manager/Staff in empty and populated states, and moves all form/list/error
states to the active palette. Live review then caught two level-one headings;
follow-up `9010a0db` established one page H1 and level-two workflow headings.

- Final Production Build Preflight `30694555875` and Frontend CI `30694555878`
  passed. The initial implementation gates `30694315603` and `30694315630`
  also passed before the hierarchy follow-up.
- Eight focused Compliance direct-route, Viewer/writer, creation, palette, and
  parent Compliance tests passed; the three direct-route cases passed again on
  the final revision. Forced targeted ESLint, full frontend `tsc --noEmit`, and
  `git diff --check` passed.
- Signed-in Viewer production acceptance confirmed one level-one `Compliance
  Logs` heading and one level-two `No compliance logs yet` heading, both in
  bright Night text `rgb(244, 247, 251)`. The empty-state card uses Night
  surface `rgb(21, 29, 39)` and border `rgb(40, 53, 69)`. The Viewer receives
  zero inputs and only Back plus the separate Report Bug control; Report Bug
  was the only detected white element.
- Focused Staff-writer acceptance proves all eight record types, required title,
  optional notes, and canonical creation call remain available. The production
  workspace truthfully contains zero compliance logs, so no record was created
  merely to force populated evidence. No type, title, notes, create, retry,
  compliance log, audit event, billing, or record action was invoked, and the
  session remained signed in.

## Facility SOP Compare Result Night theme and evidence hierarchy

Production's safe no-selection SOP comparison result used the Night shell but
its visible title was not a semantic heading. Authoritative source inspection
also confirmed that populated comparison evidence still hardcoded white run and
checklist cards, pale daytime-blue/yellow status surfaces, and dark day-only
copy. Frontend `385508cb` moved empty/error/loading and complete two-run outcome,
summary, checklist, changed-status, and metadata states to the active palette
and established explicit page and evidence-section heading levels. Comparison
logic, identifiers, and record behavior were not changed.

- Production Build Preflight `30694868963` and Frontend CI `30694868971`
  passed.
- All 21 focused SOP index/detail/start/library/compare, Viewer/writer,
  evidence, back-route, Night-palette, and hierarchy tests passed. Targeted
  ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
- Signed-in Viewer production acceptance confirmed one level-one `SOP Compare
  Result` heading in bright Night text `rgb(244, 247, 251)`, the accurate
  select-two-runs handoff, and no white page-content surface. The separate
  Report Bug control was the only detected white element.
- Production contains only one completed SOP run, so a genuine two-run result
  could not be opened without manufacturing another record. Focused loaded-
  state tests prove outcome, both run summaries, checklist evidence, and
  changed rows use the active palette and readable hierarchy; populated live
  acceptance remains open. No run, selection, comparison, template, step,
  status, note, refresh, audit event, billing, or record action was invoked,
  and the session remained signed in.

## Facility AI Validation Lab direct-route protection

Production hid the AI Validation Lab from the tab bar but did not protect its
direct route. The signed-in Viewer could open all nine raw payload fields and
all four verify, compare, feedback, and training-feedback export actions. The
route also relied on the generic shell `AI QA` title instead of owning its
accurate hierarchy. Frontend `4bc18119` requires both Facility Owner role and
the centralized `FACILITY_SETTINGS_EDIT` capability, rejects a stale capability
on non-owner roles, removes every operational field/action for other roles, and
establishes an accurate page-owned heading plus read-only access explanation.
The Owner workflow and API handlers remain intact.

- Production Build Preflight `30695212093` and Frontend CI `30695212050`
  passed.
- Twenty-eight focused Viewer/Manager/Owner access, validation helper, Night-
  palette, and Facility-tab/header tests passed. Targeted ESLint, full frontend
  `tsc --noEmit`, and `git diff --check` passed. Existing Expo Go notification
  warnings did not fail the suites.
- Signed-in Viewer production acceptance confirmed one level-one `AI Validation
  Lab` heading and one level-two `Owner access required` heading, both in bright
  Night text `rgb(244, 247, 251)`. The route exposes zero inputs, zero verify,
  compare, feedback, or export controls, and zero white page-content surfaces;
  the separate Report Bug control was the only detected white element.
- Focused Owner coverage proves the nine payload fields and operational actions
  remain available only when both role and capability agree. A genuine signed-
  in Facility Owner production account is still required for non-mutating
  owner-side rendering acceptance. No payload, validation, comparison,
  feedback, training export, AI request, credit, audit event, billing, or record
  action was invoked, and the Viewer session remained signed in.

## Shared Videos library Night theme and Facility Viewer acceptance

Production `/videos?tab=library`, reached from Facility More, retained a nearly
black page heading and four white day-only storage metric cards under resolved
Night mode. The Facility Viewer upload/publish/manage restrictions were already
correct. Frontend `e2f2b332` moved the complete shared Personal, Commercial, and
Facility route—including discovery, tabs, search/writer fields, visibility and
scope choices, storage metrics/meter, upload progress, warnings, empty states,
feedback, and deletion confirmation—to the active palette without changing
video permissions or persistence behavior.

- Production Build Preflight `30695649963` and Frontend CI `30695649964`
  passed.
- Six focused Personal Free, Commercial, Facility Viewer, Facility Staff,
  workspace-scope, storage, removal, and Night-palette tests passed. Targeted
  ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
- Signed-in Facility Viewer production acceptance confirmed one level-one
  `Videos` heading in bright Night text `rgb(244, 247, 251)`. All four zero-count
  storage metrics use Night surface `rgb(21, 29, 39)`, border
  `rgb(40, 53, 69)`, and readable muted labels `rgb(201, 212, 223)`. No white
  page-content surface remained; the separate Report Bug control was the only
  detected white element.
- The route retained 0 B of 100 GB used, zero workspace/mine/published/draft
  records, the truthful Viewer watch/follow-only notice, four library filters,
  and zero upload fields. No tab, scope, upload, media, draft, publish, follow,
  removal, storage, audit event, billing, or record action was invoked, and the
  session remained signed in.

## Shared parental-content controls Night theme

Production Facility Profile was mostly palette-correct but retained one white
day-only island: the shared cannabis/parental-lock card and its secure PIN field
used black text and light borders under resolved Night mode. Frontend `e6988960`
moved the reusable card, explanatory/value copy, PIN field and placeholder,
actions, disabled state, and feedback to the active palette and structured its
visible title as a level-two heading. Content-control behavior, eligibility,
PIN security, and save handlers were not changed.

- Production Build Preflight `30695987549` and Frontend CI `30695987525`
  passed.
- Nine focused Facility Profile and account privacy/content-control tests
  passed. Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check`
  passed. Existing React test-timing warnings did not fail the suites.
- Signed-in Facility Viewer production acceptance confirmed a level-two
  `Cannabis content and parental lock` heading in bright Night text
  `rgb(244, 247, 251)`. Its card and untouched secure PIN field use Night
  surface `rgb(21, 29, 39)`, border `rgb(40, 53, 69)`, and bright input text.
  No white page-content surface remained; the separate Report Bug control was
  the only detected white element.
- The account retained `Cannabis content: Hidden`, age eligibility `21_plus`,
  and parental lock `Off`; Hide, Show, and disabled Enable Lock controls
  remained present. No PIN, visibility, eligibility, lock, notification,
  profile, audit event, billing, or record action was invoked, and the session
  remained signed in.

## Facility Dashboard hierarchy and Night-theme no-change acceptance

Production Facility Dashboard already used the active Night palette, retained
its real operational counts, and exposed no white page-content surfaces, so no
color rewrite was made. The live audit did confirm that `Operations Live`,
`Learning & community`, `At a glance`, `Priority status`, and `Command actions`
were visual titles without semantic structure under the shell-owned Dashboard
heading. Frontend `7a78017d` established those five level-two headings without
changing metrics, refresh, navigation, role visibility, or theme behavior.

- Production Build Preflight `30696304941` and Frontend CI `30696304863`
  passed.
- Twenty focused dashboard-hierarchy and Facility-tab/header tests passed.
  Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed.
  The existing Expo Go notification warning did not fail the suites.
- Signed-in Viewer production acceptance confirmed one level-one `Dashboard`
  heading followed by five level-two operational headings. Every heading is
  readable in Night mode, and the separate Report Bug control was the only
  detected white element.
- The same live dashboard retained 15 rooms, zero grows, one SOP, 67 audit
  events, 30 named action controls, Auto resolved to Night, and the existing
  Viewer-specific tile visibility. No theme, location, refresh, metric,
  navigation, room, grow, SOP, audit, task, compliance, AI, export, billing, or
  record action was invoked, and the session remained signed in.

## Facility Profile and shared Appearance hierarchy

Production Facility Profile used the correct Night palette after the parental-
control repair, but its workspace, facility, notification, account, AI, and
setup visual titles were not represented as headings. The shared Appearance
selector similarly exposed no structure for its title or Auto behavior panel.
Frontend `54fbd163` establishes six Profile level-two headings plus a shared
Appearance level-two and Auto-behavior level-three heading beneath the existing
page title. It does not change theme/location behavior, notification settings,
profile actions, billing, logout, or content controls.

- Production Build Preflight `30696604582` and Frontend CI `30696604562`
  passed.
- Four focused Profile rendering and hierarchy tests passed. Targeted ESLint,
  full frontend `tsc --noEmit`, and `git diff --check` passed. Existing Profile
  React test-timing warnings did not fail the suites.
- Signed-in Viewer production acceptance confirmed one level-one `Profile`
  heading, eight level-two headings (`Operational facility identity`,
  `Facility`, `Day, night, or auto`, `Notification settings`, `Account`, `AI
  usage`, `Cannabis content and parental lock`, and `Facility setup`), and one
  level-three `Auto theme behavior` heading. All are readable in Night mode;
  the separate Report Bug control was the only detected white element.
- Auto remained resolved to Night and all seven notification controls remained
  present. No theme, location, notification, workspace, profile, plan, logout,
  PIN, content-control, audit event, billing, or record action was invoked, and
  the session remained signed in.

## Still open

- Implement and verify the real gift recipient claim, email, activation, and
  recipient-side handoff before enabling gift payment.
- Obtain genuine Pro and Facility Stripe settlement, same-plan repeat-trial,
  trial-to-paid, terminal downgrade, paid-course, and non-synthetic dispute
  evidence in their separately authorized acceptance cases.
- Obtain a real device push receipt; visible preferences and in-app category
  controls do not prove external device delivery.
