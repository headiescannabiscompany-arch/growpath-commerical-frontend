import fs from "fs";
import path from "path";

function loadCatalog() {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "tests",
        "fixtures",
        "living-soil-labs-commerce-qa-catalog.json"
      ),
      "utf8"
    )
  );
}

describe("Living Soil Labs commerce QA catalog", () => {
  it("defines the ten requested product drafts and 39 variants", () => {
    const catalog = loadCatalog();
    const variants = catalog.productDrafts.flatMap((product: any) => product.variants);

    expect(catalog.productDrafts.map((product: any) => product.name)).toEqual([
      "Penny Saver Soil",
      "Living Soil",
      "No-Till Soil",
      "Starter",
      "Veg",
      "Pre-Flower",
      "Flower",
      "Ripen",
      "Living Soil Labs Shirt",
      "Living Soil Labs Embroidered Hat"
    ]);
    expect(variants).toHaveLength(39);
  });

  it("defines all soil, dry-mix, trial, shirt, and hat sizes", () => {
    const catalog = loadCatalog();
    const byId = Object.fromEntries(
      catalog.productDrafts.map((product: any) => [product.productId, product])
    );

    for (const productId of [
      "lsl-penny-saver-soil",
      "lsl-living-soil",
      "lsl-no-till-soil"
    ]) {
      expect(byId[productId].variants.map((variant: any) => variant.label)).toEqual([
        "1 cu ft",
        "1.5 cu ft",
        "Bulk test listing"
      ]);
    }
    expect(
      byId["lsl-starter-3-3-3"].variants.map((variant: any) => variant.label)
    ).toEqual(["1 lb trial", "2 lb", "5 lb", "10 lb", "25 lb"]);
    expect(byId["lsl-shirt"].variants.map((variant: any) => variant.label)).toEqual([
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL",
      "4XL",
      "5XL"
    ]);
    expect(
      byId["lsl-embroidered-hat"].variants.map((variant: any) => variant.label)
    ).toEqual(["Adjustable one-size"]);
  });

  it("keeps proposed ratios unpublished until label and formula evidence exists", () => {
    const catalog = loadCatalog();
    const proposed = catalog.productDrafts.filter(
      (product: any) => product.productType === "dry_nutrient_mix"
    );

    expect(
      Object.fromEntries(
        proposed.map((product: any) => [product.name, product.proposedLabelRatio])
      )
    ).toEqual({
      Starter: "3-3-3",
      Veg: "3-1-2",
      "Pre-Flower": "1-3-2",
      Flower: "2-6-4",
      Ripen: "0.5-3-3"
    });
    for (const product of proposed) {
      expect(product).toMatchObject({
        status: "draft",
        storefrontStatus: "hidden_pending_evidence",
        publishReady: false,
        ratioStatus: "proposed_pending_verified_label"
      });
      expect(product.evidence.formulaRecordId).toBeNull();
      expect(product.evidence.verifiedLabelSourceIds).toEqual([]);
    }
  });

  it("does not replace the approved GrowPath method presets", () => {
    const catalog = loadCatalog();

    expect(catalog.methodPresetPolicy).toMatchObject({
      proposedProductRatiosMayReplaceMethodPresets: false,
      verifiedLabelRequiredBeforeProductClaim: true,
      verifiedFormulaRequiredBeforeProduction: true,
      compostAndBiologyUncertaintyRequired: true
    });
    expect(catalog.methodPresetPolicy.approvedGrowPathMethodPresets).toEqual([
      { presetId: "starter_3-3-3", labelRatio: "3-3-3" },
      { presetId: "veg_3-1-1", labelRatio: "3-1-1" },
      { presetId: "flower_2-6-4", labelRatio: "2-6-4" },
      {
        presetId: "ripen_0.5-3-3_last_week_if_needed",
        labelRatio: "0.5-3-3"
      }
    ]);
    expect(
      catalog.productDrafts.find((product: any) => product.name === "Veg")
        .methodPresetRelationship
    ).toBe("does_not_replace_method_preset_veg_3-1-1");
  });

  it("records owner-confirmed zero mix inventory without inventing merchandise inventory", () => {
    const catalog = loadCatalog();
    const soilAndNutrientVariants = catalog.productDrafts
      .filter((product: any) =>
        ["soil", "dry_nutrient_mix"].includes(product.productType)
      )
      .flatMap((product: any) => product.variants);
    const merchandiseVariants = catalog.productDrafts
      .filter((product: any) => product.productType === "merchandise")
      .flatMap((product: any) => product.variants);

    for (const product of catalog.productDrafts) {
      expect(product.claims).toEqual([]);
      expect(product.evidence.ownerApproved).toBe(false);
      expect(product.evidence.imageAssets).toEqual([]);
    }
    expect(catalog.ownerConfirmedFacts).toEqual({
      reviewedAt: "2026-07-23",
      soilAndNutrientInventory: {
        productTypes: ["soil", "dry_nutrient_mix"],
        inventoryCount: 0,
        inventoryState: "out_of_stock"
      },
      merchandiseInventoryStatus: "unconfigured"
    });
    for (const variant of soilAndNutrientVariants) {
      expect(variant).toMatchObject({
        sku: null,
        priceCents: null,
        currency: null,
        shippingWeight: null,
        shippingWeightUnit: null,
        inventoryCount: 0,
        inventoryState: "out_of_stock",
        imageAssetIds: []
      });
    }
    for (const variant of merchandiseVariants) {
      expect(variant).toMatchObject({
        sku: null,
        priceCents: null,
        currency: null,
        shippingWeight: null,
        shippingWeightUnit: null,
        inventoryCount: null,
        inventoryState: "unconfigured",
        imageAssetIds: []
      });
    }
  });

  it("covers the complete storefront and order-state workflow", () => {
    const catalog = loadCatalog();
    const scenarioIds = catalog.commerceScenarios.map(
      (scenario: any) => scenario.scenarioId
    );

    expect(scenarioIds).toEqual(
      expect.arrayContaining([
        "draft_storefront_hidden",
        "in_stock_cart",
        "out_of_stock_block",
        "discount_apply",
        "discount_reject",
        "tax_calculation",
        "shipping_calculation",
        "checkout_cancel",
        "paid_order",
        "order_cancellation",
        "full_refund",
        "order_history"
      ])
    );
  });

  it("keeps Living Soil Labs as the brand and not the application module name", () => {
    const catalog = loadCatalog();

    expect(catalog.brand.name).toBe("Living Soil Labs");
    expect(catalog.applicationModule).toEqual({
      name: "Soil & Nutrient Batch Planner",
      workspace: "commercial",
      brandNameMayReplaceModuleName: false
    });
  });

  it("keeps the catalog test/staging-only and blocked from strict seeding", () => {
    const catalog = loadCatalog();

    expect(catalog.status).toBe("planning");
    expect(catalog.environmentPolicy).toEqual({
      allowed: ["test", "staging"],
      productionAllowed: false,
      qaSeedNamespaceRequired: true
    });
    expect(catalog.sourcePlan.every((source: any) => source.status !== "approved")).toBe(
      true
    );
  });
});
