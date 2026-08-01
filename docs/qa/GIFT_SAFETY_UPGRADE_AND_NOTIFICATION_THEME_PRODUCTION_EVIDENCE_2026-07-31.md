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

## Still open

- Implement and verify the real gift recipient claim, email, activation, and
  recipient-side handoff before enabling gift payment.
- Obtain genuine Pro and Facility Stripe settlement, same-plan repeat-trial,
  trial-to-paid, terminal downgrade, paid-course, and non-synthetic dispute
  evidence in their separately authorized acceptance cases.
- Obtain a real device push receipt; visible preferences and in-app category
  controls do not prove external device delivery.
