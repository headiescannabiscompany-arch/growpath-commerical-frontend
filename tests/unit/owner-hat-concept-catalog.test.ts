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
  sourcing: {
    blankDistributor: string;
    blankDistributorUrl: string;
    wholesaleApplicationUrl: string;
    status: string;
    recommendedBy: string;
    localDecorationRequired: boolean;
    decoratorSelected: boolean;
    approvedPhysicalSample: boolean;
    productionOrderConfirmed: boolean;
  };
  conceptTrial: {
    trialType: string;
    eligible?: boolean;
    internalConceptTrialEligible?: boolean;
    publicTrialEligible?: boolean;
    publicTrialBlocker?: string;
    questionTemplate?: string;
    candidatePrice: number | null;
    priceCurrency: string;
    itemForSale: boolean;
    saleEnabled: boolean;
    responseCreatesOrder: boolean;
    inventoryAvailable: number;
    activationRequiresCandidatePrice?: boolean;
    activationRequiresOwnerArtworkApproval?: boolean;
    disclosure?: string;
  };
  assets: Array<{
    id: string;
    file: string;
    sha256: string;
    thirdPartyMarksVisible?: boolean;
    assetRole?: string;
    artworkApprovalStatus?: string;
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
  ])(
    "keeps %s concepts unpublished, unpriced, zero-stock, and non-checkout",
    (name, slug, manifest) => {
      expect(manifest.schemaVersion).toBe("growpath-owner-hat-concepts-v1");
      expect(manifest.brand).toEqual({ name, slug });
      expect(manifest.source.platform).toBe("Facebook");
      expect(manifest.source.profileUrl).toBe("https://www.facebook.com/jaycollins79");
      expect(manifest.source.photoCollectionUrl).toMatch(
        /^https:\/\/www\.facebook\.com\/photo\//
      );
      expect(manifest.source.authorization).toMatch(/owner explicitly approved/i);
      expect(manifest.catalogState).toMatchObject({
        listingState: "unpublished",
        inventoryAvailable: 0,
        price: null,
        shippingPrice: null,
        checkoutEnabled: false,
        manufacturedInventoryConfirmed: false
      });
      expect(manifest.sourcing).toMatchObject({
        blankDistributor: "BLVNK HEADWEAR",
        status: "candidate_blank_supplier",
        localDecorationRequired: true,
        decoratorSelected: false,
        approvedPhysicalSample: false,
        productionOrderConfirmed: false
      });
      expect(manifest.sourcing.blankDistributorUrl).toBe(
        "https://www.blvnkheadwear.com/"
      );
      expect(manifest.sourcing.wholesaleApplicationUrl).toBe(
        "https://blvnkheadwear.com/pages/blank-hats-bulk-wholesale"
      );
      expect(manifest.conceptTrial).toMatchObject({
        trialType: "purchase_intent_concept",
        candidatePrice: null,
        priceCurrency: "USD",
        itemForSale: false,
        saleEnabled: false,
        responseCreatesOrder: false,
        inventoryAvailable: 0
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
    }
  );

  it("keeps the two brands separate and requires rights review for Triple Bag third-party marks", () => {
    expect(growPath.brand.slug).not.toBe(tripleBag.brand.slug);
    expect(growPath.catalogState.rightsReviewRequired).toBe(false);
    expect(tripleBag.catalogState.rightsReviewRequired).toBe(true);
    expect(tripleBag.assets.every((asset) => asset.thirdPartyMarksVisible === true)).toBe(
      true
    );
  });

  it("permits only the reviewed GrowPathAI artwork to enter a public purchase-intent trial", () => {
    expect(growPath.conceptTrial).toMatchObject({
      eligible: true,
      questionTemplate: "Would you buy this hat for {candidatePrice}?",
      activationRequiresCandidatePrice: true,
      activationRequiresOwnerArtworkApproval: true
    });
    expect(growPath.conceptTrial.disclosure).toMatch(/not for sale/i);

    const publicTrialAssets = growPath.assets.filter(
      (asset) => asset.assetRole === "purchase_intent_trial"
    );
    expect(publicTrialAssets).toHaveLength(2);
    expect(publicTrialAssets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "growpathai-hat-circuit-leaf-midnight-purchase-intent-trial",
          artworkApprovalStatus: "owner_approved"
        }),
        expect.objectContaining({
          id: "growpathai-hat-circuit-leaf-sage-purchase-intent-trial",
          artworkApprovalStatus: "owner_approved"
        })
      ])
    );
  });

  it("blocks Triple Bag public trials until third-party rights review is documented", () => {
    expect(tripleBag.conceptTrial).toMatchObject({
      internalConceptTrialEligible: true,
      publicTrialEligible: false
    });
    expect(tripleBag.conceptTrial.publicTrialBlocker).toMatch(/rights review/i);
  });
});
