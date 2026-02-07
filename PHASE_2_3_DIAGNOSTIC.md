# Phase 2.3 Type Error Diagnostic Report

**Date**: 2026-02-07
**Current Error Count**: 252 errors
**Target**: 0 errors

---

## Error Categories (Priority Order)

### 1. TS2305 (Missing Exports) — 13 errors ⚠️ BLOCKS COMPILATION

**Pattern**: Imports reference symbols that don't exist or aren't exported.

**Examples**:

```typescript
// Victory Native (4 errors) - External library
src/features/dashboard/screens/TrendsDashboard.tsx(4,10): Module '"victory-native"' has no exported member 'VictoryLine'.
src/features/dashboard/screens/TrendsDashboard.tsx(4,23): Module '"victory-native"' has no exported member 'VictoryChart'.
src/features/dashboard/screens/TrendsDashboard.tsx(4,37): Module '"victory-native"' has no exported member 'VictoryTheme'.
src/features/dashboard/screens/TrendsDashboard.tsx(4,51): Module '"victory-native"' has no exported member 'VictoryAxis'.

// Feed types (2 errors) - Need to create types
src/features/feed/hooks/useCommercialFeed.ts(4,20): Module '"../types/feed"' has no exported member 'FeedFilters'.
src/features/feed/hooks/useCommercialFeed.ts(4,33): Module '"../types/feed"' has no exported member 'FeedPage'.

// Grow hooks (2 errors) - Functions don't exist
src/features/grows/screens/EndGrowFlow.tsx(4,10): Module '"../hooks"' has no exported member 'useUpdateGrow'.
src/features/grows/screens/StartGrowWizard.tsx(4,10): Module '"../hooks"' has no exported member 'useCreateGrow'.

// Automation API (2 errors) - Functions not exported
src/hooks/useAutomations.ts(1,89): Module '"../api/automation"' has no exported member 'fetchAutomations'.
src/hooks/useAutomations.ts(1,107): Module '"../api/automation"' has no exported member 'toggleAutomation'.

// Tasks API (2 errors) - Functions not exported
src/hooks/usePersonalTasks.ts(2,20): Module '"../api/tasks"' has no exported member 'createCustomTask'.
src/hooks/usePersonalTasks.ts(2,38): Module '"../api/tasks"' has no exported member 'completeTask'.

// Webhooks hook (1 error) - Function not exported
src/screens/facility/WebhooksScreen.tsx(3,10): Module '"../../hooks/useWebhooks"' has no exported member 'useWebhooks'.
```

**Resolution Strategy**:

1. **Victory Native**: These are external library - likely wrong package or imports need updating
2. **Feed types**: Create `src/features/feed/types/feed.ts` with FeedFilters and FeedPage
3. **Automation/Tasks**: Export functions from API modules OR remove dead imports
4. **Grow hooks**: Export functions from `src/features/grows/hooks/index.ts` OR remove dead imports
5. **Webhooks**: Export from `src/hooks/useWebhooks.ts` OR remove dead import

---

### 2. TS2339 (Property Does Not Exist) — 45 errors 🔥 CONTRACT DRIFT

**Pattern A: ClientCallable missing `.del()` method** (4 errors)

```typescript
src/api/campaigns.ts(24,14): Property 'del' does not exist on type 'ClientCallable'.
src/api/links.ts(24,14): Property 'del' does not exist on type 'ClientCallable'.
src/api/products.ts(26,14): Property 'del' does not exist on type 'ClientCallable'.
src/features/inventory/hooks.ts(65,27): Property 'del' does not exist on type 'ClientCallable'.
src/features/plants/hooks.ts(65,27): Property 'del' does not exist on type 'ClientCallable'.
src/features/team/hooks.ts(39,27): Property 'del' does not exist on type 'ClientCallable'.
```

**Fix**: Add `.del()` as alias for `.delete()` in ClientCallable type (client.ts)

---

**Pattern B: endpoints.ts missing team properties** (4 errors)

```typescript
src/api/team.ts(14,39): Property 'teamMembers' does not exist on endpoints
src/api/team.ts(23,40): Property 'teamInvite' does not exist on endpoints
src/api/team.ts(32,41): Property 'teamMember' does not exist on endpoints
src/api/team.ts(37,42): Property 'teamMember' does not exist on endpoints
```

