import {
  isDispensaryStorefront,
  isRegulatedCannabisProduct,
  publicInventorySummary,
  publicProductCanCheckout,
  publicProductExternalUrl,
  publicProductPickupAvailable
} from "../../src/utils/regulatedCommerce";

describe("regulated storefront commerce", () => {
  test.each([
    { regulatedCannabis: true },
    { isCannabis: true },
    { productType: "CANNABIS" },
    { category: "Cannabis" }
  ])("blocks public checkout and unlicensed external links for %#", (product) => {
    const row = {
      ...product,
      stripePriceId: "price_1",
      externalPurchaseUrl: "https://example.com/buy"
    };
    expect(isRegulatedCannabisProduct(row)).toBe(true);
    expect(publicProductCanCheckout(row)).toBe(false);
    expect(publicProductExternalUrl(row)).toBe("");
  });

  test("allows a dispensary website handoff without GrowPath checkout", () => {
    const storefront = {
      storefrontType: "dispensary",
      websiteUrl: "https://dispensary.example.com/menu",
      pickupAvailable: true
    };
    const product = {
      regulatedCannabis: true,
      stripePriceId: "price_must_not_be_used",
      inventoryCount: 12
    };

    expect(isDispensaryStorefront(storefront)).toBe(true);
    expect(publicProductCanCheckout(product, storefront)).toBe(false);
    expect(publicProductExternalUrl(product, storefront)).toBe(
      "https://dispensary.example.com/menu"
    );
    expect(publicProductPickupAvailable(product, storefront)).toBe(true);
    expect(publicInventorySummary(product)).toBe("12 units available");
  });

  test("reports public linked-inventory availability", () => {
    expect(
      publicInventorySummary({
        inventoryItem: { quantity: 1, unit: "jars" }
      })
    ).toBe("1 jar available");
    expect(publicInventorySummary({ inventoryCount: 0 })).toBe("Out of stock");
    expect(publicInventorySummary({})).toBe("Availability not reported");
  });

  test("preserves ordinary non-cannabis commerce", () => {
    const product = {
      category: "soil_mix",
      stripePriceId: "price_1",
      externalPurchaseUrl: "https://example.com/buy"
    };
    expect(publicProductCanCheckout(product)).toBe(true);
    expect(publicProductExternalUrl(product)).toBe("https://example.com/buy");
  });
});
