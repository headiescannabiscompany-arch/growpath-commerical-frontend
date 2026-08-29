export function isRegulatedCannabisProduct(product: any) {
  return Boolean(
    product?.regulatedCannabis === true ||
    product?.isCannabis === true ||
    String(product?.productType || "").toLowerCase() === "cannabis" ||
    String(product?.category || "").toLowerCase() === "cannabis"
  );
}

export function isDispensaryStorefront(storefront: any) {
  const type = String(
    storefront?.storefrontType || storefront?.businessType || storefront?.type || ""
  )
    .trim()
    .toLowerCase();
  return type === "dispensary" || storefront?.isDispensary === true;
}

function publicWebUrl(value: unknown) {
  const candidate = String(value || "").trim();
  return /^https?:\/\/[^\s]+$/i.test(candidate) ? candidate : "";
}

export function publicProductCanCheckout(product: any, storefront?: any) {
  if (product?.purchaseIntentEnabled === true) return false;
  if (
    isRegulatedCannabisProduct(product) ||
    isDispensaryStorefront(storefront) ||
    isDispensaryStorefront(product)
  ) {
    return false;
  }
  return Boolean(
    product?.stripePriceId || product?.checkoutEnabled || product?.checkoutUrl
  );
}

export function publicProductExternalUrl(product: any, storefront?: any) {
  if (product?.purchaseIntentEnabled === true) return "";
  const regulatedCannabis = isRegulatedCannabisProduct(product);
  const dispensary =
    isDispensaryStorefront(storefront) || isDispensaryStorefront(product);
  if (
    regulatedCannabis ||
    dispensary ||
    product?.transactionAccess === "requires_exact_route_review"
  ) {
    return "";
  }

  return publicWebUrl(
    product?.externalPurchaseUrl || product?.purchaseUrl || product?.url || product?.link
  );
}

export function publicProductPickupAvailable(product: any, storefront?: any) {
  const dispensary =
    isDispensaryStorefront(storefront) || isDispensaryStorefront(product);
  if (!dispensary) return false;
  return Boolean(
    product?.pickupAvailable === true || storefront?.pickupAvailable === true
  );
}

export function publicProductPickupInstructions(product: any, storefront?: any) {
  if (!publicProductPickupAvailable(product, storefront)) return "";
  return String(
    product?.pickupInstructions || storefront?.pickupInstructions || ""
  ).trim();
}

export function publicInventorySummary(product: any) {
  const inventoryItem = product?.inventoryItem;
  const rawQuantity =
    inventoryItem?.quantity ??
    inventoryItem?.qty ??
    product?.inventoryCount ??
    product?.availableQuantity;
  if (rawQuantity === null || rawQuantity === undefined || rawQuantity === "") {
    return "Availability not reported";
  }

  const quantity = Number(rawQuantity);
  if (!Number.isFinite(quantity)) return "Availability not reported";
  if (quantity <= 0) return "Out of stock";

  const unit = String(inventoryItem?.unit || product?.inventoryUnit || "unit").trim();
  const label =
    quantity === 1 ? unit.replace(/s$/i, "") : /s$/i.test(unit) ? unit : `${unit}s`;
  return `${quantity.toLocaleString()} ${label} available`;
}