**Fix**: Add to `src/api/endpoints.ts`:

```typescript
team: (facilityId: string) => facilityPath(facilityId, "/team"),
teamMembers: (facilityId: string) => facilityPath(facilityId, "/team"),
teamMember: (facilityId: string, userId: string) => facilityPath(facilityId, `/team/${userId}`),
teamInvite: (facilityId: string) => facilityPath(facilityId, "/team/invite"),
```

---

**Pattern C: React Query v5 - `isLoading` renamed to `isPending`** (3 errors)

```typescript
src/app/onboarding/create-facility.tsx(73,31): Property 'isLoading' does not exist on UseMutationResult
src/app/onboarding/create-facility.tsx(75,50): Property 'isLoading' does not exist on UseMutationResult
src/app/onboarding/create-facility.tsx(77,23): Property 'isLoading' does not exist on UseMutationResult
```

**Fix**: Change `mutation.isLoading` → `mutation.isPending` (React Query v5 breaking change)

---

**Pattern D: Missing properties on domain types** (34 errors)

```typescript
// Plant type missing properties
src/features/dashboard/hooks.ts(37,71): Property 'daysInStage' does not exist on type 'Plant'.

// TeamMember type missing properties
src/features/dashboard/hooks.ts(54,22): Property 'name' does not exist on type 'TeamMember'.

// Grow type missing properties
src/features/dashboard/hooks.ts(75,60): Property 'yield' does not exist on type 'Grow'.
src/features/grows/screens/HarvestSummary.tsx(20,27): Property 'yield' does not exist on type 'Grow'.
src/features/grows/screens/HarvestSummary.tsx(21,27): Property 'notes' does not exist on type 'Grow'.

// Task stats missing properties
src/features/dashboard/screens/TrendsDashboard.tsx(30,17): Property 'perDay' does not exist on task stats

// AuditLog type missing (returns never[])
src/features/facility/screens/AuditTrail.tsx(20,16): Property 'timestamp' does not exist on type 'never'.
src/features/facility/screens/AuditTrail.tsx(20,32): Property 'userName' does not exist on type 'never'.
src/features/facility/screens/AuditTrail.tsx(20,47): Property 'action' does not exist on type 'never'.
src/features/facility/screens/AuditTrail.tsx(20,60): Property 'details' does not exist on type 'never'.

// Plant.growId missing
src/features/grows/screens/AssignPlantsToGrow.tsx(15,46): Property 'growId' does not exist on type 'Plant'.
src/features/grows/screens/HarvestSummary.tsx(12,46): Property 'growId' does not exist on type 'Plant'.

// Route params missing types
src/features/grows/screens/AssignPlantsToGrow.tsx(10,11): Property 'growId' does not exist on route params
src/features/grows/screens/EndGrowFlow.tsx(9,11): Property 'id' does not exist on route params
src/features/grows/screens/HarvestSummary.tsx(9,11): Property 'id' does not exist on route params

// Linking API issue
src/features/team/DeepLinkHandler.tsx(16,26): Property 'removeEventListener' does not exist on Linking
```

**Fix**: Create canonical contract types in `src/types/contracts.ts`:

- Plant (add daysInStage, growId)
- Grow (add yield, notes)
- TeamMember (add name)
- AuditLog (define proper type)
- Route param types

---

### 3. TS2345 (Argument Type Mismatch) — 42 errors 📝 SIGNATURE DRIFT

**Pattern A: `string | null` not assignable to `string`** (many errors)

```typescript
// Route params
src/auth/RequirePlan.tsx(15,44): Argument of type 'string | null' not assignable to 'string'
src/features/rooms/hooks.ts(12,44): Argument of type 'string | null' not assignable to 'string'
src/features/rooms/hooks.ts(22,43): Argument of type 'string | null' not assignable to 'string'
src/features/rooms/useBulkCreateRooms.ts(16,42): Argument of type 'string | null' not assignable to 'string'

// API calls expecting RequestOptions, getting string | null
src/features/billing/hooks.ts(11,67): Argument of type 'string | null' not assignable to RequestOptions
src/features/grows/hooks.ts(15,58): Argument of type 'string | null' not assignable to RequestOptions
src/features/inventory/hooks.ts(14,62): Argument of type 'string | null' not assignable to RequestOptions
src/features/plants/hooks.ts(14,59): Argument of type 'string | null' not assignable to RequestOptions
src/features/team/hooks.ts(14,57): Argument of type 'string | null' not assignable to RequestOptions
```

