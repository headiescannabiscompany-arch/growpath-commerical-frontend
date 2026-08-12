import fs from "fs";
import path from "path";

type HatConceptManifest = {
  schemaVersion: string;
  brand: { name: string; slug: string };
  source: {
    platform: string;
    profileUrl: string;
    photoCollectionUrl: string;
    authorization: string;
  };
  catalogState: {
    listingState: string;
    inventoryAvailable: number;
    price: number | null;
    shippingPrice: number | null;
    checkoutEnabled: boolean;
    manufacturedInventoryConfirmed: boolean;
    rightsReviewRequired: boolean;
  };
  assets: Array<{
    id: string;
    file: string;
    sha256: string;
    thirdPartyMarksVisible?: boolean;
  }>;
};

const loadManifest = (brandSlug: string): HatConceptManifest => {
  const filePath = path.join(
    process.cwd(),
    "assets",
    "brands",
    brandSlug,
    "hat-concepts",
    "manifest.json"
  );
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

describe("owner-approved hat concept catalogs", () => {
  const growPath = loadManifest("growpathai");
  const tripleBag = loadManifest("triple-bag-genetics");

  test.each([
    ["GrowPathAI", "growpathai", growPath],
    ["Triple Bag Genetics", "triple-bag-genetics", tripleBag]
  ])("keeps %s concepts unpublished, unpriced, zero-stock, and non-checkout", (name, slug, manifest) => {
    expect(manifest.schemaVersion).toBe("growpath-owner-hat-concepts-v1");
    expect(manifest.brand).toEqual({ name, slug });
    expect(manifest.source.platform).toBe("Facebook");
    expect(manifest.source.profileUrl).toBe("https://www.facebook.com/jaycollins79");
    expect(manifest.source.photoCollectionUrl).toMatch(/^https:\/\/www\.facebook\.com\/photo\//);
    expect(manifest.source.authorization).toMatch(/owner explicitly approved/i);
    expect(manifest.catalogState).toMatchObject({
      listingState: "unpublished",
      inventoryAvailable: 0,
      price: null,
      shippingPrice: null,
      checkoutEnabled: false,
      manufacturedInventoryConfirmed: false
    });

    expect(manifest.assets.length).toBeGreaterThan(0);
    for (const asset of manifest.assets) {
      expect(asset.id).toBeTruthy();
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(
        fs.existsSync(
          path.join(process.cwd(), "assets", "brands", slug, "hat-concepts", asset.file)
        )
      ).toBe(true);
    }
  });

  it("keeps the two brands separate and requires rights review for Triple Bag third-party marks", () => {
    expect(growPath.brand.slug).not.toBe(tripleBag.brand.slug);
    expect(growPath.catalogState.rightsReviewRequired).toBe(false);
    expect(tripleBag.catalogState.rightsReviewRequired).toBe(true);
    expect(tripleBag.assets.every((asset) => asset.thirdPartyMarksVisible === true)).toBe(true);
  });
});
