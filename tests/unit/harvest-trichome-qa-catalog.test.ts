import fs from "fs";
import path from "path";

function loadCatalog() {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "tests", "fixtures", "harvest-trichome-qa-catalog.json"),
      "utf8"
    )
  );
}

describe("Harvest trichome QA catalog", () => {
  it("is a rights-reviewed qualitative seed, not a production-ready counter", () => {
    const catalog = loadCatalog();

    expect(catalog).toMatchObject({
      schemaVersion: "growpath-harvest-trichome-qa-v1",
      status: "rights_reviewed_seed",
      calibrationReadiness: {
        qualitativeClassSeedReady: true,
        quantitativeCounterReady: false,
        representativeHarvestDecisionReady: false
      }
    });
  });

  it("keeps unit verification offline and production-safe", () => {
    const catalog = loadCatalog();

    expect(catalog.rightsPolicy.useForModelTraining).toBe(false);
    expect(catalog.executionPolicy).toEqual({
      dryRunDefault: true,
      stagingOnly: true,
      networkInUnitTests: false,
      providerCallsInUnitTests: false,
      productionWrites: false,
      requiresExactConfirmation: "RUN_GROWPATH_HARVEST_TRICHOME_STAGING"
    });
  });

  it("retains source-level rights and limits", () => {
    const catalog = loadCatalog();

    expect(catalog.sources).toHaveLength(3);
    for (const source of catalog.sources) {
      expect(source).toMatchObject({
        licenseId: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        rightsReviewedAt: "2026-08-12",
        intendedUseApproved: true,
        retracted: false
      });
      expect(source.notTrustedFor).toEqual(
        expect.arrayContaining(["universal harvest timing", "whole-plant inference"])
      );
    }
  });

  it("covers clear, cloudy, and amber without inventing percentages", () => {
    const catalog = loadCatalog();
    const classes = catalog.referenceCases.flatMap((item: any) => item.expectedClasses);

    expect(new Set(classes)).toEqual(new Set(["clear", "cloudy", "amber"]));
    expect(
      catalog.referenceCases.filter((item: any) => item.quantitativeGroundTruth)
    ).toEqual([
      expect.objectContaining({
        caseId: "punja-figure13d-annotated-count",
        blindRecognitionEligible: false,
        exactCounts: { clear: 83, cloudy: 96, amber: 52, total: 231 }
      })
    ]);
    expect(
      catalog.referenceCases.filter((item: any) => !item.quantitativeGroundTruth)
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ caseId: "lapierre-s3-panel-a-clear" }),
        expect.objectContaining({ caseId: "lapierre-s3-panel-b-cloudy" }),
        expect.objectContaining({ caseId: "lapierre-s3-panel-c-amber-cloudy-mix" }),
        expect.objectContaining({ caseId: "spitzer-figure12-panel-d-amber" })
      ])
    );
  });
});
