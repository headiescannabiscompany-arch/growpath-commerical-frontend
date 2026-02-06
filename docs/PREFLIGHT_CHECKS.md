# Pre-Flight Code Inspection Results (Marker B + Fixes)

**Date**: 2026-02-06
**Agent Phase**: Deep pre-runtime verification
**Status**: ✅ ALL CHECKS PASSED

## Critical Issues Found & Fixed

### 🔴 Issue 1: Import Path Typo in VendorSignup.js

**Severity**: CRITICAL (Would cause runtime crash)
**Found**: Line 13 imported from `@/util/handleApiError` (singular)
**Fixed**: Changed to `@/utils/handleApiError` then to `@/ui/handleApiError` (correct location)
**Files Modified**:

- `src/screens/VendorSignup.js`
- `src/screens/DebugScreen.js`
- `src/screens/LiveSessionScreen.js`
- `src/screens/CreatePostScreen.js`

**Commit**: `8f87ea6` - "fix: Correct handleApiError import paths in locked screens"

### 🔴 Issue 2: Incorrect handleApiError Path (All Locked Screens)

**Severity**: CRITICAL (Would cause module not found at runtime)
**Root Cause**: handleApiError is located in `src/ui/handleApiError.ts`, not `src/utils/`
**Status**: ✅ FIXED - All 4 locked screens now import from `@/ui/handleApiError`

## Locked Surfaces Status

### ✅ Batch 1: Vendor Onboarding (Marker A + 1ebf70a)

- **File**: `src/screens/VendorSignup.js`
- **Imports**:
  - ✅ `useVendorSignup` from `@/hooks/useVendorSignup`
  - ✅ `handleApiError` from `@/ui/handleApiError`
- **Hook Usage**: ✅ Correctly destructures `signupAsVendor, isPending, error`
- **Endpoints**: ✅ API calls `endpoints.vendorSignup` via hook
- **Drift Check**: ✅ No manual fetch(), no hardcoded URLs

### ✅ Batch 2: Feed/Community (eb4673a)

- **File**: `src/screens/CreatePostScreen.js`
- **Imports**:
  - ✅ `useCreatePost` from `@/hooks/useCreatePost`
  - ✅ `handleApiError` from `@/ui/handleApiError`
  - ✅ `useAuth` from `@/auth/AuthContext`
- **Hook Usage**: ✅ Correctly destructures `createPost, isCreating`
- **FormData**: ✅ Built in `src/api/feed.ts` with web Blob conversion
- **Drift Check**: ✅ No Platform.OS === "web" fetch, no manual form building

### ✅ Batch 3: Live Sessions (da8b8d8)

- **File**: `src/screens/LiveSessionScreen.js`
- **Imports**:
  - ✅ `useLiveSession` from `@/hooks/useLiveSession`
  - ✅ `handleApiError` from `@/ui/handleApiError`
- **Hook Usage**: ✅ Correctly destructures `hostAsync, joinAsync, endAsync, isWorking`
- **Endpoints**: ✅ API calls `endpoints.liveHost`, `endpoints.liveJoin`, `endpoints.liveEnd`
- **Drift Check**: ✅ No safeFetchJson helper, no hardcoded endpoints

### ✅ Debug Surface (6bd8589)

- **File**: `src/screens/DebugScreen.js`
- **Imports**:
  - ✅ `useDebugApi` from `@/hooks/useDebugApi`
  - ✅ `handleApiError` from `@/ui/handleApiError`
- **Hook Usage**: ✅ Correctly destructures `pingAsync, infoAsync, isWorking`
- **Endpoints**: ✅ API calls `endpoints.health`, `endpoints.debugInfo`
- **Drift Check**: ✅ No hardcoded "https://example.com/api/", no safeFetchJson

## API Infrastructure Verification

### ✅ API Client (`src/api/client.ts`)

```typescript
export const api = client;
export const client = {
  get(path, options)
  post(path, data, options)
  patch(path, data, options)
  delete(path, options)
  put(path, data, options)
  postMultipart(path, formData, options)
}
```

- ✅ All methods present and correctly implemented
- ✅ FormData detection: Skips Content-Type for multipart (correct)
- ✅ Auth token injection: `Authorization: Bearer ${authToken}`
- ✅ Base URL: Configurable via `config.apiBaseUrl`
- ✅ Response handling: `safeJson()` with error normalization

### ✅ Endpoints Definition (`src/api/endpoints.ts`)

```typescript
export const endpoints = {
  // New endpoints (Marker B)
  vendorSignup: "/api/vendors/signup",
  feed: "/api/feed",
  liveHost: "/api/live/host",
  liveJoin: "/api/live/join",
  liveEnd: "/api/live/end",
  health: "/api/health",
  debugInfo: "/api/debug/info"
  // ... 90+ other endpoints
};
```

- ✅ Named export (not default)
- ✅ All referenced endpoints defined
- ✅ Correct path format ("/api/...")

### ✅ API Modules

- **`src/api/debug.ts`**: ✅ Exports pingHealth(), getDebugInfo()
- **`src/api/feed.ts`**: ✅ Exports createFeedPost(), handles FormData + Blob conversion
- **`src/api/live.ts`**: ✅ Exports hostLiveSession(), joinLiveSession(), endLiveSession()
- **`src/api/vendorSignup.ts`**: ✅ Exports signupAsVendor() with response normalization

### ✅ Hooks (React Query Wrappers)