**Fix**: These are calling APIs with wrong signature - likely passing facilityId as 3rd arg instead of in options

---

**Pattern B: Event type not in CoreEventType** (2 errors)

```typescript
src/auth/RequirePlan.tsx(19,16): Argument of type '"PAYWALL_VIEW"' not assignable to CoreEventType
src/facility/FacilityProvider.tsx(143,21): Argument of type '"FACILITY_SELECTED"' not assignable to CoreEventType
```

**Fix**: Add these event types to CoreEventType enum OR remove event logging

---

**Pattern C: Router.push type issues** (many errors)

```typescript
src/features/grows/screens/AssignPlantsToGrow.tsx(25,25): Argument of type '[string, { id: any; }]' not assignable to 'never'
src/features/grows/screens/EndGrowFlow.tsx(17,25): Argument of type '[string, { id: any; }]' not assignable to 'never'
src/features/grows/screens/StartGrowWizard.tsx(23,25): Argument of type '[string, { growId: any; }]' not assignable to 'never'
```

**Fix**: Router.push expects different signature OR navigation types not imported correctly

---

**Pattern D: setState type issues** (2 errors)

```typescript
src/features/team/screens/AcceptInvite.tsx(28,16): Argument of type 'unknown' not assignable to SetStateAction<null>
src/features/team/screens/AcceptInvite.tsx(40,16): Argument of type 'unknown' not assignable to SetStateAction<null>
```

**Fix**: Type the API response properly

---

### 4. TS7031 (Implicit Any in Destructuring) — 51 errors 🧹 TYPE HYGIENE

**Pattern**: Component props and function params not typed.

**Examples**:

```typescript
// Component props
src/features/auth/PermissionInspector.tsx(5,3): Binding element 'requiredRole' implicitly has 'any'
src/features/dashboard/components/DashboardCard.tsx(4,41): Binding element 'title' implicitly has 'any'
src/features/plants/components/PlantCard.tsx(4,37): Binding element 'plant' implicitly has 'any'

// Route props
src/features/grows/screens/GrowDetail.tsx(4,38): Binding element 'route' implicitly has 'any'
src/features/inventory/screens/InventoryDetail.tsx(4,43): Binding element 'route' implicitly has 'any'
```

**Fix**: Add explicit prop types to all components (will be easy once contracts exist)

---

### 5. TS18048 (Possibly Undefined) — 22 errors 🛡️ RUNTIME SAFETY

**Pattern**: Accessing properties without null checks.

**Fix**: Add optional chaining `?.` or null checks where appropriate.

---

### 6. TS2769 (React Query Overload) — 12 errors ⚡ REACT QUERY V5

**Pattern**: `onError` callback usage in React Query v5.

**Examples**:

```typescript
src/hooks/useAuditLogs.ts(13,7): No overload matches this call
src/hooks/useAutomationPolicies.ts(1,636): No overload matches this call
src/hooks/useComplianceLogs.ts(1,747): No overload matches this call
src/hooks/useFacilities.ts(10,5): No overload matches this call
```

**Fix**: Remove `onError` from useQuery options, handle via `error` property instead.

---

## Resolution Order (Locked)

1. **TS2305 (missing exports)** — Unblock compilation graph
2. **TS2339 (property doesn't exist)** — Fix client.del(), endpoints, domain types
3. **TS2345 (argument type mismatch)** — Fix API call signatures
4. **TS7031 (implicit any)** — Add explicit types (batch after contracts)
5. **TS18048 (possibly undefined)** — Add null checks
6. **TS2769 (React Query)** — Remove onError callbacks

---

## Next Steps

**Awaiting**: Canonical contract types and specific fixes for:

1. `ClientCallable.del()` alias
2. `endpoints.ts` team properties
3. Domain types (Plant, Grow, TeamMember, AuditLog)
4. API call signature fixes (facilityId parameter position)
5. React Query v5 migration pattern
