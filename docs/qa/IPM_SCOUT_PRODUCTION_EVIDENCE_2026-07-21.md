# IPM Scout Production Evidence - 2026-07-21

Status: partial Personal Pro acceptance completed in the in-app Browser. The
structured scout, GPT review charge, user decision, grow-log writeback, task plan,
Journal/Tasks/Timeline persistence, and true deep-link reload all passed. A fresh
IPM photo upload/photo-prefill pass and independent accuracy review remain open.

## Session

- Production URL: `https://growpathai.com`
- Account: `headiescannabiscompany@gmail.com`
- Mode and plan shown in production: Personal Pro / trialing paid state
- Grow: `6a551a9d2fb9f669d2319c06`
- Evidence surface: signed-in in-app Browser, Render dashboard, exact persisted record
  links, hard reloads, and the production live-URL verifier
- Final deployed frontend SHA: `f72b5fbb7b60371d8994ae306737b58ca30cd4b3`
- Final frontend deployment: `dep-d9fha3t7vvec73ea0kig`, live July 21 at 2:45 AM ET

## Truthful insufficient-evidence scout

The live run intentionally represented a no-pest baseline rather than manufacturing
an organism identification. It was attached to the grow and recorded:

- crop context `Cannabis, flowering`, explicitly labeled as a visual suggestion and
  not user-confirmed;
- no pest-specific distribution or progression;
- no observed or recorded organism;
- no pest-specific damage;
- leaf undersides not checked and no magnification;
- no current environment or root-zone measurements;
- no treatment recorded; and
- user evidence `No mold or pest presence recorded in QA grow`.

The production result returned `monitoring_and_differential_needed`, organism `not
confirmed`, low confidence, low severity, and an unresolved pattern. It identified the
missing counts, underside inspection, dated trap context, and sharp whole-plant/damage/
leaf-surface/macro photos. It gave safe inspection steps and did not provide a pesticide
product or application rate. The page also disclosed that no photo pixels were analyzed
for this run.

## Credit-disclosure finding and fix

Before the fix, the page described the calculator as free and labeled the action
`Analyze Scout`, while the backend automatically ran a GPT structured second opinion
and charged one AI credit. The first live run persisted ToolRun
`6a5f08df4622b8f588e8c210` and module record
`6a5f08e04622b8f588e8c218`. A hard Profile reload proved the real charge:

- `72 / 100` became `71 / 100`;
- billed requests increased from 14 to 15; and
- refunds remained zero.

Frontend PR `#84` fixed the mismatch. Commit
`d51f1fafca133fc73634add9252c3881b1222fc4`, merge
`b9744cb60b9cd0ec7609808a5bb24ea185da338f`, and CI run `29805678499`
changed the action to `Analyze Scout + GPT Review (1 AI credit)`, gave it the accessible
name `Run IPM Scout and GPT review for 1 AI credit`, explained the separate photo-prefill
and scout-review charges up front, disclosed failed-provider refunds, and surfaced
`AI credits used` in the result. The ETGU/IPM method documentation and runtime method
registry were updated with the same evidence and charge policy. Render deployment
`dep-d9fgnot7vvec73e9kpeg` was live at 2:07 AM ET.

The post-fix run showed the explicit one-credit action before submission and `AI credits
used 1` after completion. It persisted:

- ToolRun `6a5f0ce94622b8f588e8c2fb`;
- module record `6a5f0ce94622b8f588e8c301`;
- user decision `uncertain` after `Mark as Not Sure`;
- grow log `6a5f0d204622b8f588e8c310`;
- task `Repeat IPM scout` - `6a5f0d294622b8f588e8c318`;
- task `Document IPM evidence and treatment decision` -
  `6a5f0d294622b8f588e8c31e`; and
- task `Review IPM outcome` - `6a5f0d2a4622b8f588e8c324`.

A hard Profile reload then proved `71 / 100` became `70 / 100`, with `30 credits across
16 billed requests` and `0 credits refunded`.

## Persistence, freshness, and hard-reload fixes

The new records were visible in Saved Runs, but the grow Journal could still reuse an
older grow-filtered response. Frontend PR `#85`, merge
`b8e02d6757c8505f5732d1befaba6b09dbcae11e`, CI run `29806051233`, and Render
deployment `dep-d9fgr2svikkc73b7k70g` added no-store reads. The live retest showed that
the static request URL could still be reused by an older app/browser cache.

Frontend PR `#86`, merge `9f99329bde7c6d5c53a4e15bb68a78cb98e53ea0`, CI run
`29806703340`, and Render deployment `dep-d9fh1157vvec73e9r5qg` added a unique
freshness query key to logs, ToolRuns, tasks, and Timeline reads. A clean Browser tab
then loaded the newest records. A true deep-route reload exposed a separate Render HTTP
404, rather than an application-record failure.

The production Render service received a higher-priority `/home/* -> /index.html`
rewrite at 2:34 AM ET. The exact Journal deep route changed from HTTP 404 to HTTP 200.
Frontend PR `#87` versioned the rule and added a representative dynamic personal-grow
URL to both the live verifier and release go/no-go evidence contract. Merge
`f72b5fbb7b60371d8994ae306737b58ca30cd4b3`, CI run `29807707167`, and Render
deployment `dep-d9fha3t7vvec73ea0kig` were live at 2:45 AM ET.

After that final deployment:

- a true Journal hard reload showed both July 21 IPM ToolRuns, the exact new IPM log,
  all three task IDs, and the final diagnosis ToolRuns;
- a true Tasks hard reload showed all three IPM tasks linked to source ToolRun
  `6a5f0ce94622b8f588e8c2fb`;
- a true full Timeline hard reload showed the three tasks, IPM log, IPM module-record
  events, IPM ToolRun, diagnosis feedback, and automation events; and
- `npm run verify:live-urls` passed all nine production URLs after the final SHA was
  live. Ignored evidence was written to
  `tmp/spec/live-url-checks/2026-07-21T06-47-13-270Z.json`.

## Visual evidence

Genuine Browser screenshots were exported outside the repository:

- `growpath-production-ipm-explicit-credit-2026-07-21.png` shows the explicit
  one-credit action and the completed result's one-credit disclosure;
- `growpath-production-ipm-credit-result-2026-07-21.png` shows the cautious result and
  connected actions; and
- `growpath-production-ai-credit-ledger-70-ipm-2026-07-21.png` shows the persisted
  `70 / 100`, 16 billed requests, and zero refunds ledger.

No repository screenshot or video artifact is claimed. Browser semantic inspection and
exact source URLs provide the Journal/Tasks/Timeline reload evidence because the later
viewport screenshot command timed out; no image was fabricated or substituted.

## What this closes and what remains

Closed for this Personal Pro IPM slice:

- crop-neutral, optional-grow structured scout;
- truthful insufficient-evidence handling;
- GPT second-opinion charge disclosure and exact one-credit persistence;
- uncertain user-decision persistence;
- grow-log and three-task-plan writeback;
- exact source-linked Saved Runs, Journal, Tasks, and full Timeline visibility; and
- direct/hard-reload reliability for dynamic `/home/*` routes.

Still open:

- fresh IPM photo upload and the separately disclosed photo-prefill credit path;
- failed-provider refund proof;
- independent pest/pathogen accuracy review using owner-approved evidence sources;
- desktop/mobile accessibility and exported video for the complete Personal Pro loop;
- subscription lifecycle checks; and
- independent outside-user validation.
