# Harvest batch selector production evidence

Date: 2026-08-12

## Release

- Frontend merge: `9a88a4984c399f9af634b674066ec0afe15426c3`
- Render deployment: `dep-d9u3som7bikc739jv3l0`
- Pull-request full CI:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/31582554299`
- Main-branch production preflight:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/31583609870`
- Main-branch full CI:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/31583609872`
- Production URL:
  `https://growpathai.com/home/personal/tools/harvest-readiness?retryToolRunId=6a7632764f34c5f3a9943cb6&growId=6a603a8fda5c5bfdc030ac1b&release=9a88a49&verify=harvest-batch-selector-live`
- Account/workspace: Headies signed-in Personal Pro

## Live checks

The production page loaded the retained Harvest Readiness run and selected grow.
The form exposed `Harvest batch write-back (optional)` as a radio-group selector,
explained that only an owned batch from the current grow can receive the saved
review, and did not expose the former free-text `Harvest batch ID (optional)`
control.

The selected production grow had no harvest batches. The selector truthfully
displayed `No harvest batches found for this grow` and explained that the user can
still run the readiness estimate without a batch or create a batch from the grow
workflow when harvest begins.

## Accepted boundary

This proves the exact merged selector and empty state are live, the database-ID
textbox is removed, and the existing retained run still loads. It does not prove
batch mutation because no owned batch existed for the selected grow. No temporary
production batch was fabricated. Actual `Save Harvest Review` write-back remains
open until an approved real or temporary owned batch is available.
