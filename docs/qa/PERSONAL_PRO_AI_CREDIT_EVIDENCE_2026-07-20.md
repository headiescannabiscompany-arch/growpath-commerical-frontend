# Personal Pro AI-credit evidence - 2026-07-20

## Production session

- Production URL: `https://growpathai.com`
- Account: `headiescannabiscompany@gmail.com`
- Workspace mode: Personal
- Server plan/status: `PRO (trialing)`
- Weekly allowance: 100 AI credits from the plan, refreshing Monday UTC
- Evidence surface: in-app Browser visible DOM and persisted server balance

At approximately 8:23 PM ET, Profile showed `94 / 100` AI credits and
`6 credits across 6 billed requests; 0 credits refunded`. Ask AI was opened with the
account's selected grow context and received this bounded request: use only the loaded
grow records, recommend the single safest next observation, identify missing
measurements, and do not invent data.

The provider-backed request completed successfully. The answer used the loaded IPM
context, recommended a spider-mite inspection, and explicitly identified missing
environment measurements and the lack of confirmed plant records. After returning to
Profile, the server state showed:

- `93 / 100` AI credits;
- `7 credits across 7 billed requests`;
- `0 credits refunded`.

The one-credit deduction therefore completed and persisted through route navigation and
Profile reload. This also proves that the configured production AI provider was usable
for this request at the recorded time; it does not expose or validate the plaintext API
key itself.

## Finding fixed and live-retested

The same Pro account incorrectly displayed `Upgrade to Pro`. Frontend PR `#64` removed
current and lower plan actions while retaining valid next plans and billing access.

