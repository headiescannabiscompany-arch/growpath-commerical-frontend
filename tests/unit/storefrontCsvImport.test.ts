import { parseStorefrontCsv } from "@/utils/storefrontCsvImport";

describe("storefront CSV parser", () => {
  it("parses Shopify-style CSV including quoted commas and newlines", () => {
    const rows = parseStorefrontCsv(
      'Title,Body (HTML),Variant SKU,Variant Price\r\n"Soil, Living","Line one\nLine two",SOIL-1,29.95'
    );
    expect(rows).toEqual([
      {
        Title: "Soil, Living",
        "Body (HTML)": "Line one\nLine two",
        "Variant SKU": "SOIL-1",
        "Variant Price": "29.95"
      }
    ]);
  });

  it("parses WooCommerce and Square-style plain rows", () => {
    expect(
      parseStorefrontCsv("Name,SKU,Regular price,Stock\nRoot Tonic,RT-1,12.50,8")[0]
    ).toMatchObject({
      Name: "Root Tonic",
      SKU: "RT-1",
      "Regular price": "12.50",
      Stock: "8"
    });
  });

  it("rejects incomplete CSV", () => {
    expect(() => parseStorefrontCsv("Name,SKU")).toThrow(
      /header row and at least one product row/i
    );
    expect(() => parseStorefrontCsv('Name\n"Broken')).toThrow(/unclosed quoted field/i);
  });
});
