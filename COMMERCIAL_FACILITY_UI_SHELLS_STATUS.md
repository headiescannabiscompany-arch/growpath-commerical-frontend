# GrowPath AI – Commercial & Facility UI Shells Status (Reality-Based)

> Status: CANONICAL
> Owner: Product/Frontend
> Date: January 12, 2026
> Scope: Frontend screens + API client stubs added for Commercial/Facility modules.
> Important: These are UI shells, not completed features, until backend workflows + capabilities + authority rules exist.

---

## What Was Actually Delivered

### ✅ Frontend UI Shells Created

- Facility: Nutrient tools hub screen
- Commercial: Social media connection UI
- Commercial: Influencer metrics dashboard UI (mock data)
- Commercial: Content marketplace UI (mock data)
- Commercial: Communities UI (mock data)
- Commercial: Advertising UI (mock data)
- Vendor metrics screen updated with soil health inputs (CEC/pH/EC)

### ✅ API Client Stubs Added

Modules created with placeholder endpoints and request shapes:

- src/api/socialMedia.js
- src/api/marketplace.js
- src/api/community.js
- src/api/advertising.js

These clients define intended contracts but do not imply backend existence.

---

## OS Requirements (Must Be True Before These Are “Features”)

### Keystone: /api/auth/me

All shell selection and gating must be driven by:

```json
{
  "mode": "personal|commercial|facility",
  "plan": "free|pro|commercial|facility",
  "capabilities": { "key": true },
  "facilitiesAccess": [{ "facilityId": "...", "role": "OWNER|MANAGER|STAFF" }]
}
```

### Capability Keys (Required)

These screens must be controlled by capabilities, not screen existence:

- capability.nutrients
- capability.vendor_metrics
- capability.social_connect
- capability.influencer_analytics
- capability.marketplace
- capability.communities
- capability.advertising

UI must only render features when capability is true.

---

## Navigation Fix (Critical)

### Current State (Incorrect)

Commercial screens were registered under FacilityStack.

### Required State (Correct)

Split navigation by shell:

**FacilityStack**

- NutrientTools
- VendorMetrics (if truly facility ops)

**CommercialStack**

- SocialMedia
- InfluencerDashboard
- ContentMarketplace
- Communities (if commercial-only)
- Advertising

If Communities is intended for personal users too, make it a shared module or separate CommunityStack.

---

## Backend Workflows Required (Minimal MVP)

These are the minimum backend primitives required to turn UI shells into real features.

### Social (Commercial)

- MVP approach: manual token storage + sync stub (no full OAuth yet).
- SocialAccount (store platform + token metadata)
- SocialMetricsSnapshot (append-only snapshots)

### Marketplace (Commercial)

- MVP approach: content listing + purchase ledger (no full payout automation).
- MarketplaceItem
- Purchase (immutable)
- DownloadLog (append-only)
- Earnings (append-only)

### Communities

- MVP approach: CRUD + moderation audit.
- Community
- Membership
- Discussion
- Reply
- ModerationAction (append-only)

### Advertising

- MVP approach: campaign records + spend ledger (no ad platform integrations yet).
- Campaign
- SpendRecord (append-only)
- PerformanceSnapshot (optional)

---

## What This Does NOT Claim

This document does not claim:

- “all tasks completed”
- “security implemented”
- “OAuth implemented”
- “real ad metrics integrated”
- “backend endpoints exist”

Until backend authority + audit + facility scoping exists, these remain UI shells.

---

## Immediate Next Steps

- Fix navigation: move commercial screens out of FacilityStack
- Add capability gating: hide/show based on /auth/me capabilities
- Replace mock data with empty states + CTA buttons
- Implement minimal backend primitives in MVP order (above)

---

## End
