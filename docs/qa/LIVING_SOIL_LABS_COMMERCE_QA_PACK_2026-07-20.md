# Living Soil Labs Commerce QA Pack

Date: 2026-07-20

Status: Pre-launch placeholder brand and draft catalog implemented. All inventory is owner-confirmed at zero; publication, checkout, and production use remain blocked.

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

## Owner-confirmed pre-launch facts

- Brand: **Living Soil Labs**
- Tagline: **Rooted in Science. Grown by Nature.**
- Launch state: pre-launch placeholder; nothing is for sale
- Website: not configured
- Prices: unknown and displayed as `TBD`, never coerced to zero
- Inventory: zero for all 39 soil, nutrient, shirt, and hat variants
- Shipping: the buyer will pay shipping after measured weights and rates are configured
- Checkout: disabled

The owner-supplied storefront image is retained as a placeholder banner. The shirt and hat images are AI-generated concept mockups based on that brand reference and visibly state `CONCEPT MOCKUP — NOT FOR SALE`. The asset record, limitations, and SHA-256 hashes are stored in `assets/brands/living-soil-labs/ASSET_RECORD.md`.

## Evidence boundary

The proposed product ratios are planning identifiers, not published guaranteed analyses:

- Starter — proposed 3-3-3;
- Veg — proposed 3-1-2;
- Pre-Flower — proposed 1-3-2;
- Flower — proposed 2-6-4;
- Ripen — proposed 0.5-3-3.

Each remains hidden and unpublished until an owner-approved formula record and verified product label are attached. A credible batch-specific COA is valid only for its named lab, method, sample, batch, and date.

The product proposals do not modify the GrowPath soil/nutrient method presets. In particular, proposed Veg 3-1-2 does not replace the current 3-1-1 method preset, and Pre-Flower 1-3-2 does not become a method preset merely because it is listed as a product draft. Matching ratios such as 3-3-3, 2-6-4, or 0.5-3-3 still require product-specific label/formula evidence.

On 2026-07-23, the owner confirmed that every catalog variant currently has zero available units. All 39 variants are explicitly recorded as `inventoryCount: 0` and `inventoryState: "out_of_stock"`. Prices remain `null`/TBD. Draft descriptions were created for owner editing and remain unpublished; they do not add product-performance claims or convert proposed ratios into guaranteed analyses. No SKUs, currencies, shipping weights, formulas, label analyses, directions, warnings, tax rates, shipping rates, or checkout configuration were fabricated. Strict validation retains each genuinely missing field as a blocker.

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

- final brand/storefront approval and currency;
- formula versions and official product labels;
- batch-specific laboratory evidence where used;
- owner-edited/approved product descriptions, directions, and warnings;
- product and variant SKUs, prices, and measured shipping weights;
- final product/package and manufactured-merchandise images with rights records;
- test tax, shipping, discount, and checkout configuration.

## Verification

```txt
npm.cmd run verify:living-soil-labs-commerce-qa-catalog:planning
npm.cmd run verify:living-soil-labs-commerce-qa-catalog
```

Planning mode validates the product/variant allocation, owner-confirmed pre-launch facts, all-zero inventory, TBD prices, placeholder media hashes, method-preset boundary, source contract, and commerce scenarios. Strict mode must fail until every remaining owner, formula, label, final media, price, weight, tax, shipping, and checkout requirement is reviewed and configured.