- Local commit: `1d9109c0`
- Merge SHA: `cc822f8dbc242c08279aeb9089628b85010c3c0a`
- CI: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29790336682`
- Render deployment: `dep-d9fbrjkm0tmc73f7udd0`
- Live time: July 20, 2026 at 8:33 PM ET

The production Profile was reloaded after that exact SHA became live. It showed plan
`pro`, `93 / 100`, and the persisted 7-request usage. `Upgrade to Pro` was absent;
`Upgrade to Commercial`, `Apply / Upgrade to Facility`, and `Manage Billing` remained
available.

## Personal grow and journal follow-up

The same production session continued from Grows into the account's active
`bruce banner and mountain top mint` grow. The list showed the grow as active and
provided exact Log, AI Tools, Data Integrations, and Export Report links. The Log link
opened
`/home/personal/logs/new?growId=6a551a9d2fb9f669d2319c06`, and the journal form
retained that grow ID.

Seven navigation, visual, and accessibility findings were fixed and live-retested:

| Finding                                                                                                                                      | Merge and CI                                                                                                                                                          | Deployment and live result                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grows displayed three stacked titles from the outer tabs, inner stack, and content page                                                      | PR `#66`, merge `e3eaf44e29a54ba1b9b41e6bfe03e464883b3948`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29791250710` | Render `dep-d9fc4j19rddc73chetb0`, live at 8:53 PM ET; production Grows showed one visible title                                                                                                                                     |
| Removing navigator titles left root-page visual titles without heading semantics                                                             | PR `#67`, merge `34e6b9024b8c699736e093ca23af4f635582e286`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29791755333` | Render `dep-d9fc9fl7vvec73cdltag`, live at 9:03 PM ET; production Grows exposed exactly one level-1 heading while retaining one visible title                                                                                        |
| New Journal Entry repeated the stack title above its own Back control and content title                                                      | PR `#68`, merge `e8c24316a415882163f4ea04768bff074342c6b9`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29792247627` | Render `dep-d9fce44vikkc73b4u1i0`, live at 9:12 PM ET; the exact grow-scoped journal URL showed one heading, one visible title, working Back, and preserved grow context                                                             |
| Journal Back followed browser history to Personal Home instead of the selected grow's Journal                                                | PR `#70`, merge `ecdc97f1185f7986b7783d2c38ee713bdaed6784`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29793127917` | Render `dep-d9fcnm68bjmc73dl0fog`, live at 9:33 PM ET; Back from New Journal Entry and the existing `AI grow summary` detail returned to the exact grow Journal                                                                      |
| Journal ToolRun and task cards were static, and Personal task source routes discarded the task ID                                            | PR `#71`, merge `4ba02db44e05ba44c307d0ac6dada635cd2c6122`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29793933588` | Render `dep-d9fcvicm0tmc73f8l0d0`, live at 9:49 PM ET; production Journal exposed 13 exact saved-run links and the clicked URL preserved `toolRunId=6a5dc87b62c955c489aaece0`                                                        |
| Exact saved-run links selected the right record below the full history list, outside the initial viewport, while the page repeated its title | PR `#72`, merge `115856c84ed5009f95e8a6abe9c791d9eb142178`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29794475573` | Render `dep-d9fd51km0tmc73f8o68g`, live at 10:01 PM ET; the same production click scrolled to the green `Opened from source link` result, showed one heading, retained Saved run history below it, and produced no missing-run error |
| Saved Tool Runs Back discarded the Journal or task source and returned to Personal Home                                                      | PR `#74`, merge `27fe657d2dc3ae911a40c553afa659fb8fa0e553`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29795482075` | Render `dep-d9fdfcl7vvec73cecirg`, live at 10:23 PM ET; production preserved bounded Journal/task/timeline source context and Back returned to the exact grow Journal with all 13 saved-run links intact                 |

## Exact source-reopen production evidence

The final in-app Browser retest used the same Personal Pro/trialing account and active
grow at
`/home/personal/grows/6a551a9d2fb9f669d2319c06/journal`. The deployed Journal
contained 13 ToolRun cards with exact
`/home/personal/tools/saved-runs?toolRunId=...` destinations. The first card opened
ToolRun `6a5dc87b62c955c489aaece0`; the selected result was immediately visible, labeled
`Opened from source link`, and showed the saved species/crop identification inputs,
outputs, warnings, and follow-up actions. Semantic inspection found one
`Saved Tool Runs` heading, and the requested-run error was absent.

The existing log source path was also live-retested: `AI grow summary` opened log
`6a5bf200cd95f5443f8b4445`, retained its saved content, and Back returned to the exact
grow Journal.

The task chain was then exercised with production data. ToolRun
`6a5dc87b62c955c489aaece0` created task `6a5ed5694789c2c0dd0f2da6`. Journal exposed one
exact
`/home/personal/grows/6a551a9d2fb9f669d2319c06/tasks?taskId=6a5ed5694789c2c0dd0f2da6`
source link; opening it showed the focused `Follow up on species_crop_id` task with
the `Opened from Journal` marker and no unavailable-task error. `View Source` reopened
the exact saved ToolRun with no missing-run error. The temporary QA task was archived,
and the final Journal retest showed zero task links and the original 13 ToolRun links.

That task retest also exposed Saved Tool Runs Back returning to Personal Home. PR `#74`
carried a bounded source context for Journal, task, and timeline entry points. After
merge `27fe657d2dc3ae911a40c553afa659fb8fa0e553` became live as Render deployment
`dep-d9fdfcl7vvec73cecirg`, the production Journal -> saved ToolRun -> Back loop returned
to the exact grow Journal. Semantic inspection found the Journal heading, 13 saved-run
links, and zero archived-task links.

Genuine in-app Browser screenshots were captured in the release task after the Grows,
journal, saved-run, and task deployments, including the focused ToolRun result, focused
task source chain, and final exact-Journal Back result tied to merge
`27fe657d2dc3ae911a40c553afa659fb8fa0e553` and deployment
`dep-d9fdfcl7vvec73cecirg`. They were emitted in the task but were not exported as
repository image files; no repository screenshot/video artifact is claimed.

## Remaining Personal Pro acceptance

This closes the paid text-AI deduction/persistence slice plus existing-log, saved-
ToolRun, and production task source reopening, including a newly created and cleaned-up
ToolRun-to-task chain. It does not close the entire Personal Pro session. Full
diagnosis/upload usage, failed-request refund behavior, billing refresh,
cancellation/expiry, password/email lifecycle, desktop/mobile accessibility, exported
screenshots/video, and a newly created journal-log persistence check remain open.
