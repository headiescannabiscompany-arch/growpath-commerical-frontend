# Commercial route repair production evidence — 2026-08-13

Production frontend: `161afbe98c5262a0937b3f7915fea2625fdad441`

## Delivery evidence

- Pull request `#555` passed the complete Frontend CI gate in 8 minutes 50 seconds.
- Main-branch Production Build Preflight passed in 3 minutes 33 seconds.
- The native EAS matrix correctly remained skipped because a native build was not
  requested.

## Signed-in live verification

Cache-busted production checks used `release=161afbe9`.

- Commercial Soil & Nutrient Batch Planner rendered its full workflow instead of a
  blank root. It exposed one level-one heading, six level-two workflow headings, and
  no browser console error.
- Commercial Storefront exposed one `Storefront` level-one heading.
- Commercial Grows exposed one accurate `Product Trial Evidence Runs` level-one
  heading.
- Commercial Discover exposed one `Discover` level-one heading.

The crash was caused by an unflattened conditional style array passed through an Expo
Router `Link` child on web. The repaired link receives a flattened style object, and
the route test mock now rejects an array-style Link child.

No product, batch, trial, storefront, course, live, campaign, order, inventory,
analytics, task, payment, or other production record was created or changed during
this verification.
