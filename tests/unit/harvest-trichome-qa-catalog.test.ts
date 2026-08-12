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

  it("uses the published detector-classifier pipeline as method evidence only", () => {
    const catalog = loadCatalog();

    expect(catalog.methodEvidence).toEqual([
      expect.objectContaining({
        sourceId: "agriculture-2026-460-trichome-vision",
        datasetAccess: "author_inquiry_required",
        useAsMediaSource: false,
        supports: expect.arrayContaining([
          "split high-resolution phone-macro images into 512 by 512 patches",
          "detect trichomes before classifying individual padded head crops"
        ]),
        doesNotSupply: expect.arrayContaining([
          "a public downloadable image dataset",
          "public trained detector or classifier weights",
          "GrowPath accuracy evidence"
        ])
      })
    ]);
  });

  it("requires complete aggregate comparison and absolute candidate floors", () => {
    const catalog = loadCatalog();

    expect(catalog.counterEvaluationGate).toMatchObject({
      annotationTemplate:
        "tests/fixtures/harvest-trichome-counter-annotation-template.json",
      baselinePredictionTemplate:
        "tests/fixtures/harvest-trichome-baseline-prediction-template.json",
      separateMetrics: expect.arrayContaining([
        expect.stringMatching(/head detection precision/i),
        expect.stringMatching(/amber false-positive rate/i),
        expect.stringMatching(/possible-amber interval coverage/i)
      ]),
      absoluteCandidateFloors: expect.objectContaining({
        minimumDetectionF1: 0.8,
        minimumAmberF1: 0.75,
        minimumAmberRecall: 0.8,
        maximumFalseAmberRate: 0.15
      }),
      acceptance: expect.stringMatching(/must meet every absolute detector/i)
    });
  });

  it("quarantines a declared-open dataset when image provenance and labels are missing", () => {
    const catalog = loadCatalog();

    expect(catalog.quarantinedCandidates).toEqual([
      expect.objectContaining({
        sourceId: "hf-siccan-trichome-seed-unverified",
        declaredLicenseId: "CC-BY-4.0",
        useAsMediaSource: false,
        useAsGroundTruth: false,
        reasons: expect.arrayContaining([
          expect.stringMatching(/labeled real-trichome dataset is still missing/i),
          expect.stringMatching(/without image-level creator provenance/i)
        ])
      })
    ]);
  });
});
