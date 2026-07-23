# Living Soil Labs Commerce QA Pack

Date: 2026-07-20

Status: Draft catalog, source gate, and commerce-scenario contract implemented. Current soil and nutrient inventory is owner-confirmed; other owner evidence and seed-ready commercial values remain pending.

Machine-readable catalog: `tests/fixtures/living-soil-labs-commerce-qa-catalog.json`

## Catalog foundation

The pack defines ten hidden product drafts and 39 variants:

| Product group                                     | Products | Variants |
| ------------------------------------------------- | -------: | -------: |
| Penny Saver Soil, Living Soil, No-Till Soil       |        3 |        9 |
| Starter, Veg, Pre-Flower, Flower, Ripen dry mixes |        5 |       21 |
| Living Soil Labs shirt and embroidered hat        |        2 |        9 |
| **Total**                                         |   **10** |   **39** |

Starter includes the 1 lb trial fixture. Soil uses 1 cu ft, 1.5 cu ft, and a bulk test listing. Standard dry-mix sizes are 2, 5, 10, and 25 lb. The shirt spans S-5XL; the hat is adjustable one-size.

## Evidence boundary

The proposed product ratios are planning identifiers, not published guaranteed analyses:

- Starter — proposed 3-3-3;
- Veg — proposed 3-1-2;
- Pre-Flower — proposed 1-3-2;
- Flower — proposed 2-6-4;
- Ripen — proposed 0.5-3-3.

Each remains hidden and unpublished until an owner-approved formula record and verified product label are attached. A credible batch-specific COA is valid only for its named lab, method, sample, batch, and date.

The product proposals do not modify the GrowPath soil/nutrient method presets. In particular, proposed Veg 3-1-2 does not replace the current 3-1-1 method preset, and Pre-Flower 1-3-2 does not become a method preset merely because it is listed as a product draft. Matching ratios such as 3-3-3, 2-6-4, or 0.5-3-3 still require product-specific label/formula evidence.

On 2026-07-23, the owner confirmed that every soil and dry nutrient mix variant currently has zero available units. Those 30 variants are explicitly recorded as `inventoryCount: 0` and `inventoryState: "out_of_stock"`. Merchandise inventory remains unconfigured. No prices, SKUs, currencies, shipping weights, merchandise inventory counts, product descriptions, directions, images, tax settings, or checkout configuration were fabricated. Strict validation retains each genuinely missing field as a blocker.

## Commerce coverage

The pack defines expected behavior for:

- hidden drafts and public storefront publication gating;
- in-stock cart behavior and out-of-stock blocking;
- valid and invalid discounts;
- tax and shipping calculation evidence;
- checkout cancellation and webhook-confirmed paid orders;
- authorized order cancellation;
- webhook-confirmed full refunds;
- consistent buyer and owner order history.

The application feature remains **Soil & Nutrient Batch Planner** inside Commercial. **Living Soil Labs** is the QA brand/storefront, not the module name.

## Owner inputs required

- brand/storefront approval and currency;
- formula versions and official product labels;
- batch-specific laboratory evidence where used;
- approved product descriptions, directions, and warnings;
- product and variant SKUs, prices, and measured shipping weights;
- shirt and hat inventory;
- owned or licensed product and merchandise images with rights records;
- test tax, shipping, discount, and checkout configuration.

## Verification

```txt
npm.cmd run verify:living-soil-labs-commerce-qa-catalog:planning
npm.cmd run verify:living-soil-labs-commerce-qa-catalog
```

Planning mode validates the product/variant allocation, owner-confirmed zero soil/nutrient inventory, method-preset boundary, source contract, and commerce scenarios. Strict mode must fail until every remaining owner, formula, label, media, price, weight, merchandise inventory, tax, shipping, and checkout requirement is reviewed and configured.
