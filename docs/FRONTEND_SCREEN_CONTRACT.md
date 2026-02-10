# FRONTEND_SCREEN_CONTRACT

This document defines the contract for each frontend screen in GrowPath (Expo Router): what it may do, what it must not do, which hooks are allowed, how it navigates, and what API endpoints (if any) it calls.

## Global Rules

- One screen per file
- Imports at top only
- Router navigation only (useRouter, router.push, router.replace, router.back)
- Facility screens must gate on selection
- Error contract: useApiErrorHandler + <InlineError error={error} />

## Shared UI/Infra Contracts

- ScreenBoundary wraps all facility screens
- Naming: tabs: facility.<tabName>.tab, stack screens: facility.<feature>.<screen>
- API calls: apiRequest, endpoints, useApiErrorHandler, InlineError
- Canonical request pattern: see below

## Canonical API Request Pattern

```ts
const handleApiError = useApiErrorHandler();
const [error, setError] = useState<any>(null);
const [loading, setLoading] = useState(true);
try {
  setError(null);
  setLoading(true);
  const res = await apiRequest(endpoints.someFn(facilityId));
  // normalize
} catch (e) {
  setError(handleApiError(e));
} finally {
  setLoading(false);
}
```

## Route-by-Route Contract

- Root, Auth, Home, Facility Gate & Select, Facility Tabs, Facility Drill-Ins
- Each screen: allowed hooks, navigation, API, error handling, normalization
- See docs/FRONTEND_ROUTE_MAP.md for full path and navigation contract

## Implementation Guardrails

- Tab files stay small (≤ ~150 lines)
- No HTML tags in shared RN components unless gated for web
- Named boundary strings are stable

## Verification Checklist

- One export default function per file
- All imports at file top
- No duplicate import React
- Uses useRouter (not navigation props)
- If facility screen: gates on facilityId
- Errors: useApiErrorHandler + InlineError
- Tab screens do not contain detail logic
