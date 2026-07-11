# Full Scan Report

## Counts
- src files: 858
- test files: 250
- total files: 1108
- api files: 109
- api orphans: 0
- legacy client callers: 0
- js/ts twin modules: 2
- compatibility twin wrappers: 13
- banned findings: 2

- strict banned findings: 0

## JS/TS Twins (same module name exists in both JS + TS)
- src/api/client.js , src/api/client.ts
- src/components/EmptyState.js , src/components/EmptyState.tsx

## Compatibility twin wrappers (intentional JS re-exports for legacy importers)
- src/api/auth.js , src/api/auth.ts
- src/api/growlog.js , src/api/growlog.ts
- src/api/grows.js , src/api/grows.ts
- src/api/links.js , src/api/links.ts
- src/api/plants.js , src/api/plants.ts
- src/api/reports.js , src/api/reports.ts
- src/api/subscription.js , src/api/subscription.ts
- src/api/tasks.js , src/api/tasks.ts
- src/api/team.js , src/api/team.ts
- src/components/FeatureGate.js , src/components/FeatureGate.tsx
- src/config/capabilities.js , src/config/capabilities.ts
- src/hooks/useNotifications.js , src/hooks/useNotifications.ts
- src/ui/handleApiError.js , src/ui/handleApiError.ts

## API Orphans (src/api files not imported anywhere)
- none

## Legacy client callers
- none

## Banned findings
- /:id placeholder: tests/unit/canonical-route-matrix-doc.test.js
- /:id placeholder: tests/unit/PublicCommercialRoutes.test.tsx

## Strict banned findings
- none
