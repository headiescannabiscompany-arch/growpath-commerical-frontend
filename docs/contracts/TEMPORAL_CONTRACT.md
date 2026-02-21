# Temporal Contract (Time Is First-Class)

This contract prevents drift in all time-based logic (tasks, calendars, AI tools, audit trails).

## Core Rules

1) Facility timezone is explicit
- Every facility has a canonical IANA timezone string (e.g., `America/New_York`).
- UI and backend must never assume local machine timezone.

2) All persisted timestamps are ISO 8601
- Store as ISO strings (UTC recommended), e.g. `2026-02-21T14:30:00.000Z`.
- Use separate fields for createdAt/updatedAt vs occurredAt (when the thing actually happened).

3) Deterministic logic must not call `Date.now()` directly
- No raw `Date.now()` / `new Date()` inside deterministic engines (calculators, generators).
- Use an injected clock:
  - Backend: `clock.nowIso()` (or equivalent)
  - Tests: controlled `nowIso`

4) AI calls must include TimeContext
Even simple tools receive `TimeContext` so the brain can reason over timelines consistently.

## TimeContext Schema

Minimum:
- `nowIso: string`
- `timezone: string`

Optional:
- `anchors?: { vegStartIso?: string; flipDateIso?: string; flowerDay1Iso?: string }`
- `windowDays?: number` (e.g., last 14 days)

Example:
```json
{
  "nowIso": "2026-02-21T14:30:00.000Z",
  "timezone": "America/New_York",
  "anchors": { "flowerDay1Iso": "2026-01-05T05:00:00.000Z" },
  "windowDays": 14
}
```

## Test Rules (Non-negotiable)

- If a function depends on current time, it must accept nowIso (directly or via TimeContext).
- Snapshot tests must pass with the same outputs given the same TimeContext.
- Any time math must be timezone-aware and tested at boundaries (DST shifts, midnight, etc.).

## Where This Applies (v1)

- Auto Grow Calendar
- Daily Task Generator
- Run-to-Run Comparison (time windows)
- Audit / compliance timelines
- AI tools (including the 4 must-ship tools)
