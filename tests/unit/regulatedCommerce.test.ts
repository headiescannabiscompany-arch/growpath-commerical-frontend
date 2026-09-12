import {
  hasSavedStorefrontCheckoutAmount,
  isDispensaryStorefront,
  isRegulatedCannabisProduct,
  publicInventorySummary,
  publicProductCanCheckout,
  publicProductExternalUrl,
  publicProductPickupAvailable
} from "../../src/utils/regulatedCommerce";

describe("regulated storefront commerce", () => {
  test.each([
    [{ priceCents: 1000 }, true],
    [{ price: "10.00" }, true],
    [{ price: "19.99" }, true],
    [{ price: "" }, false],
    [{ price: "not a price" }, false],
    [{ price: -1 }, false],
    [{ priceCents: 0, price: 10 }, false],
    [{ priceCents: 0.5 }, false],
    [{ price: Infinity }, false],
    [{ priceCents: Number.MAX_SAFE_INTEGER + 1 }, false],
    [{ priceCents: 1000, purchaseIntentEnabled: true }, false],
    [{ priceCents: 1000, regulatedCannabis: true }, false],
    [{ priceCents: 1000, isCannabis: true }, false],
    [{ priceCents: 1000, productType: "cannabis" }, false],
    [{ priceCents: 1000, category: "Cannabis" }, false],
    [{ priceCents: 1000, storefrontType: "dispensary" }, false],
    [{ priceCents: 1000, transactionAccess: "requires_exact_route_review" }, false]
  ])("recognizes only ordinary valid saved amounts: %j", (product, expected) => {
    expect(hasSavedStorefrontCheckoutAmount(product)).toBe(expected);
  });

  test("offers saved-price public checkout only for a published eligible product", () => {
    const product = { priceCents: 1000, status: "published" };
    expect(publicProductCanCheckout(product)).toBe(true);
    expect(publicProductCanCheckout({ ...product, status: "draft" })).toBe(false);
    expect(publicProductCanCheckout({ ...product, checkoutEnabled: false })).toBe(false);
    expect(publicProductCanCheckout(product, { storefrontType: "dispensary" })).toBe(
      false
    );
    expect(publicProductCanCheckout({ ...product, purchaseIntentEnabled: true })).toBe(
      false
    );
  });

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

  test("keeps dispensary inventory public while withholding unreviewed handoffs", () => {
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
    expect(publicProductExternalUrl(product, storefront)).toBe("");
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

  test("withholds checkout and external handoff while product interest is open", () => {
    const product = {
      category: "headwear",
      purchaseIntentEnabled: true,
      stripePriceId: "price_must_not_be_used",
      externalPurchaseUrl: "https://example.com/buy"
    };
    expect(publicProductCanCheckout(product)).toBe(false);
    expect(publicProductExternalUrl(product)).toBe("");
  });
});
