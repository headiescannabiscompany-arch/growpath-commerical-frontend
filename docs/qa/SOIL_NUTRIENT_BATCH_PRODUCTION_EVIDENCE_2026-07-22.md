# Soil & Nutrient Batch Production Evidence — 2026-07-22

## Release under test

- Production web URL: `https://growpathai.com`
- Production API URL: `https://api.growpathai.com`
- Frontend workflow merge: `5122e4c643b7df2c29ff05e141779a0f3a1a2a69`
- Frontend navigation merge: `1a4dff8d509af69eaaa04c6159a843c30988f233`
- Frontend Render deploy: `dep-d9g50rl7vvec73ft6urg`
- Backend merge: `15c05768a762bc22b1bada213b467f9971dc85ba`
- Browser evidence timestamp: `2026-07-22T05:54:45.678Z`
- Account/workspace: `jcindc2012@gmail.com`, Commercial plan

Both `GET https://api.growpathai.com/health` and
`GET https://api.growpathai.com/api/health` returned HTTP 200 after the backend
deployment.

## Production record chain

- QA batch name: `QA Soil Batch 2026-07-22 01:15 EDT`
- Commercial batch ID: `6a605aba0890fe5932fedad1`
- Linked ToolRun ID: `6a605aa60890fe5932fedac8`
- Module record ID: `6a605aa70890fe5932fedace`
- Purpose: transplant mix
- Batch volume: 30 gal
- Bag size: 1.5 gal
- Shrinkage: 5%
- Ingredient cost: $55
- Labor cost: $20
- Packaging cost: $10
- Complete cost: $85
- Cost per bag: $4.47
- Label estimate: N–P2O5–K2O 2–1.2–1.6
- Inventory shortages: 1
- AI credits used: 0

The planner calculated 19 bags, preserved the inventory shortage as a warning,
saved the ToolRun/module record, then created the durable Commercial batch. The
batch detail reloaded with the same calculation evidence and explicitly stated
that inventory was not decremented or assigned automatically.

## Linked task verification

Six open Product Batch tasks were created with source ID
`6a605aba0890fe5932fedad1`:

1. Pull ingredients and verify lots.
2. Mix production batch and record actuals.
3. Review and update inventory actuals.
4. Clean the production area.
5. Bag, label, and complete batch QA.
6. Stage or hold the finished batch.

After a full Browser reload, all six tasks remained present and the first and
last task still linked back to the same Commercial batch.

## Navigation finding and repair

On deployed frontend `1a4dff8`, the Commercial Tools card rendered the correct
accessible anchor and exact href
`/home/commercial/tools/soil-nutrient-batch`. Expo Router's client-side click did
not transition to that one deep route, while neighboring links did. Loading the
same URL as a top-level document opened the planner successfully and enabled the
complete production record chain above.

The follow-up repair forces this card to use a normal same-tab top-level web
navigation (`target="_top"`) while retaining the Expo Router destination and
native behavior. Its post-deploy card-click retest remains required before this
navigation finding is closed.

## Evidence status

- Deterministic calculator: passed in production.
- Missing-default/unknown handling: passed in production.
- Commercial batch persistence: passed in production and after reload.
- Commercial task creation and source links: passed in production and after reload.
- Inventory non-mutation copy and behavior: passed in production.
- AI-credit non-use: passed in production.
- Commercial Tools card click: follow-up repair implemented; post-deploy retest pending.
