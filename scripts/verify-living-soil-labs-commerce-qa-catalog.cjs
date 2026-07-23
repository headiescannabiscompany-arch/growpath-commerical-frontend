#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const fixturePath = path.join(
  ROOT,
  "tests",
  "fixtures",
  "living-soil-labs-commerce-qa-catalog.json"
);
const allowPlanning = process.argv.includes("--allow-planning");

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sameValues(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function main() {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const errors = [];
  const blockers = [];

  requireCondition(
    fixture.schemaVersion === "growpath-living-soil-labs-commerce-qa-v1",
    "Unexpected Living Soil Labs commerce QA schema version.",
    errors
  );
  requireCondition(
    fixture.masterItem === 52,
    "Living Soil Labs catalog must map to master item 52.",
    errors
  );
  requireCondition(
    fixture.environmentPolicy?.productionAllowed === false &&
      sameValues(fixture.environmentPolicy?.allowed, ["test", "staging"]) &&
      fixture.environmentPolicy?.qaSeedNamespaceRequired === true,
    "Commerce fixtures must remain namespace-scoped to test/staging.",
    errors
  );
  requireCondition(
    fixture.ownerConfirmedFacts?.reviewedAt === "2026-07-23" &&
      sameValues(
        fixture.ownerConfirmedFacts?.soilAndNutrientInventory?.productTypes,
        ["soil", "dry_nutrient_mix"]
      ) &&
      fixture.ownerConfirmedFacts?.soilAndNutrientInventory?.inventoryCount ===
        0 &&
      fixture.ownerConfirmedFacts?.soilAndNutrientInventory?.inventoryState ===
        "out_of_stock" &&
      fixture.ownerConfirmedFacts?.merchandiseInventoryStatus === "unconfigured",
    "Owner-confirmed zero soil/nutrient inventory is missing or incorrect.",
    errors
  );

  const brand = fixture.brand || {};
  requireCondition(
    brand.name === "Living Soil Labs" && brand.slug === "living-soil-labs",
    "Living Soil Labs brand identity is incorrect.",
    errors
  );
  requireCondition(
    brand.recordStatus === "draft" &&
      brand.storefrontStatus === "draft" &&
      brand.publishReady === false,
    "Unapproved brand/storefront records must remain draft and unpublished.",
    errors
  );
  if (brand.ownerApprovalStatus !== "approved") {
    blockers.push(`Brand owner approval is pending (${brand.ownerApprovalStatus}).`);
  }
  for (const field of [
    "currency",
    "taxConfigurationStatus",
    "shippingConfigurationStatus",
    "checkoutProcessorStatus"
  ]) {
    const value = brand[field];
    if (
      value === null ||
      String(value).startsWith("pending_") ||
      String(value).trim().length === 0
    ) {
      blockers.push(`Brand ${field} is not configured (${value}).`);
    }
  }

  requireCondition(
    fixture.applicationModule?.name === "Soil & Nutrient Batch Planner" &&
      fixture.applicationModule?.workspace === "commercial" &&
      fixture.applicationModule?.brandNameMayReplaceModuleName === false,
    "The module must remain the Commercial Soil & Nutrient Batch Planner.",
    errors
  );

  const presetPolicy = fixture.methodPresetPolicy || {};
  requireCondition(
    presetPolicy.proposedProductRatiosMayReplaceMethodPresets === false &&
      presetPolicy.verifiedLabelRequiredBeforeProductClaim === true &&
      presetPolicy.verifiedFormulaRequiredBeforeProduction === true &&
      presetPolicy.compostAndBiologyUncertaintyRequired === true,
    "Product ratios must not replace method presets or bypass evidence.",
    errors
  );
  requireCondition(
    sameValues(
      (presetPolicy.approvedGrowPathMethodPresets || []).map(
        (preset) => `${preset.presetId}:${preset.labelRatio}`
      ),
      [
        "starter_3-3-3:3-3-3",
        "veg_3-1-1:3-1-1",
        "flower_2-6-4:2-6-4",
        "ripen_0.5-3-3_last_week_if_needed:0.5-3-3"
      ]
    ),
    "Approved GrowPath soil/nutrient method presets changed unexpectedly.",
    errors
  );

  const claimPolicy = fixture.claimPolicy || {};
  for (const key of [
    "superiorityClaimsAllowedWithoutEvidence",
    "performanceClaimsAllowedWithoutTrials",
    "guaranteedAnalysisMayBeInferred",
    "ingredientOrDensityValuesMayBeInvented",
    "priceWeightInventoryOrTaxMayBeInvented"
  ]) {
    requireCondition(
      claimPolicy[key] === false,
      `claimPolicy.${key} must remain false.`,
      errors
    );
  }

  const sourcePlan = fixture.sourcePlan || [];
  const sourceIds = new Set(sourcePlan.map((source) => source.sourceId));
  requireCondition(
    [
      "living_soil_labs_owner_record",
      "official_product_label",
      "credible_batch_lab_coa",
      "living_soil_labs_owner_media"
    ].every((sourceId) => sourceIds.has(sourceId)),
    "Living Soil Labs source plan is incomplete.",
    errors
  );
  for (const source of sourcePlan) {
    requireCondition(
      Array.isArray(source.trustedFor) &&
        source.trustedFor.length > 0 &&
        Array.isArray(source.notTrustedFor) &&
        source.notTrustedFor.length > 0 &&
        Array.isArray(source.requirements) &&
        source.requirements.length > 0,
      `Source ${source.sourceId || "<missing>"} needs trust, exclusion, and review rules.`,
      errors
    );
    if (source.status !== "approved") {
      blockers.push(`Source ${source.sourceId} is not approved (${source.status}).`);
    }
  }

  const products = fixture.productDrafts || [];
  const productIds = products.map((product) => product.productId);
  const productNames = products.map((product) => product.name);
  requireCondition(
    products.length === 10,
    "Expected exactly ten product drafts.",
    errors
  );
  requireCondition(
    new Set(productIds).size === productIds.length,
    "Product ids must be unique.",
    errors
  );
  requireCondition(
    sameValues(productNames, [
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
    ]),
    "Product draft names or ordering changed unexpectedly.",
    errors
  );

  const requiredProductFields = fixture.requiredProductFields || [];
  const requiredVariantFields = fixture.requiredVariantFields || [];
  const requiredImageAssetFields = fixture.requiredImageAssetFields || [];
  const variantIds = new Set();
  const allVariants = [];
  const allAssets = [];
  const allowedInventoryStates = new Set([
    "in_stock",
    "low_stock",
    "out_of_stock",
    "backorder",
    "unconfigured"
  ]);

  for (const product of products) {
    for (const field of requiredProductFields) {
      requireCondition(
        Object.prototype.hasOwnProperty.call(product, field),
        `Product ${product.productId || "<missing>"} is missing ${field}.`,
        errors
      );
    }
    requireCondition(
      ["soil", "dry_nutrient_mix", "merchandise"].includes(product.productType),
      `Product ${product.productId} has an invalid product type.`,
      errors
    );
    requireCondition(
      product.status === "draft" &&
        product.storefrontStatus === "hidden_pending_evidence" &&
        product.publishReady === false,
      `Product ${product.productId} must remain a hidden draft.`,
      errors
    );
    requireCondition(
      Array.isArray(product.claims) && product.claims.length === 0,
      `Product ${product.productId} must not contain unreviewed publication claims.`,
      errors
    );

    if (!product.evidence?.ownerApproved) {
      blockers.push(`Product ${product.productId} lacks owner approval.`);
    }
    if (!hasText(product.description)) {
      blockers.push(`Product ${product.productId} lacks approved description copy.`);
    }
    if (
      ["soil", "dry_nutrient_mix"].includes(product.productType) &&
      !hasText(product.directions)
    ) {
      blockers.push(`Product ${product.productId} lacks approved directions.`);
    }
    if (!(product.evidence?.imageAssets || []).length) {
      blockers.push(`Product ${product.productId} has no approved image assets.`);
    }

    if (product.productType === "dry_nutrient_mix") {
      if (!hasText(product.evidence?.formulaRecordId)) {
        blockers.push(`Product ${product.productId} has no verified formula record.`);
      }
      if (!(product.evidence?.verifiedLabelSourceIds || []).length) {
        blockers.push(`Product ${product.productId} has no verified product label.`);
      }
    }

    for (const asset of product.evidence?.imageAssets || []) {
      allAssets.push(asset);
      const assetLabel = asset.assetId || `${product.productId} image`;
      for (const field of requiredImageAssetFields) {
        requireCondition(
          Object.prototype.hasOwnProperty.call(asset, field),
          `Image asset ${assetLabel} is missing ${field}.`,
          errors
        );
      }
      requireCondition(
        sourceIds.has(asset.sourceId) &&
          asset.rightsStatus === "approved" &&
          asset.intendedUseApproved === true &&
          /^tests\/fixtures\/media\/living-soil-labs\//.test(asset.localPath || "") &&
          /^[a-f0-9]{64}$/i.test(asset.sha256 || "") &&
          /^\d{4}-\d{2}-\d{2}$/.test(asset.reviewedAt || ""),
        `Image asset ${assetLabel} lacks approved rights, path, hash, or review date.`,
        errors
      );
    }

    for (const variant of product.variants || []) {
      allVariants.push({ ...variant, productId: product.productId });
      for (const field of requiredVariantFields) {
        requireCondition(
          Object.prototype.hasOwnProperty.call(variant, field),
          `Variant ${variant.variantId || "<missing>"} is missing ${field}.`,
          errors
        );
      }
      requireCondition(
        hasText(variant.variantId) && !variantIds.has(variant.variantId),
        `Variant id ${variant.variantId || "<missing>"} is missing or duplicated.`,
        errors
      );
      variantIds.add(variant.variantId);
      requireCondition(
        allowedInventoryStates.has(variant.inventoryState),
        `Variant ${variant.variantId} has an invalid inventory state.`,
        errors
      );
      if (["soil", "dry_nutrient_mix"].includes(product.productType)) {
        requireCondition(
          variant.inventoryCount === 0 &&
            variant.inventoryState === "out_of_stock",
          `Variant ${variant.variantId} must preserve owner-confirmed zero inventory.`,
          errors
        );
      } else if (product.productType === "merchandise") {
        requireCondition(
          variant.inventoryCount === null &&
            variant.inventoryState === "unconfigured",
          `Variant ${variant.variantId} merchandise inventory must remain unconfigured.`,
          errors
        );
      }

      if (!hasText(variant.sku)) blockers.push(`Variant ${variant.variantId} lacks SKU.`);
      if (!(Number.isInteger(variant.priceCents) && variant.priceCents >= 0)) {
        blockers.push(`Variant ${variant.variantId} lacks configured price.`);
      }
      if (!hasText(variant.currency)) {
        blockers.push(`Variant ${variant.variantId} lacks configured currency.`);
      }
      if (!(Number(variant.shippingWeight) > 0) || !hasText(variant.shippingWeightUnit)) {
        blockers.push(`Variant ${variant.variantId} lacks measured shipping weight.`);
      }
      if (!(Number.isInteger(variant.inventoryCount) && variant.inventoryCount >= 0)) {
        blockers.push(`Variant ${variant.variantId} lacks inventory count.`);
      }
      if (variant.inventoryState === "unconfigured") {
        blockers.push(`Variant ${variant.variantId} inventory state is unconfigured.`);
      }
      if (!(variant.imageAssetIds || []).length) {
        blockers.push(`Variant ${variant.variantId} lacks linked product media.`);
      }
    }
  }

  requireCondition(allVariants.length === 39, "Expected exactly 39 variants.", errors);

  for (const soil of products.filter((product) => product.productType === "soil")) {
    requireCondition(
      sameValues(
        soil.variants.map((variant) => variant.label),
        ["1 cu ft", "1.5 cu ft", "Bulk test listing"]
      ),
      `Soil product ${soil.productId} has incorrect variants.`,
      errors
    );
  }

  const ratioByName = Object.fromEntries(
    products
      .filter((product) => product.productType === "dry_nutrient_mix")
      .map((product) => [product.name, product.proposedLabelRatio])
  );
  requireCondition(
    sameValues(ratioByName, {
      Starter: "3-3-3",
      Veg: "3-1-2",
      "Pre-Flower": "1-3-2",
      Flower: "2-6-4",
      Ripen: "0.5-3-3"
    }),
    "Proposed dry-mix ratios changed unexpectedly.",
    errors
  );
  requireCondition(
    products
      .filter((product) => product.productType === "dry_nutrient_mix")
      .every(
        (product) =>
          product.ratioStatus === "proposed_pending_verified_label" &&
          hasText(product.methodPresetRelationship)
      ),
    "Every proposed dry mix must remain pending label review with a preset relationship.",
    errors
  );

  const starter = products.find((product) => product.name === "Starter");
  requireCondition(
    sameValues(
      starter?.variants.map((variant) => variant.label),
      ["1 lb trial", "2 lb", "5 lb", "10 lb", "25 lb"]
    ),
    "Starter must retain the 1 lb trial and four standard sizes.",
    errors
  );
  for (const product of products.filter(
    (candidate) =>
      candidate.productType === "dry_nutrient_mix" && candidate.name !== "Starter"
  )) {
    requireCondition(
      sameValues(
        product.variants.map((variant) => variant.label),
        ["2 lb", "5 lb", "10 lb", "25 lb"]
      ),
      `Dry mix ${product.productId} has incorrect standard sizes.`,
      errors
    );
  }
  requireCondition(
    sameValues(
      products
        .find((product) => product.productId === "lsl-shirt")
        ?.variants.map((variant) => variant.label),
      ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]
    ) &&
      sameValues(
        products
          .find((product) => product.productId === "lsl-embroidered-hat")
          ?.variants.map((variant) => variant.label),
        ["Adjustable one-size"]
      ),
    "Shirt or hat variants are incomplete.",
    errors
  );

  const scenarios = fixture.commerceScenarios || [];
  const scenarioIds = scenarios.map((scenario) => scenario.scenarioId);
  requireCondition(
    [
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
    ].every((scenarioId) => scenarioIds.includes(scenarioId)),
    "Commerce scenario coverage is incomplete.",
    errors
  );
  requireCondition(
    scenarios.every(
      (scenario) =>
        Array.isArray(scenario.requiredStates) &&
        scenario.requiredStates.length > 0 &&
        hasText(scenario.expectedResult)
    ),
    "Every commerce scenario needs explicit states and expected behavior.",
    errors
  );

  if (fixture.status !== "seed_ready") {
    blockers.unshift(`Catalog is not seed_ready (${fixture.status}).`);
  }

  const summary = {
    fixture: path.relative(ROOT, fixturePath),
    mode: allowPlanning ? "planning" : "strict",
    status: fixture.status,
    productDraftCount: products.length,
    variantCount: allVariants.length,
    proposedFormulaCount: Object.keys(ratioByName).length,
    commerceScenarioCount: scenarios.length,
    approvedImageAssetCount: allAssets.length,
    sourceCount: sourcePlan.length,
    errorCount: errors.length,
    blockerCount: blockers.length
  };
  console.log(JSON.stringify(summary, null, 2));

  if (errors.length) {
    console.error("Living Soil Labs commerce QA catalog errors:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  if (!allowPlanning && blockers.length) {
    console.error("Living Soil Labs commerce QA catalog is not seed-ready:");
    blockers.slice(0, 30).forEach((blocker) => console.error(`- ${blocker}`));
    if (blockers.length > 30) {
      console.error(`- ... ${blockers.length - 30} more blockers`);
    }
    process.exit(1);
  }
  if (allowPlanning && blockers.length) {
    console.log(
      `Planning blockers retained: ${blockers.length}. Strict mode stays blocked until owner evidence and every commercial field are configured.`
    );
  }
}

main();
