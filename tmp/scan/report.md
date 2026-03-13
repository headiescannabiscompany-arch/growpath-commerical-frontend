# Full Scan Report

## Counts
- src files: 669
- test files: 48
- total files: 717
- api files: 84
- api orphans: 0
- legacy client callers: 2
- js/ts twin modules: 15
- banned findings: 2

## JS/TS Twins (same module name exists in both JS + TS)
- src/api/auth.js , src/api/auth.ts
- src/api/client.js , src/api/client.ts
- src/api/growlog.js , src/api/growlog.ts
- src/api/grows.js , src/api/grows.ts
- src/api/links.js , src/api/links.ts
- src/api/plants.js , src/api/plants.ts
- src/api/reports.js , src/api/reports.ts
- src/api/subscription.js , src/api/subscription.ts
- src/api/tasks.js , src/api/tasks.ts
- src/api/team.js , src/api/team.ts
- src/components/EmptyState.js , src/components/EmptyState.tsx
- src/components/FeatureGate.js , src/components/FeatureGate.tsx
- src/config/capabilities.js , src/config/capabilities.ts
- src/hooks/useNotifications.js , src/hooks/useNotifications.ts
- src/ui/handleApiError.js , src/ui/handleApiError.ts

## API Orphans (src/api files not imported anywhere)
- none

## Legacy client callers
- src/api/apiClient.js
- src/api/client.js

## Banned findings
- fetch(: src/api/apiRequest.ts
- fetch(: src/api/uriToBlob.ts
