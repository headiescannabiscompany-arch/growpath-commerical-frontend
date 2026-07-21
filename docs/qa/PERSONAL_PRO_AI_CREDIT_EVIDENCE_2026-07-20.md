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
| Saved Tool Runs Back discarded the Journal or task source and returned to Personal Home                                                      | PR `#74`, merge `27fe657d2dc3ae911a40c553afa659fb8fa0e553`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29795482075` | Render `dep-d9fdfcl7vvec73cecirg`, live at 10:23 PM ET; production preserved bounded Journal/task/timeline source context and Back returned to the exact grow Journal with all 13 saved-run links intact                             |

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

## Production saved-photo diagnosis and credit evidence

The same Personal Pro/trialing account was retested at
`https://growpathai.com/home/personal/diagnose?growId=6a551a9d2fb9f669d2319c06`.
Frontend PRs `#76` and `#77` exposed private photos already saved to the selected grow,
made reuse explicit per photo, repaired backend-relative previews, and gave every saved
photo action a unique accessible name.

| Release                                  | Merge and CI                                                                                                                                                                                                                                                           | Deployment and live result                                                                                                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend saved-photo selection           | PR `#76`, merge `60d466e104263115265206c256754d584a69f9b1`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29796576244`                                                                                                  | Render `dep-d9fdr3l7vvec73cejd80`, live at 10:48 PM ET                                                                                                                                                             |
| Frontend preview and accessible controls | PR `#77`, merge `e67e5fb4091350a3953f4bbbab97256f022af990`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29796990218`                                                                                                  | Render `dep-d9fdvft7vvec73e7vuag`, live at 10:58 PM ET; both saved cannabis photos rendered and exposed distinct controls                                                                                          |
| Backend evidence and diagnosis contract  | Backend PR `#34`, merge `a78d219589a8c434e2e9ce8e58c663af52708570`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29799411551`                                                                                                   | Production Render `dep-d9ferid7vvec73cf8630`, live at 11:57 PM ET; ownership-scoped saved-photo evidence was accepted by diagnosis                                                                                 |
| Backend visual crop and photo context    | Backend PR `#35`, merge `29db80b439f7f6e2d52e227515f245c5a85b144a`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29800719450` and `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29800719455` | Production Render `dep-d9ff8rl7vvec73cfh0jg`, live July 21 at 12:25 AM ET; strict provider output now includes draft crop identity, visible evidence, image usability, limitations, and a discriminating follow-up |
| Frontend visual result context           | Frontend PR `#79`, merge `6ed88c43dcda7fd0cc215fef5cf80ace973baff9`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29800932620`                                                                                         | Render `dep-d9ff85e8bjmc73dmf9v0`, live July 21 at 12:25 AM ET; the production result displayed the visual identity, evidence, photo-quality guidance, provider/model/photo count, and follow-up question          |
| Frontend photo-backed follow-up          | Frontend PR `#81`, merge `46dff907fa6e2798aaa7a23ae8716ccb7c917c89`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29802047337`                                                                                         | Render `dep-d9ffjvt7vvec73cfmvg0`, live July 21 at 12:51 AM ET; follow-up refinement reused the explicitly selected photo evidence instead of dropping to text-only analysis                                       |
| Backend blank-measurement handling       | Backend PR `#36`, merge `478b490cfc9c00bc6bdec76829814d857d4c91cf`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29802043402` and `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29802043429` | Render `dep-d9ffmmm8bjmc73dmnb00`, live July 21 at 12:55 AM ET; blank pH/EC/outcome measurements remained missing rather than becoming false zero values                                                           |
| Frontend follow-up identity provenance   | Frontend PR `#82`, merge `be65d3aa53094900d5c0bb62ed90be4628699042`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29803083989`                                                                                         | Render `dep-d9ffve7aqgkc739fuf50`, live July 21 at 1:14 AM ET; the prior draft identity was carried through photo-backed follow-up                                                                                 |
| Backend identity confirmation provenance | Backend PR `#37`, merge `ecc2e2764864eebe013cb3ef59a99c79c0385c0c`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29803083172` and `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29803083161` | Render `dep-d9fg1jh9rddc73cjrm30`, live July 21 at 1:18 AM ET; provider crop text no longer became `user_confirmed` without an explicit user confirmation                                                          |
| Backend empty-context visual provenance  | Backend PR `#38`, merge `09a9f7536b57dbbc29d908e7137856a2c42c152d`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29803751983` and `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29803752016` | Render `dep-d9fg87t7vvec73e9ai1g`, live July 21 at 1:32 AM ET; an identity supported by the photo but no supplied crop context is deterministically labeled `visual_suggestion`                                    |

