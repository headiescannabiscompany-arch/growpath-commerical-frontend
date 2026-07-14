import {
  isRegulatedCannabisProduct,
  publicProductCanCheckout,
  publicProductExternalUrl
} from "../../src/utils/regulatedCommerce";

describe("regulated storefront commerce", () => {
  test.each([
    { regulatedCannabis: true },
    { isCannabis: true },
    { productType: "CANNABIS" },
    { category: "Cannabis" }
  ])("blocks public checkout and external links for %#", (product) => {
    const row = {
      ...product,
      stripePriceId: "price_1",
      externalPurchaseUrl: "https://example.com/buy"
    };
    expect(isRegulatedCannabisProduct(row)).toBe(true);
    expect(publicProductCanCheckout(row)).toBe(false);
    expect(publicProductExternalUrl(row)).toBe("");
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
