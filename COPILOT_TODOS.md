# GrowPath AI – Copilot-Ready TODOs (v1 Lockdown)

> Status: CANONICAL
> Owner: Product/Engineering
> Last reviewed: 2026-01-24
> Source of truth for: Product milestones, workflow rules, and Copilot guardrails

## Non-Negotiables (Read First)

- No placeholder stubs. Every screen must ship with real empty states + CTA.
- No new screens unless they exist in FRONTEND_SCREEN_MAP.md.
- Auth context is authoritative from GET /api/auth/me.
- Navigation is capability-driven, not “guess the mode.”
- All money uses integer cents + webhook confirmation (no float, no frontend success grants access).

---

## Milestone 0 — Freeze + Align (Stop the Oscillation)

**Goal:** lock product boundaries so coding converges.

- Freeze screen creation: only edit existing screens in FRONTEND_SCREEN_MAP.md
- Add EMPTY_STATE.md patterns and require them on every screen
- Confirm canonical shells:
  - personal_free, personal_pro, commercial, facility

**Definition of Done**

- No new screens added
- Every “stub” replaced with EmptyState + CTA
- FRONTEND_SCREEN_MAP.md updated and treated as canonical

---

## Milestone 1 — Keystone Auth Contract (Fix the Core Bug)

**Goal:** stop frontend guessing.

**Backend**

- Implement GET /api/auth/me returning:
  ```json
  {
    "id": "...",
    "email": "...",
    "role": "personal|commercial|facility",
    "plan": "free|pro",
    "mode": "personal|commercial|facility",
    "capabilities": { "keysUsedInRegistry": true },
    "facilitiesAccess": [{ "facilityId": "...", "role": "OWNER|MANAGER|STAFF" }]
  }
  ```
- Add server-side capability generator (single function, used everywhere)
- Add plan + role + mode fields to User model (per DB_SCHEMA_DIFF.sql)
- Add middleware helpers:
  - requireMode(mode)
  - requireCapability(key)
  - requireFacilityRole(role)

**Frontend**

- Update AuthProvider to consume /api/auth/me once and cache
- RootNavigator chooses shell:
  - PersonalTabs / CommercialTabs / FacilityTabs
- Registry uses capabilities only (no ad-hoc conditionals)

**Definition of Done**

- App boots correctly into the right shell every time
- No screen checks user.role directly except registry/middleware layer
- All “mode guessing” removed

---

## Milestone 2 — Feature Flags & Plan Gating (One System)

**Goal:** unify pricing/permissions so it’s not scattered.

- Implement plan-based gating using FEATURE_FLAGS.md
- Implement limits:
  - course creation limits by plan
  - lesson limits by plan
  - certificate limits by plan
  - advanced tools gating (pro+)
- Add backend enforcement for any limit that matters (not just UI hiding)

**Definition of Done**

- Changing a plan in DB changes screens + API permissions immediately
- Backend rejects actions beyond plan limits with clear error codes

---

## Milestone 3 — Courses v1 (Sell + Enroll + Earnings)

**Goal:** stable commerce loop with correct accounting.

**Backend (Authoritative, Webhook-Based)**

- Create Purchase model (stores stripe ids, status, amountCents)
- Update course purchase to use Stripe Checkout or PaymentIntent
- Implement Stripe webhook handler:
  - creates Purchase + Enrollment + Earning idempotently
- Implement Earning model using integer cents:
  - 70/30 split
  - status: unpaid | payout_requested | paid | reversed
- Implement PayoutBatch model + endpoints:
  - POST /api/earnings/request-payout (min $50)
  - POST /api/admin/payouts/:batchId/mark-paid
- Implement refund/dispute reversal logic via webhook

**Frontend (No Stubs)**

- CourseCreateScreen (multi-step + plan limits + empty states)
- CourseDetailScreen (buy/enroll/watch)
- CreatorDashboardScreen:
  - earnings summary
  - payout request
  - sales list
- Admin/Moderation:
  - CourseModerationScreen (approve/reject/report)

**Definition of Done**

- Buying a course grants access only after webhook confirmation
- Earnings totals match DB (no float drift)
- Payout request works end-to-end (manual admin mark-paid)

---

## Milestone 4 — Pro Grow Tools (Gated Features)

**Goal:** make “Pro” meaningful without breaking Free.

- Gate advanced tools by capability:
  - feed scheduler
  - harvest estimator
  - timeline planner
  - export
- Add pheno-hunting matrix (advanced dropdown option):
  - enabled for personal_pro, commercial, facility

**Definition of Done**

- Free users see locked cards + upgrade CTA
- Pro users see tools fully functional

---

## Milestone 5 — Commercial Shell (Partner / Seller)

**Goal:** commercial becomes “Shopify + Linktree + HubSpot-lite”.

- PartnerDashboardScreen (commercial)
- Storefront (products/courses)
- Campaigns + Links
- Orders + Inventory (basic v1)
- SocialTools (scheduler v1 gated)

**Definition of Done**

- Commercial user can publish a storefront and sell a course
- Orders list shows paid purchases (from Purchase table)

---

## Milestone 6 — Facility Shell (Ops System v1)

**Goal:** facility is real multi-user ops (not “personal + tabs”).

**Backend**

- Facility membership + roles enforced:
  - OWNER, MANAGER, STAFF
- Facility Rooms + tracking config:
  - facility.trackingMode (individual|batch|zone|metrc-aligned)
- BatchCycle CRUD (core production unit)
- Tasks scoped to facility + role permissions
- Audit log (v1 minimal): who did what, when

**Frontend**

- FacilityDashboardScreen
- Rooms → Empty state + Create Room
- BatchCycles → create + list + stage update
- Team screen (list members/roles)
- Reports v1 (simple counts)

**Definition of Done**

- Facility users can manage rooms + batch cycles
- Role restrictions work (STAFF can’t change settings)
- No plant hard limits enforced

---

## Milestone 7 — Documentation Discipline

- Keep these canonical and synced:
  - FEATURE_FLAGS.md
  - DB_SCHEMA_DIFF.sql
  - FRONTEND_SCREEN_MAP.md
  - PAYMENTS_SPEC.md
  - AUTH_CONTRACT.md

**Definition of Done**

- Any new feature updates docs first (or same PR)

---

## Error Code Standards (Add This Now)

Backend must return consistent error codes:

- NOT_AUTHENTICATED
- NOT_AUTHORIZED
- MODE_REQUIRED
- CAPABILITY_REQUIRED
- PLAN_LIMIT_REACHED
- MIN_PAYOUT_NOT_MET
- WEBHOOK_EVENT_DUPLICATE

---

## Copilot Prompt Header (Paste at top of files)

We are building GrowPath AI.
It has four shells: personal_free, personal_pro, commercial, facility.
Navigation is capability-driven from GET /api/auth/me.
Do not generate placeholder stubs. Use real empty states + CTA.
Payments must be webhook-authoritative and use integer cents.
Facility is multi-user with roles.
