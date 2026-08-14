# Governed recipe handoff production evidence — 2026-08-14

## Accepted release

- Backend merge: `38e2dc87f40420de5711f90ee0a1e36f52b9fc21`
- Backend Render deploy: `dep-d9vfmf3bc2fs73cd3iig`
- Frontend merge: `0bc928ab0f4110d289fb0ca02432bd1a36173d2b`
- Frontend Render deploy: `dep-d9vfspgu01pc73aceupg`
- Production route:
  `https://growpathai.com/home/commercial/tools/npk?release=0bc928ab&verify=recipe-handoffs-live`
- Workspace: signed-in Admin Commercial workspace

Both frontend main-branch release gates passed for the exact frontend merge. Render
reported the exact frontend merge deployed successfully. The production backend
health check passed, and the new protected comparison endpoint returned `401` when
called without authentication rather than falling through to `404`.

## Production workflow exercised

1. Loaded the governed Flower amendment preset in Nutrient Mix Builder.
2. Calculated and saved `QA governed recipe handoff 2026-08-14`.
3. Reloaded the production route and confirmed saved recipe version 1 persisted.
4. Created a governed zero-stock, not-for-sale product draft.
5. Opened Commercial Products and confirmed product
   `6a7f00e63556c3da3f26e342` appeared as `Price TBD | draft`, with explicit missing
   image, description, price, size/weight, grow interests, checkout, and published
   setup. No public-sale or inventory claim appeared.
6. Created a planned production batch without an inventory mutation.
7. Opened Batch Planner and confirmed batch
   `6a7f00ee3556c3da3f26e349` persisted as planned. Its detail reported 5 gal,
   unknown cost/bag/label evidence, zero ingredient pulls, zero shortages, and the
   explicit statement that the calculation did not decrement stock or assign lots.
8. Archived the temporary recipe, product, and batch after the persistence checks.

## Acceptance boundary

This closes the governed saved-recipe comparison, product-draft, and planned-batch
handoff slice. It does not close populated product editing/publication, storefront
visibility, checkout, real inventory allocation, lot assignment, production release,
or the broader Commercial workflow matrix.
