# Contract Locks

This document anchors all production-ready ("locked") surfaces in the frontend. Each marker commit represents a specific scope where drift is prevented via canonical pattern enforcement.

## Marker A — Facility Mode Contract Locked

- **Commit:** `57e4cd9`
- **Date:** 2025-01-26
- **Scope:**
  - `src/screens/facility/**` (all except FacilityPicker)
  - Facility API modules: `rooms.ts`, `verification.ts`, `sop.ts`, `vendors.ts`, `facilitySettings.ts`
  - Facility hooks: `useRooms`, `useVerification`, `useSopTemplates`, `useVendors`, `useFacilitySettings`
- **Rules:**
  - No `useAuth()` for facility context (use `useFacility()` only)
  - No hardcoded `/api/` literals in screens
  - No raw `fetch()` or `axios` in screens
  - All facility screens import only hooks, never endpoints or API modules directly
  - Response envelope handling in API modules (fallback chains for backend variation)
  - All errors route through `handleApiError()` with facility-specific handlers

---

## Batch 1 — Vendor Onboarding

- **Commit:** `1ebf70a`
- **Scope:** VendorSignup.js, vendorSignup API, useVendorSignup hook
- **Rules:** No hardcoded endpoints, no manual token injection, mutation-driven state

---

## Batch 2 — Feed / Community

- **Commit:** `eb4673a`
- **Scope:** feedApi.ts (canonicalized), feed.ts API, useCreatePost hook, CreatePostScreen.js
- **Rules:**
  - `feedApi.ts` routes through `endpoints.*` (no /api literals)
  - FormData + web Blob conversion moved to API module, not screen
  - No `submitting` state in screen (use `isCreating` from hook)
  - All errors routed through `handleApiError()`

---

## Batch 3 — Live Sessions

- **Commit:** `da8b8d8`
- **Scope:** live.ts API, useLiveSession hook, LiveSessionScreen.js
- **Rules:**
  - No `safeFetchJson()` helper in screens
  - No hardcoded `https://example.com/api/...` endpoints
  - No `setStatus` state soup (use `isWorking` from hook)
  - Unified mutation state across host/join/end actions

---

## Debug / Health Diagnostics

- **Commit:** `6bd8589`
- **Scope:** debug.ts API, useDebugApi hook, DebugScreen.js
- **Rules:**
  - Ping and info diagnostics route through `endpoints.*`
  - No raw `fetch()` in screen
  - Mutations allow "press to run" without manual state management

---

## Marker B — Frontend Contract Locked

- **Commit:** `<THIS COMMIT>`
- **Scope:** All facility, vendor, feed, live, and debug surfaces
- **Rules (Global):**
  1. **Canonical Pattern:** Screen → Hook → API Module → Endpoints
  2. **No Drift Layers:** Screens never skip hooks or import endpoints directly
  3. **No /api literals:** All routes defined in `endpoints.ts`
  4. **React Query Only:** All data fetching via `useQuery`/`useMutation`
  5. **Standardized Errors:** All errors route through `handleApiError()`
  6. **Response Envelopes:** API modules handle backend response variation with fallback chains
  7. **ESLint Enforcement:** Drift-stopper rule blocks hardcoded `/api/` strings in code review

---

## Status: Production Ready

All locked surfaces have been verified via:

- Scoped drift scans (no /api literals, no fetch in screens)
- Pattern consistency checks (all screens follow canonical structure)
- Hook integration tests (mutations trigger refetch correctly)
- Error handler validation (all errors route through standardized handler)

Remaining surfaces (courses, templates, reports, admin, etc.) are intentionally unmigrated and can be tackled in future batches without affecting locked surfaces.

---

## How to Extend

To add a new surface to Marker B or a future marker:

1. Add endpoints to `endpoints.ts` (no /api literals anywhere else)
2. Create API module (`src/api/feature.ts`) with standardized functions
3. Create hook (`src/hooks/useFeature.ts`) with useQuery/useMutation wrappers
4. Convert screen to use only the hook (no direct API or endpoints imports)
5. Run scoped drift scans to verify
6. Create atomic commit
7. Reference commit SHA in this file under the appropriate marker section
