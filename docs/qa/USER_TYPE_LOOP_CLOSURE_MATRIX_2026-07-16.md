# User-Type Loop-Closure and Polish Matrix

## Objective

Polish the existing product by proving that every visible promise completes its full
workflow. External-user feedback remains required validation, but it does not replace
systematic first-party verification.

## Evidence intake

For each session, retain the raw screen recording and notes. Record findings with:

- timestamp and route;
- account, workspace, plan, and Facility role;
- action attempted and expected result;
- visible result, persisted result after refresh, and downstream result;
- permission or payment boundary encountered;
- severity, root cause, fix commit, and live-retest status.

Narrated recordings may be rough. Say "bug" when behavior is wrong and explain the
expected outcome; the review pass converts that evidence into the tracked finding.

## Two required tracks

### 1. Loop closure

An action passes only when all applicable stages pass:

1. Entry point is understandable and available to the correct user.
2. Input validation and permission handling are accurate.
3. The action succeeds or fails with a useful recovery path.
4. The result persists after refresh, sign-out, and return.
5. Related detail, history, task, log, schedule, notification, and audit surfaces agree.
6. Source links reopen the exact originating record.
7. Other roles see only the state and controls they are allowed to see.
8. Email, webhook, payment, export, or external delivery occurs when promised.

### 2. Product polish and outside validation

- Confirm naming, hierarchy, copy, density, back behavior, empty states, loading, and
  mobile/desktop layout.
- Free must feel complete and inviting while accurately enforcing limits.
- Upgrade prompts should follow demonstrated value and explain the unlocked outcome.
- Outside users must independently attempt the same loops and submit feedback through
  Support or Report Bug.
- Outside-user silence is recorded as missing validation, not evidence that a loop works.

## User and role coverage

| Session             | Primary proof                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Public / signed out | Discovery, registration, verification, login, public content, checkout entry, Support                  |
| Personal Free       | First grow/plant, logs, tasks, calculators, weekly AI allowance, limit and upgrade recovery            |
| Personal Pro        | Paid limits, analytics, uploads, diagnosis, AI usage, billing and cancellation state                   |
| Commercial          | Brand identity, products, courses, campaigns, trials, inventory, orders, analytics, storefront handoff |
| Facility Owner      | Setup, subscription, team, roles, rooms, grows, inventory, compliance, audit, full oversight           |
| Facility Manager    | Operational creation, assignment, approvals, team behavior, restricted owner actions                   |
| Facility Staff      | Assigned work, logs, task status/proof, permitted operational writes, blocked administration           |
| Facility Viewer     | Accurate read-only state, navigation, source links, hidden/disabled mutations, backend 403 proof       |

Viewer and Staff do not require the Owner's depth of configuration UI. Their smaller
surface must still be clear, internally consistent, and complete.

## Connected workflow matrix

| Workflow                       | Sessions                              | Closure evidence                                                                               |
| ------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Account lifecycle              | Public, all signed-in types           | Register -> verify -> login -> profile -> reset password -> sign out/in                        |
| Subscription and trial         | Free, Pro, Commercial, Facility Owner | Select plan -> checkout/trial -> webhook state -> entitlement -> billing -> cancel/expiry      |
| AI credits                     | Free, Pro, Commercial, Facility       | Cost shown -> action -> exact deduction/refund -> refresh -> weekly allowance truth            |
| Personal cultivation           | Free, Pro                             | Grow -> plant -> log/photo -> task -> tool/diagnosis -> timeline -> source reopen              |
| Shared schedule and alerts     | All signed-in types                   | Source event -> schedule/alert -> exact source link -> update/complete -> reflected state      |
| Community                      | Public, Free, paid types              | Discover -> join/post/comment -> moderation -> notification -> exact thread reopen             |
| Commercial proof-to-storefront | Commercial, Public                    | Product/course/trial/evidence -> publish -> public view -> inquiry/purchase -> analytics/order |
| Facility operating chain       | Owner, Manager, Staff, Viewer         | Configure -> assign -> execute/prove -> approve -> observe -> history/audit                    |
| Facility permissions           | Owner, Manager, Staff, Viewer         | Correct visible controls plus forced backend authorization result for restricted actions       |
| Support and bugs               | Public, all signed-in types, Admin    | Report entry -> prefilled form -> submit -> stored inbox -> email -> status -> resolution      |
| Privacy and account closure    | All signed-in types                   | Export/request -> delivered artifact/state -> deletion/cancellation -> access removed          |

## Facility chain session

Test one shared facility record across four separate sessions:

1. Owner creates the operational object and assigns responsibility.
2. Manager reviews, changes allowed operational state, and assigns work.
3. Staff completes the assigned work with required notes or proof.
4. Viewer sees the current result and cannot mutate it.
5. Owner confirms history, notifications, compliance consequences, and audit evidence.

The chain fails if any role sees stale state, loses source context, receives an inaccurate
control, or can bypass its backend authorization boundary.

## Working status

### Browser evidence attempts

- 2026-07-19 12:45:56 EDT: the public/signed-out loop recording could not start because
  this chat could not see an in-app Browser tab. No production URL was opened and no
  screenshot or video was captured. The worktree baseline was
  `2449b228cae32867939ab8764dee9a5ec8fc71d2` with uncommitted checklist implementation
  changes, so the public loop remains pending. Follow
  `docs/codex-browser-evidence-runbook.md`: fully restart Codex, confirm the Browser
  plugin is enabled, start a new chat, open the in-app Browser with `Ctrl+Shift+B`, and
  make the production tab visible before retrying.

### Personal Free backbone audit

- Environment Review now uses the mounted ToolRun API, clearly identifies its
  rule-based provider, costs 0 AI credits, uses generic stage references instead of
  presenting the current reading as a target, and can reuse its saved run when creating
  a log or task.
- Feeding Schedule Planner now uses the mounted ToolRun API, costs 0 AI credits, does
  not convert blank optional EC/pH readings to zero, and can reuse its saved run when
  creating a log or task.
- The launch Free allowance remains 10 credits per week: 10 completed Ask AI answers,
  or 3 completed photo diagnoses plus 1 Ask AI answer. This is a conversion hypothesis,
  not yet a validated optimum.
- During live testing, record weekly credit exhaustion, action mix, failed/refunded
  calls, upgrade-view rate after demonstrated value, and upgrade conversion. Do not
  tune the allowance from anecdote alone.
- Static and automated closure checks are complete for these two repaired tools. The
  Personal Free session remains open until the deployed build is recorded end to end.

- [ ] Public / signed-out loop session recorded and reviewed.
- [ ] Personal Free loop session recorded and reviewed.
- [ ] Personal Pro loop session recorded and reviewed.
- [ ] Commercial loop session recorded and reviewed.
- [ ] Facility Owner loop session recorded and reviewed.
- [ ] Facility Manager loop session recorded and reviewed.
- [ ] Facility Staff loop session recorded and reviewed.
- [ ] Facility Viewer loop session recorded and reviewed.
- [ ] Cross-role Facility chain completed on one shared record.
- [ ] Outside user completes at least one core loop and submits independent feedback.
- [ ] Findings are fixed, committed, pushed, deployed, and live-retested against timestamps.
