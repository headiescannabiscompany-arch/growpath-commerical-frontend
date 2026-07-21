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

Three visual/accessibility findings were fixed and live-retested:

| Finding                                                                                 | Merge and CI                                                                                                                                                          | Deployment and live result                                                                                                                                               |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grows displayed three stacked titles from the outer tabs, inner stack, and content page | PR `#66`, merge `e3eaf44e29a54ba1b9b41e6bfe03e464883b3948`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29791250710` | Render `dep-d9fc4j19rddc73chetb0`, live at 8:53 PM ET; production Grows showed one visible title                                                                         |
| Removing navigator titles left root-page visual titles without heading semantics        | PR `#67`, merge `34e6b9024b8c699736e093ca23af4f635582e286`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29791755333` | Render `dep-d9fc9fl7vvec73cdltag`, live at 9:03 PM ET; production Grows exposed exactly one level-1 heading while retaining one visible title                            |
| New Journal Entry repeated the stack title above its own Back control and content title | PR `#68`, merge `e8c24316a415882163f4ea04768bff074342c6b9`; CI `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29792247627` | Render `dep-d9fce44vikkc73b4u1i0`, live at 9:12 PM ET; the exact grow-scoped journal URL showed one heading, one visible title, working Back, and preserved grow context |

Genuine in-app Browser screenshots were captured in the release task after the Grows
and journal deployments. They are tied to the production URL and exact SHAs above, but
were not exported as repository image files; no repository screenshot/video artifact is
claimed.

## Remaining Personal Pro acceptance

This closes the paid text-AI deduction/persistence slice, not the entire Personal Pro
session. Full diagnosis/upload usage, failed-request refund behavior, billing refresh,
cancellation/expiry, password/email lifecycle, desktop/mobile accessibility, exported
screenshots/video, and the complete grow/log/task/tool/source-reopen chain remain open.
