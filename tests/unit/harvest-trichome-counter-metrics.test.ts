const {
  CANDIDATE_ACCEPTANCE_FLOORS,
  aggregateMaturityMetrics,
  compareCandidate,
  evaluateCounter,
  finalizeEvaluationDataset,
  intersectionOverUnion,
  validateEvaluationDataset
} = require("../../scripts/lib/harvest-trichome-counter-metrics.cjs");

const box = (x: number, y: number) => ({ x, y, width: 0.1, height: 0.1 });

function documentWithHeads(heads: any[]) {
  return { images: [{ imageId: "image-1", heads }] };
}

describe("Harvest trichome counter metrics", () => {
  it("matches normalized head boxes with intersection over union", () => {
    expect(intersectionOverUnion(box(0.1, 0.1), box(0.1, 0.1))).toBe(1);
    expect(intersectionOverUnion(box(0.1, 0.1), box(0.8, 0.8))).toBe(0);
    expect(intersectionOverUnion({ x: -1, y: 0, width: 1, height: 1 }, box(0, 0))).toBe(
      0
    );
  });

  it("scores detection separately from maturity classification", () => {
    const annotations = documentWithHeads([
      { id: "amber-1", class: "amber", box: box(0.1, 0.1) },
      { id: "cloudy-1", class: "cloudy", box: box(0.3, 0.1) },
      { id: "clear-1", class: "clear", box: box(0.5, 0.1) }
    ]);
    const predictions = documentWithHeads([
      { id: "prediction-1", class: "cloudy", box: box(0.1, 0.1) },
      { id: "prediction-2", class: "cloudy", box: box(0.3, 0.1) },
      { id: "prediction-3", class: "clear", box: box(0.5, 0.1) }
    ]);

    const metrics = evaluateCounter(annotations, predictions);

    expect(metrics.detection).toMatchObject({ precision: 1, recall: 1, f1: 1 });
    expect(metrics.classification.exactAccuracyOnMatchedHeads).toBeCloseTo(2 / 3);
    expect(metrics.classification.amberRecall).toBe(0);
  });

  it("accepts only a candidate that improves amber without regressing the other gates", () => {
    const annotations = documentWithHeads([
      { id: "amber-1", class: "amber", box: box(0.1, 0.1) },
      { id: "cloudy-1", class: "cloudy", box: box(0.3, 0.1) },
      { id: "clear-1", class: "clear", box: box(0.5, 0.1) },
      { id: "amber-2", class: "amber", box: box(0.7, 0.1) },
      { id: "cloudy-2", class: "cloudy", box: box(0.1, 0.3) }
    ]);
    const baseline = evaluateCounter(
      annotations,
      documentWithHeads([
        { id: "base-1", class: "cloudy", box: box(0.1, 0.1) },
        { id: "base-2", class: "cloudy", box: box(0.3, 0.1) },
        { id: "base-3", class: "clear", box: box(0.5, 0.1) },
        { id: "base-4", class: "amber", box: box(0.7, 0.1) },
        { id: "base-false", class: "amber", box: box(0.85, 0.85) }
      ])
    );
    const candidate = evaluateCounter(
      annotations,
      documentWithHeads([
        { id: "candidate-1", class: "amber", box: box(0.1, 0.1) },
        { id: "candidate-2", class: "cloudy", box: box(0.3, 0.1) },
        { id: "candidate-3", class: "clear", box: box(0.5, 0.1) },
        { id: "candidate-4", class: "amber", box: box(0.7, 0.1) },
        { id: "candidate-5", class: "cloudy", box: box(0.1, 0.3) }
      ])
    );

    const comparison = compareCandidate(baseline, candidate, {
      minimumDetectionPrecision: 0.8,
      minimumDetectionRecall: 0.8,
      minimumDetectionF1: 0.8,
      minimumResolvedClassMacroF1: 0.7,
      minimumAmberF1: 0.7,
      minimumAmberRecall: 0.7,
      maximumFalseAmberRate: 0.15,
      minimumPossibleAmberCoverage: 1,
      maximumMeanAmberIntervalError: 0
    });

    expect(comparison.accepted).toBe(true);
    expect(comparison.checks).toEqual(
      expect.objectContaining({
        detectionF1AtFloor: true,
        amberF1AtFloor: true,
        amberRecallAtFloor: true,
        possibleAmberCoverageNotRegressed: true,
        amberIntervalErrorNotRegressed: true
      })
    );
  });

  it("compares aggregate production tallies without inventing head boxes", () => {
    const annotations = documentWithHeads([
      { id: "amber-1", class: "amber", box: box(0.1, 0.1) },
      { id: "cloudy-1", class: "cloudy", box: box(0.3, 0.1) },
      { id: "clear-1", class: "clear", box: box(0.5, 0.1) },
      { id: "warm-1", class: "amber_or_warm_light", box: box(0.7, 0.1) }
    ]);
    const deployed = {
      images: [
        {
          imageId: "image-1",
          aggregateCounts: {
            clear: 1,
            cloudy: 2,
            amber: 0,
            amber_or_warm_light: 1,
            cloudy_or_glare: 0
          },
          heads: []
        }
      ]
    };

    const metrics = evaluateCounter(annotations, deployed);

    expect(metrics.predictedHeadCount).toBe(0);
    expect(metrics.possibleAmberInterval).toMatchObject({
      complete: true,
      availableImages: 1,
      rate: 1,
      meanIntervalError: 0
    });
  });

  it("fails a well-localized candidate that does not meet absolute accuracy floors", () => {
    const annotations = documentWithHeads([
      { id: "amber-1", class: "amber", box: box(0.1, 0.1) },
      { id: "cloudy-1", class: "cloudy", box: box(0.3, 0.1) },
      { id: "clear-1", class: "clear", box: box(0.5, 0.1) }
    ]);
    const baseline = evaluateCounter(annotations, {
      images: [
        {
          imageId: "image-1",
          aggregateCounts: {
            clear: 1,
            cloudy: 1,
            amber: 0,
            amber_or_warm_light: 1,
            cloudy_or_glare: 0
          },
          heads: []
        }
      ]
    });
    const candidate = evaluateCounter(
      annotations,
      documentWithHeads([
        { id: "prediction-1", class: "cloudy", box: box(0.1, 0.1) },
        { id: "prediction-2", class: "cloudy", box: box(0.3, 0.1) },
        { id: "prediction-3", class: "clear", box: box(0.5, 0.1) }
      ])
    );
    const comparison = compareCandidate(baseline, candidate);

    expect(comparison.baselineHasHeadLocalizations).toBe(false);
    expect(comparison.accepted).toBe(false);
    expect(comparison.checks.amberF1AtFloor).toBe(false);
    expect(comparison.checks.amberRecallAtFloor).toBe(false);
  });

  it("keeps the absolute staging promotion floors explicit and demanding", () => {
    expect(CANDIDATE_ACCEPTANCE_FLOORS).toEqual({
      minimumDetectionPrecision: 0.8,
      minimumDetectionRecall: 0.8,
      minimumDetectionF1: 0.8,
      minimumResolvedClassMacroF1: 0.75,
      minimumAmberF1: 0.75,
      minimumAmberRecall: 0.8,
      maximumFalseAmberRate: 0.15,
      minimumPossibleAmberCoverage: 0.8,
      maximumMeanAmberIntervalError: 0.08
    });
  });

  it("penalizes missing aggregate predictions instead of dropping those images", () => {
    const annotations = documentWithHeads([
      { id: "amber-1", class: "amber", box: box(0.1, 0.1) }
    ]);
    const metrics = aggregateMaturityMetrics(annotations, { images: [] });

    expect(metrics).toMatchObject({
      complete: false,
      availableImages: 0,
      evaluatedImages: 1,
      rate: 0,
      meanIntervalError: 1
    });
  });

  it("fails closed until rights, diversity, and independent labels are ready", () => {
    const template = require("../fixtures/harvest-trichome-counter-annotation-template.json");
    const readiness = validateEvaluationDataset(template);

    expect(readiness.ready).toBe(false);
    expect(readiness.reasons).toEqual(
      expect.arrayContaining([
        "evaluationReady is not true",
        "not enough qualified images",
        "not enough independently labeled heads"
      ])
    );
  });

  it("requires a reviewed, diverse ordinary-phone evaluation floor", () => {
    const template = require("../fixtures/harvest-trichome-counter-annotation-template.json");

    expect(template.eligibilityPolicy).toMatchObject({
      minimumQualifiedImages: 50,
      minimumLabeledHeads: 1000,
      minimumCaptureSessions: 10,
      minimumDeviceModels: 3,
      minimumPerResolvedClass: 100,
      independentReviewersPerImage: 2,
      adjudicationRequired: true
    });
    expect(template.eligibilityPolicy.requiredLightingConditions).toEqual([
      "neutral",
      "warm",
      "glare",
      "low_light"
    ]);
  });

  it("prevents metadata from weakening the canonical evaluation floor", () => {
    const template = require("../fixtures/harvest-trichome-counter-annotation-template.json");
    const weakened = {
      ...template,
      eligibilityPolicy: {
        ...template.eligibilityPolicy,
        minimumQualifiedImages: 1,
        minimumLabeledHeads: 1
      }
    };

    expect(
      validateEvaluationDataset(weakened, { requireReadyFlag: false }).reasons
    ).toEqual(
      expect.arrayContaining([
        "eligibility floor weakened: minimumQualifiedImages",
        "eligibility floor weakened: minimumLabeledHeads"
      ])
    );
  });

  it("finalizes only an eligible dataset with exact staging confirmation", () => {
    const classes = [
      "clear",
      "cloudy",
      "amber",
      "amber_or_warm_light",
      "cloudy_or_glare"
    ];
    const images = Array.from({ length: 50 }, (_, imageIndex) => ({
      imageId: `image-${imageIndex + 1}`,
      captureSessionId: `session-${(imageIndex % 10) + 1}`,
      deviceModel: `phone-${(imageIndex % 3) + 1}`,
      lightingConditions: [["neutral", "warm", "glare", "low_light"][imageIndex % 4]],
      rights: { sourceId: "owned", licenseId: "GROWPATH_OWNED" },
      reviewerAgreement: { independentReviewers: 2, adjudicated: true },
      heads: Array.from({ length: 20 }, (_, headIndex) => ({
        id: `image-${imageIndex + 1}-head-${headIndex + 1}`,
        class: classes[(imageIndex * 20 + headIndex) % classes.length],
        box: {
          x: (headIndex % 10) / 10,
          y: Math.floor(headIndex / 10) / 2,
          width: 0.05,
          height: 0.05
        }
      }))
    }));
    const document = {
      evaluationReady: false,
      eligibilityPolicy: {
        minimumQualifiedImages: 50,
        minimumLabeledHeads: 1000,
        minimumCaptureSessions: 10,
        minimumDeviceModels: 3,
        minimumPerResolvedClass: 100,
        requiredLightingConditions: ["neutral", "warm", "glare", "low_light"],
        independentReviewersPerImage: 2,
        adjudicationRequired: true
      },
      images
    };

    expect(() =>
      finalizeEvaluationDataset(document, {
        confirmation: "wrong",
        reviewedBy: "qa-reviewer",
        reviewedAt: "2026-08-12"
      })
    ).toThrow(/exact confirmation/i);
    const finalized = finalizeEvaluationDataset(document, {
      confirmation: "RUN_GROWPATH_HARVEST_TRICHOME_STAGING",
      reviewedBy: "qa-reviewer",
      reviewedAt: "2026-08-12"
    });
    expect(finalized).toMatchObject({
      status: "reviewed_staging_evaluation_ready",
      evaluationReady: true,
      finalReview: {
        reviewedBy: "qa-reviewer",
        reviewedAt: "2026-08-12"
      }
    });
    expect(validateEvaluationDataset(finalized)).toEqual({ ready: true, reasons: [] });
  });
});
