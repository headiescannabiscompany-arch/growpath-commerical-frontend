# P-01 Personal Home local acceptance

Date: 2026-08-23  
Candidate: commit containing this evidence file

## Scope closed

- Preserved the existing active-grow command center, alerts, current tasks, journal/diagnosis
  context, first-run state and frequent actions.
- Preserved the six deliberate discovery slots: three Commercial campaigns, one Facility
  education campaign, one course and one popular Forum/Q&A item when eligible inventory is
  available.
- Requested only the Home campaign placement and rejected explicit QA/test, deleted, hidden,
  private, draft, scheduled, paused, ended, cancelled and archived records before assembly.
- Enforced the cannabis visibility policy from structured grow interests/tags and the viewer's
  explicit content control or cannabis grow interest. Free-text prose is not used to infer
  cannabis eligibility.
- Added stable daily rotation across eligible Commercial, Facility and course candidates while
  retaining the highest-engagement eligible Forum/Q&A item.
- Preserved honest, clearly labeled GrowPath shortcuts for missing inventory rather than
  fabricating promotions, courses or community activity.

## Automated evidence

- `PersonalFeaturedFeed`, `PersonalHomeRoute`, `homeModel`, `feedPolicy` and `FeedRail`:
  5 suites / 31 assertions passed.
- TypeScript: passed.
- Touched-source ESLint: passed with zero warnings.
- `git diff --check`: passed.

## Exact remaining live gate

On the frozen production candidate, use a normal Personal account and an opted-in cannabis
account to verify the populated six-slot mix, privacy/visibility differences, stable named
destinations and back navigation without lost Home state. Also verify the honest sparse layout
when one or more eligible content classes have no records. This is production acceptance, not
permission to reconstruct the Personal Home or feed.
