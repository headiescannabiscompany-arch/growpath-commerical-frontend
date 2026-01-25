# UNIMPLEMENTED_WORKFLOWS.md

> Status: CANONICAL
> Owner: Product/Platform
> Last reviewed: 2026-01-24
> Source of truth for: Commercial & facility workflow definitions, capability mapping, and backend authority requirements

---

## Core Rule

No screen is “implemented” until:

- Backend primitives exist
- Capabilities are defined
- Audit rules are enforced
- Authority flows are locked

UI without backend authority = placeholder.

---

## 1. NutrientTools (Facility)

**Capability:** `capability.nutrients = true`

**Authority Rules:**

- Only facility users
- No deletion of nutrient history
- All changes logged to AuditLog

**Backend Primitives Needed:**

- NutrientProfile
- SoilTestRecord
- FeedingSchedule
- LabelScanLog

_Until these exist: NutrientToolsScreen is a navigation shell, not a feature._

---

## 2. SocialMedia / Influencer / Advertising (Commercial)

These three are one system.

**Capabilities:**

- `capability.marketing = true`
- `capability.advertising = true`

**Authority Rules:**

- Only commercial mode
- Only creator owns accounts
- All ad spend immutable after execution
- ROI derived from ledger, not input

**Backend Primitives Needed:**

- SocialAccount
- Campaign
- AdSpendRecord (append-only)
- PerformanceSnapshot (read-only)

_Without these: These screens are fictional dashboards._

---

## 3. Content Marketplace

**Capability:** `capability.marketplace = true`

**Authority Rules:**

- Creator owns content
- Sales must map to Purchase ledger
- Downloads logged
- Refunds reverse metrics

**Backend Primitives Needed:**

- MarketplaceItem
- Purchase
- DownloadLog
- Rating (derived)

_Until those exist: Marketplace is not real commerce._

---

## 4. Communities / Guilds

**Capability:** `capability.communities = true`

**Authority Rules:**

- Community admins only moderate
- Deletions are soft
- All moderation actions audited

**Backend Primitives Needed:**

- Community
- Membership
- Discussion
- ModerationAction (append-only)

_Without this: Communities is just a chat mock._

---

## Navigation Correction (Critical)

These screens must be split:

**CommercialStack**

- SocialMedia
- InfluencerDashboard
- ContentMarketplace
- Communities
- Advertising

**FacilityStack**

- NutrientTools
- VendorMetrics

_Never mix shells again._

---

## The Real Meaning of This Doc

This is not:

- “We added 8 features”

It is:

- “We defined 8 future subsystems that require backend authority.”

Calling them “features” creates:

- fake progress
- fake confidence
- real architectural debt

---

## Final Verdict

This doc is excellent product imagination but dangerous system representation.

Right now it should be treated as:

- Roadmap, not implementation.

Until each screen has:

- capability keys
- backend primitives
- audit rules
- deletion rules
- authority flows

They are not features.
They are UI shells waiting for reality.

---

## The Pattern You Finally Locked (Again)

Old model:

- “Screen exists → backend supports it.”

Your real model:

- “Workflow exists → screen represents it.”

This doc is still written in the old direction.
Flip it once, permanently, and you’ll never rebuild the same system twice again.
