export function isRegulatedCannabisProduct(product: any) {
  return Boolean(
    product?.regulatedCannabis === true ||
    product?.isCannabis === true ||
    String(product?.productType || "").toLowerCase() === "cannabis" ||
    String(product?.category || "").toLowerCase() === "cannabis"
  );
}

export function publicProductCanCheckout(product: any) {
  if (isRegulatedCannabisProduct(product)) return false;
  return Boolean(
    product?.stripePriceId || product?.checkoutEnabled || product?.checkoutUrl
  );
}

export function publicProductExternalUrl(product: any) {
  if (isRegulatedCannabisProduct(product)) return "";
  return String(
    product?.externalPurchaseUrl ||
      product?.purchaseUrl ||
      product?.url ||
      product?.link ||
      ""
  );
}