Immediately before the diagnosis, Profile showed `93 / 100` and
`7 credits across 7 billed requests; 0 credits refunded`. The user explicitly selected
the saved grow photo `Ready to chop`; the diagnosis page created evidence record
`6a5eee44773443409356cdd3`, displayed `1/10 photos`, and enabled the diagnosis action.
One provider-backed photo-only diagnosis then completed against the real saved image.
It reported source `openai`, model `gpt-4o-mini`, medium severity, and a tentative
nutritional-issue result with observed yellowing/browning, inconsistent leaf color,
counter-evidence, and follow-up checks.

After returning to and reloading Profile, the server balance showed:

- `90 / 100` AI credits;
- `10 credits across 8 billed requests`;
- `0 credits refunded`.

The exact three-credit diagnosis charge therefore completed once and persisted through
route navigation. Genuine in-app Browser screenshots showed the selected real photo,
provider result, and final Profile balance. They were emitted in the release task but
were not exported as repository files, so no repository screenshot/video artifact is
claimed.

That first request proved the existing-photo transport, ownership boundary,
image-capable provider path, one successful billed request, and exact ledger deduction.
It also exposed that the strict provider schema omitted the crop-identity and photo-
quality fields the result screen expected.

After backend PR `#35` and frontend PR `#79` were both live, the same saved photo was
selected again as evidence record `6a5ef52b5ce1862f4e622327`. Immediately before the
request, Profile showed `90 / 100`, `10 credits across 8 billed requests`, and zero
refunds. The production result then reported:

- draft crop identity `Cannabis` / `Cannabis sativa`, high confidence, not ambiguous;
- no cultivar or strain inference;
- visible identity evidence including cannabis leaf shape, flowering calyxes, and
  trichomes;
- one photo inspected and usable for cautious triage;
- visible healthy buds plus possible leaf-tip burn/discoloration;
- replacement guidance for a less cluttered, closer symptom photo and a whole-plant
  view;
- provider `openai`, model `gpt-4o-mini`, and a specific feeding-schedule follow-up;
- explicit user confirmation required before the visual identity becomes saved crop
  context.

The grow's production Plants page showed `No plants yet`, so there was no real plant row
for a selector to hide. The result correctly used the submitted image to suggest draft
crop context without inventing a plant record or strain.

After the result, Profile persisted `87 / 100`, `13 credits across 9 billed requests`,
and `0 credits refunded`. The second diagnosis therefore deducted exactly three credits
once. Genuine in-app Browser screenshots were exported outside the repository for the
result overview, draft crop identity/photo evidence, and final credit ledger. They are
tied to the production URL, the two release SHAs above, and the July 21 12:25 AM ET
deployments; no repository image artifact is claimed.

## Production refinement, outcome, and writeback evidence

After the follow-up and provenance releases were live, the same saved photo was used
with all crop fields intentionally blank. The final fresh diagnosis used evidence asset
`6a5f047b4622b8f588e8c0bb`, reported provider `openai` and model `gpt-4o-mini`, and
identified `Cannabis` / `Cannabis sativa` at high confidence. It explicitly described
the identity as suggested from submitted photo evidence, required confirmation or
correction, did not infer a cultivar, and retained the same `visual_suggestion`
provenance through the provider follow-up. The final follow-up answer recorded that no
mold or pest presence existed in the QA grow and asked for the next measurements or
replacement photos; the refined result kept blank pH, EC, environment, root-zone, and
feeding fields missing instead of manufacturing zero values.

