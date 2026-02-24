# Full Scan Report

## Counts
- src files: 647
- test files: 45
- total files: 692
- api files: 102
- api orphans: 21
- legacy client callers: 18
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
- src/api/_quarantine/audit.js
- src/api/_quarantine/calendar.ts
- src/api/_quarantine/campaigns.js
- src/api/_quarantine/commercialBilling.js
- src/api/_quarantine/commercialFeed.ts
- src/api/_quarantine/compliance.ts
- src/api/_quarantine/deviation.js
- src/api/_quarantine/facilityInventory.ts
- src/api/_quarantine/greenWaste.js
- src/api/_quarantine/index.js
- src/api/_quarantine/mockServer.ts
- src/api/_quarantine/payments.js
- src/api/_quarantine/products.js
- src/api/_quarantine/questions.js
- src/api/_quarantine/search.js
- src/api/_quarantine/sop.js
- src/api/_quarantine/templates.js
- src/api/_quarantine/types.ts
- src/api/_quarantine/user.ts
- src/api/_quarantine/verification.js
- src/api/_quarantine/webhooks.ts

## Legacy client callers
- src/api/_quarantine/calendar.ts
- src/api/_quarantine/campaigns.js
- src/api/_quarantine/commercialFeed.ts
- src/api/_quarantine/compliance.ts
- src/api/_quarantine/deviation.js
- src/api/_quarantine/facilityInventory.ts
- src/api/_quarantine/greenWaste.js
- src/api/_quarantine/payments.js
- src/api/_quarantine/products.js
- src/api/_quarantine/questions.js
- src/api/_quarantine/search.js
- src/api/_quarantine/sop.js
- src/api/_quarantine/templates.js
- src/api/_quarantine/verification.js
- src/api/_quarantine/webhooks.ts
- src/api/apiClient.js
- src/api/client.js
- src/api/client.ts

## Banned findings
- fetch(: src/api/apiRequest.ts
- fetch(: src/api/uriToBlob.ts