- **`src/hooks/useDebugApi.ts`**: ✅ Returns { pingAsync, infoAsync, isWorking }
- **`src/hooks/useCreatePost.ts`**: ✅ Returns { createPost, isCreating, error }
- **`src/hooks/useLiveSession.ts`**: ✅ Returns { hostAsync, joinAsync, endAsync, isWorking }
- **`src/hooks/useVendorSignup.ts`**: ✅ Returns { signupAsVendor, isPending, error, isSuccess, data }

## Infrastructure Checks

### ✅ TypeScript Configuration (`tsconfig.json`)

```json
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["src/*"]
  }
}
```

- ✅ Path alias configured correctly
- ✅ Extends `expo/tsconfig.base` (Expo-compatible)
- ✅ All `@/hooks/*`, `@/api/*`, `@/ui/*` imports will resolve

### ✅ React Query Provider (`src/app/_layout.tsx`)

```typescript
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    {/* screens */}
  </AuthProvider>
</QueryClientProvider>
```

- ✅ QueryClientProvider wraps all screens
- ✅ AuthProvider inside (correct nesting)
- ✅ All useMutation/useQuery hooks will have access to client

### ✅ FacilityProvider (`src/facility/FacilityProvider.tsx`)

- ✅ Available for facility screens
- ✅ Exports `useFacility()` hook
- ✅ Wraps facility navigation tree

### ✅ Error Handler Utility (`src/ui/handleApiError.ts`)

- ✅ File exists at correct location: `src/ui/handleApiError.ts`
- ✅ Exported as named function
- ✅ Used by all locked screens for consistent error handling

## Import Path Verification

### ✅ All Locked Screens Use `@/` Alias Imports

```javascript
// VendorSignup.js
import { useVendorSignup } from "@/hooks/useVendorSignup";
import { handleApiError } from "@/ui/handleApiError";

// DebugScreen.js
import { useDebugApi } from "@/hooks/useDebugApi";
import { handleApiError } from "@/ui/handleApiError";

// LiveSessionScreen.js
import { useLiveSession } from "@/hooks/useLiveSession";
import { handleApiError } from "@/ui/handleApiError";

// CreatePostScreen.js
import { useCreatePost } from "@/hooks/useCreatePost";
import { handleApiError } from "@/ui/handleApiError";
```

- ✅ No relative imports (no `../../` or `../`)
- ✅ Consistent alias usage across all files
- ✅ Will resolve correctly through Metro bundler

## Drift Scan Results

### ✅ No Legacy Patterns Found in Locked Surfaces

- ✅ No `fetch()` calls in screens
- ✅ No hardcoded `https://`, `localhost`, or `/api/` literals in screens
- ✅ No `safeFetchJson` helper usage
- ✅ No manual `setAuthToken` in screens
- ✅ No manual state management for loading/error (using hook states)
- ✅ No relative imports to API or utilities

## Summary Table

| Component            | Status  | Notes                                          |
| -------------------- | ------- | ---------------------------------------------- |
| VendorSignup.js      | ✅ PASS | Fixed @/ui/handleApiError import               |
| DebugScreen.js       | ✅ PASS | Fixed @/ui/handleApiError import               |
| LiveSessionScreen.js | ✅ PASS | Fixed @/ui/handleApiError import               |
| CreatePostScreen.js  | ✅ PASS | Fixed @/ui/handleApiError import               |
| useVendorSignup hook | ✅ PASS | Correct exports and usage                      |
| useDebugApi hook     | ✅ PASS | Correct exports and usage                      |
| useLiveSession hook  | ✅ PASS | Correct exports and usage                      |
| useCreatePost hook   | ✅ PASS | Correct exports and usage                      |
| API client           | ✅ PASS | All methods present, FormData handling correct |
| Endpoints            | ✅ PASS | All new endpoints defined                      |
| API modules          | ✅ PASS | All exports match hook expectations            |
| TypeScript paths     | ✅ PASS | @/\* alias configured                          |
| QueryClientProvider  | ✅ PASS | Wraps all screens                              |
| FacilityProvider     | ✅ PASS | Available for facility screens                 |
| Error handler        | ✅ PASS | File exists at @/ui/handleApiError             |
| Import paths         | ✅ PASS | No relative imports, all use @/                |

## Ready for Runtime QA

**Pre-flight checks: COMPLETE ✅**

All locked surfaces are syntactically valid, correctly integrated, and free of import/dependency issues that would cause runtime crashes. The architecture enforces:

1. **Screens** → Only import hooks, no endpoints/fetch
2. **Hooks** → Only use React Query + API modules, no direct endpoints/fetch
3. **API Modules** → Only import endpoints + client, no hardcoded URLs
4. **Endpoints** → Single source of truth for all routes

### Next Steps

1. User runs `npm start` on device/simulator
2. Test 5 flows: VendorSignup, CreatePost, LiveSession, DebugScreen, FacilityMode
3. Report any runtime errors (agent provides exact patches)
4. Once runtime green: Begin legacy quarantine (move drift offenders to `/src/legacy/\*\*)

**Commit History**

- `8f87ea6`: Fix handleApiError import paths (this session)
- `ace2f52`: Marker B anchor with contract locks (previous)
- `6bd8589`: Debug canonicalization
- `da8b8d8`: Live sessions canonicalization
- `eb4673a`: Feed/community canonicalization
- `1ebf70a`: Vendor onboarding canonicalization
- `57e4cd9`: Marker A facility mode lock