The final fresh ToolRun was `6a5f048a4622b8f588e8c0c9`; the photo-backed follow-up
ToolRun was `6a5f04b04622b8f588e8c0e4`; and the source diagnosis was
`6a5f04b04622b8f588e8c0e2`. The user submitted an `Unsure` verdict explaining that
the photo-backed Cannabis identity and provenance were correct but the nutrient
hypothesis could not be confirmed without the missing measurements. The UI confirmed
that feedback was saved.

The diagnosis was then saved to grow log `6a5f04d84622b8f588e8c10a` and reopened at its
exact production URL. Follow-up task `6a5f04e14622b8f588e8c110` persisted in the same
grow with high priority, due July 22, accepted diagnosis tags, and source diagnosis
`6a5f04b04622b8f588e8c0e2`. Journal showed the linked task, log, and both final
ToolRuns; the full grow Timeline showed the diagnosis feedback and automation event.

The five additional provider-backed diagnosis requests after the earlier `87 / 100`
checkpoint each charged exactly three credits. Final Profile state was `72 / 100`,
`28 credits across 14 billed requests`, and `0 credits refunded`. Genuine in-app
Browser screenshots were exported outside the repository for the diagnosis result,
photo evidence, exact Journal chain, and final 72-credit ledger. The ledger capture is
`growpath-production-ai-credit-ledger-72-confirmed-2026-07-21.png`; no repository image
artifact is claimed.

Fresh file upload, failed-request refund behavior, exact saved-diagnosis reopening, and
independent accuracy review remain open.

## Production IPM Scout and reload evidence

The same Personal Pro session then completed a structured IPM Scout pass using a
truthful no-pest baseline. The result stayed at
`monitoring_and_differential_needed`, did not confirm an organism, listed the exact
missing evidence and next inspection steps, and did not recommend a pesticide product
or rate.

The live pass exposed that the automatic GPT review charged one credit while the action
still looked free. Frontend PR `#84` made the one-credit GPT review explicit before and
after submission. The post-fix ToolRun `6a5f0ce94622b8f588e8c2fb`, uncertain decision,
log `6a5f0d204622b8f588e8c310`, and three source-linked IPM tasks persisted. A hard
Profile reload proved `71 / 100 -> 70 / 100`, 16 billed requests, and zero refunds.

PRs `#85` and `#86` then closed stale grow-history reads with no-store requests plus a
per-request freshness key. A clean reload exposed a separate production-host 404 for
dynamic personal routes. The live Render service received a higher-priority `/home/*`
rewrite, and PR `#87` versioned and release-gated it. Final merge
`f72b5fbb7b60371d8994ae306737b58ca30cd4b3` was live as
`dep-d9fha3t7vvec73ea0kig` at 2:45 AM ET. True hard reloads of Journal, Tasks, and the
full grow Timeline then retained the exact July 21 IPM and diagnosis records. The
nine-URL production verifier also passed after that final SHA was live.

The complete record, exact IDs, release chain, and remaining photo/refund/independent-
review checks are in `docs/qa/IPM_SCOUT_PRODUCTION_EVIDENCE_2026-07-21.md`.

## Remaining Personal Pro acceptance

This closes the paid text-AI deduction/persistence slice plus existing-log, saved-
ToolRun, and production task source reopening, including a newly created and cleaned-up
ToolRun-to-task chain. It also closes successful saved-photo transport, visual cannabis
identity/photo-quality context, photo-backed follow-up refinement, outcome feedback,
diagnosis-to-log/task persistence, exact log reopening, and seven exact three-credit
production diagnosis deductions. It also closes the structured IPM insufficient-
evidence result, explicit one-credit GPT review, uncertain decision, log/task plan,
fresh Journal/Tasks/Timeline reloads, and dynamic personal deep-link reliability. It
does not close the entire Personal Pro session. Fresh diagnosis/IPM file upload,
failed-request refund behavior, exact saved-diagnosis reopening, billing refresh,
cancellation/expiry, password/email lifecycle, desktop/mobile accessibility, exported
video, and independent outside-user review remain open.
