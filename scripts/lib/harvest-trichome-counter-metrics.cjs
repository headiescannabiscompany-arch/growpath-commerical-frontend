"use strict";

const COUNTABLE_CLASSES = [
  "clear",
  "cloudy",
  "amber",
  "amber_or_warm_light",
  "cloudy_or_glare"
];
const RESOLVED_CLASSES = ["clear", "cloudy", "amber"];
const CANONICAL_ELIGIBILITY_FLOORS = {
  minimumQualifiedImages: 50,
  minimumLabeledHeads: 1000,
  minimumCaptureSessions: 10,
  minimumDeviceModels: 3,
  minimumPerResolvedClass: 100,
  independentReviewersPerImage: 2,
  requiredLightingConditions: ["neutral", "warm", "glare", "low_light"]
};
const STAGING_CONFIRMATION = "RUN_GROWPATH_HARVEST_TRICHOME_STAGING";
const CANDIDATE_ACCEPTANCE_FLOORS = {
  minimumDetectionPrecision: 0.8,
  minimumDetectionRecall: 0.8,
  minimumDetectionF1: 0.8,
  minimumResolvedClassMacroF1: 0.75,
  minimumAmberF1: 0.75,
  minimumAmberRecall: 0.8,
  maximumFalseAmberRate: 0.15,
  minimumPossibleAmberCoverage: 0.8,
  maximumMeanAmberIntervalError: 0.08
};

function safeDivide(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function harmonicMean(precision, recall) {
  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
}

function normalizedBox(box = {}) {
  const x = Number(box.x);
  const y = Number(box.y);
  const width = Number(box.width);
  const height = Number(box.height);
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > 1 ||
    y + height > 1
  ) {
    return null;
  }
  return { x, y, width, height };
}

function intersectionOverUnion(first, second) {
  const a = normalizedBox(first);
  const b = normalizedBox(second);
  if (!a || !b) return 0;
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return safeDivide(intersection, union);
}

function flattenedHeads(document = {}) {
  return (Array.isArray(document.images) ? document.images : []).flatMap((image) =>
    (Array.isArray(image.heads) ? image.heads : [])
      .filter(
        (head) =>
          head && COUNTABLE_CLASSES.includes(head.class) && normalizedBox(head.box)
      )
      .map((head, index) => ({
        imageId: String(image.imageId || ""),
        id: String(head.id || `${image.imageId || "image"}-${index + 1}`),
        class: head.class,
        box: normalizedBox(head.box)
      }))
  );
}

function greedyMatches(groundTruth, predictions, iouThreshold) {
  const candidates = [];
  groundTruth.forEach((truth, truthIndex) => {
    predictions.forEach((prediction, predictionIndex) => {
      if (truth.imageId !== prediction.imageId) return;
      const iou = intersectionOverUnion(truth.box, prediction.box);
      if (iou >= iouThreshold) {
        candidates.push({ truthIndex, predictionIndex, iou });
      }
    });
  });
  candidates.sort((left, right) => right.iou - left.iou);
  const usedTruth = new Set();
  const usedPredictions = new Set();
  const matches = [];
  for (const candidate of candidates) {
    if (
      usedTruth.has(candidate.truthIndex) ||
      usedPredictions.has(candidate.predictionIndex)
    ) {
      continue;
    }
    usedTruth.add(candidate.truthIndex);
    usedPredictions.add(candidate.predictionIndex);
    matches.push({
      ...candidate,
      truth: groundTruth[candidate.truthIndex],
      prediction: predictions[candidate.predictionIndex]
    });
  }
  return { matches, usedTruth, usedPredictions };
}

function classMetrics(label, groundTruth, predictions, matching) {
  const truePositive = matching.matches.filter(
    (match) => match.truth.class === label && match.prediction.class === label
  ).length;
  const falsePositive = predictions.filter((prediction, predictionIndex) => {
    if (prediction.class !== label) return false;
    const match = matching.matches.find(
      (candidate) => candidate.predictionIndex === predictionIndex
    );
    return !match || match.truth.class !== label;
  }).length;
  const falseNegative = groundTruth.filter((truth, truthIndex) => {
    if (truth.class !== label) return false;
    const match = matching.matches.find(
      (candidate) => candidate.truthIndex === truthIndex
    );
    return !match || match.prediction.class !== label;
  }).length;
  const precision = safeDivide(truePositive, truePositive + falsePositive);
  const recall = safeDivide(truePositive, truePositive + falseNegative);
  return {
    truePositive,
    falsePositive,
    falseNegative,
    precision,
    recall,
    f1: harmonicMean(precision, recall)
  };
}

function average(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function emptyClassCounts() {
  return Object.fromEntries(COUNTABLE_CLASSES.map((label) => [label, 0]));
}

function normalizedAggregateCounts(value) {
  if (!value || typeof value !== "object") return null;
  const counts = emptyClassCounts();
  for (const label of COUNTABLE_CLASSES) {
    const count = Number(value[label]);
    if (!Number.isFinite(count) || count < 0) return null;
    counts[label] = Math.trunc(count);
  }
  return counts;
}

function countsFromHeads(heads) {
  const counts = emptyClassCounts();
  for (const head of heads) counts[head.class] += 1;
  return counts;
}

function aggregateCountsByImage(document = {}) {
  return new Map(
    (Array.isArray(document.images) ? document.images : []).map((image) => {
      const imageId = String(image.imageId || "");
      const provided = normalizedAggregateCounts(image.aggregateCounts);
      const heads = flattenedHeads({ images: [image] });
      return [imageId, provided || countsFromHeads(heads)];
    })
  );
}

function aggregateMaturityMetrics(annotationDocument, predictionDocument) {
  const groundTruth = flattenedHeads(annotationDocument);
  const truthCounts = new Map();
  for (const head of groundTruth) {
    if (!truthCounts.has(head.imageId)) truthCounts.set(head.imageId, emptyClassCounts());
    truthCounts.get(head.imageId)[head.class] += 1;
  }
  const predictedCounts = aggregateCountsByImage(predictionDocument);
  const imageIds = [...truthCounts.keys()];
  const cases = imageIds.map((imageId) => {
    const truth = truthCounts.get(imageId) || emptyClassCounts();
    const predicted = predictedCounts.get(imageId) || emptyClassCounts();
    const truthTotal = Object.values(truth).reduce((sum, value) => sum + value, 0);
    const predictedTotal = Object.values(predicted).reduce(
      (sum, value) => sum + value,
      0
    );
    const truthAmberShare = safeDivide(truth.amber, truthTotal);
    const predictedMinimum = safeDivide(predicted.amber, predictedTotal);
    const predictedMaximum = safeDivide(
      predicted.amber + predicted.amber_or_warm_light,
      predictedTotal
    );
    const covered =
      predictedTotal > 0 &&
      predictedMinimum <= truthAmberShare &&
      truthAmberShare <= predictedMaximum;
    const intervalError =
      predictedTotal <= 0
        ? 1
        : truthAmberShare < predictedMinimum
          ? predictedMinimum - truthAmberShare
          : truthAmberShare > predictedMaximum
            ? truthAmberShare - predictedMaximum
            : 0;
    return {
      imageId,
      truthAmberShare,
      predictedMinimum,
      predictedMaximum,
      predictionAvailable: predictedTotal > 0,
      covered,
      intervalError
    };
  });
  const availableImages = cases.filter((item) => item.predictionAvailable).length;
  return {
    coveredImages: cases.filter((item) => item.covered).length,
    evaluatedImages: cases.length,
    availableImages,
    complete: cases.length > 0 && availableImages === cases.length,
    rate: safeDivide(cases.filter((item) => item.covered).length, cases.length),
    meanIntervalError: average(cases.map((item) => item.intervalError)),
    cases
  };
}

function evaluateCounter(annotations, predictionDocument, options = {}) {
  const iouThreshold = Number.isFinite(Number(options.iouThreshold))
    ? Number(options.iouThreshold)
    : 0.5;
  const groundTruth = flattenedHeads(annotations);
  const predictions = flattenedHeads(predictionDocument);
  const matching = greedyMatches(groundTruth, predictions, iouThreshold);
  const detectionTruePositive = matching.matches.length;
  const detectionFalsePositive = predictions.length - detectionTruePositive;
  const detectionFalseNegative = groundTruth.length - detectionTruePositive;
  const detectionPrecision = safeDivide(
    detectionTruePositive,
    detectionTruePositive + detectionFalsePositive
  );
  const detectionRecall = safeDivide(
    detectionTruePositive,
    detectionTruePositive + detectionFalseNegative
  );
  const perClass = Object.fromEntries(
    COUNTABLE_CLASSES.map((label) => [
      label,
      classMetrics(label, groundTruth, predictions, matching)
    ])
  );
  const exactlyClassified = matching.matches.filter(
    (match) => match.truth.class === match.prediction.class
  ).length;
  const predictedAmber = predictions.filter((head) => head.class === "amber").length;
  return {
    iouThreshold,
    groundTruthHeadCount: groundTruth.length,
    predictedHeadCount: predictions.length,
    detection: {
      truePositive: detectionTruePositive,
      falsePositive: detectionFalsePositive,
      falseNegative: detectionFalseNegative,
      precision: detectionPrecision,
      recall: detectionRecall,
      f1: harmonicMean(detectionPrecision, detectionRecall)
    },
    classification: {
      exactAccuracyOnMatchedHeads: safeDivide(exactlyClassified, matching.matches.length),
      macroResolvedClassF1: average(RESOLVED_CLASSES.map((label) => perClass[label].f1)),
      amberF1: perClass.amber.f1,
      amberRecall: perClass.amber.recall,
      falseAmberRate:
        predictedAmber > 0 ? perClass.amber.falsePositive / predictedAmber : null,
      perClass
    },
    possibleAmberInterval: aggregateMaturityMetrics(annotations, predictionDocument)
  };
}

function compareCandidate(baseline, candidate, floors = CANDIDATE_ACCEPTANCE_FLOORS) {
  const baselineHasHeadLocalizations = baseline.predictedHeadCount > 0;
  const checks = {
    baselineAggregateComplete: baseline.possibleAmberInterval.complete,
    candidateAggregateComplete: candidate.possibleAmberInterval.complete,
    detectionPrecisionAtFloor:
      candidate.detection.precision >= floors.minimumDetectionPrecision,
    detectionRecallAtFloor: candidate.detection.recall >= floors.minimumDetectionRecall,
    detectionF1AtFloor: candidate.detection.f1 >= floors.minimumDetectionF1,
    resolvedClassF1AtFloor:
      candidate.classification.macroResolvedClassF1 >= floors.minimumResolvedClassMacroF1,
    amberF1AtFloor: candidate.classification.amberF1 >= floors.minimumAmberF1,
    amberRecallAtFloor: candidate.classification.amberRecall >= floors.minimumAmberRecall,
    falseAmberRateAtFloor:
      candidate.classification.falseAmberRate !== null &&
      candidate.classification.falseAmberRate <= floors.maximumFalseAmberRate,
    possibleAmberCoverageAtFloor:
      candidate.possibleAmberInterval.rate >= floors.minimumPossibleAmberCoverage,
    amberIntervalErrorAtFloor:
      candidate.possibleAmberInterval.meanIntervalError <=
      floors.maximumMeanAmberIntervalError,
    detectionF1NotRegressedWhenComparable:
      !baselineHasHeadLocalizations || candidate.detection.f1 >= baseline.detection.f1,
    resolvedClassF1NotRegressedWhenComparable:
      !baselineHasHeadLocalizations ||
      candidate.classification.macroResolvedClassF1 >=
        baseline.classification.macroResolvedClassF1,
    amberF1ImprovedWhenComparable:
      !baselineHasHeadLocalizations ||
      candidate.classification.amberF1 > baseline.classification.amberF1,
    amberRecallImprovedWhenComparable:
      !baselineHasHeadLocalizations ||
      candidate.classification.amberRecall > baseline.classification.amberRecall,
    falseAmberRateNotRegressedWhenComparable:
      !baselineHasHeadLocalizations ||
      (candidate.classification.falseAmberRate !== null &&
        (baseline.classification.falseAmberRate === null ||
          candidate.classification.falseAmberRate <=
            baseline.classification.falseAmberRate)),
    possibleAmberCoverageNotRegressed:
      candidate.possibleAmberInterval.rate >= baseline.possibleAmberInterval.rate,
    amberIntervalErrorNotRegressed:
      candidate.possibleAmberInterval.meanIntervalError <=
      baseline.possibleAmberInterval.meanIntervalError
  };
  return {
    accepted: Object.values(checks).every(Boolean),
    baselineHasHeadLocalizations,
    floors,
    checks
  };
}

function validateEvaluationDataset(document = {}, options = {}) {
  const policy = document.eligibilityPolicy || {};
  const images = Array.isArray(document.images) ? document.images : [];
  const heads = flattenedHeads(document);
  const sessions = new Set(images.map((image) => image.captureSessionId).filter(Boolean));
  const devices = new Set(images.map((image) => image.deviceModel).filter(Boolean));
  const conditions = new Set(images.flatMap((image) => image.lightingConditions || []));
  const reasons = [];
  if (options.requireReadyFlag !== false && document.evaluationReady !== true) {
    reasons.push("evaluationReady is not true");
  }
  for (const [field, floor] of Object.entries(CANONICAL_ELIGIBILITY_FLOORS)) {
    if (field === "requiredLightingConditions") continue;
    if (Number(policy[field]) < floor)
      reasons.push(`eligibility floor weakened: ${field}`);
  }
  if (policy.adjudicationRequired !== true) {
    reasons.push("eligibility floor weakened: adjudicationRequired");
  }
  for (const condition of CANONICAL_ELIGIBILITY_FLOORS.requiredLightingConditions) {
    if (!(policy.requiredLightingConditions || []).includes(condition)) {
      reasons.push(`eligibility floor weakened: lighting ${condition}`);
    }
  }
  if (images.length < Number(policy.minimumQualifiedImages || Infinity)) {
    reasons.push("not enough qualified images");
  }
  if (heads.length < Number(policy.minimumLabeledHeads || Infinity)) {
    reasons.push("not enough independently labeled heads");
  }
  if (sessions.size < Number(policy.minimumCaptureSessions || Infinity)) {
    reasons.push("not enough distinct capture sessions");
  }
  if (devices.size < Number(policy.minimumDeviceModels || Infinity)) {
    reasons.push("not enough distinct device models");
  }
  for (const condition of policy.requiredLightingConditions || []) {
    if (!conditions.has(condition))
      reasons.push(`missing lighting condition: ${condition}`);
  }
  for (const label of RESOLVED_CLASSES) {
    const count = heads.filter((head) => head.class === label).length;
    if (count < Number(policy.minimumPerResolvedClass || Infinity)) {
      reasons.push(`not enough ${label} labels`);
    }
  }
  if (
    images.some(
      (image) =>
        !image.rights?.sourceId ||
        !image.rights?.licenseId ||
        image.reviewerAgreement?.independentReviewers < 2 ||
        image.reviewerAgreement?.adjudicated !== true
    )
  ) {
    reasons.push("rights or independent-review metadata is incomplete");
  }
  return { ready: reasons.length === 0, reasons };
}

function finalizeEvaluationDataset(document, review = {}) {
  if (cleanReviewValue(review.confirmation) !== STAGING_CONFIRMATION) {
    throw new Error(`Final review requires exact confirmation: ${STAGING_CONFIRMATION}`);
  }
  const reviewedBy = cleanReviewValue(review.reviewedBy);
  const reviewedAt = cleanReviewValue(review.reviewedAt);
  if (!reviewedBy || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) {
    throw new Error(
      "Final review requires reviewedBy and reviewedAt in YYYY-MM-DD form."
    );
  }
  const readiness = validateEvaluationDataset(document, { requireReadyFlag: false });
  if (!readiness.ready) {
    throw new Error(`Dataset is not eligible: ${readiness.reasons.join("; ")}`);
  }
  return {
    ...document,
    status: "reviewed_staging_evaluation_ready",
    evaluationReady: true,
    finalReview: {
      reviewedBy,
      reviewedAt,
      confirmation: STAGING_CONFIRMATION
    }
  };
}

function cleanReviewValue(value) {
  return String(value ?? "").trim();
}

module.exports = {
  CANONICAL_ELIGIBILITY_FLOORS,
  CANDIDATE_ACCEPTANCE_FLOORS,
  COUNTABLE_CLASSES,
  RESOLVED_CLASSES,
  aggregateMaturityMetrics,
  compareCandidate,
  evaluateCounter,
  finalizeEvaluationDataset,
  intersectionOverUnion,
  STAGING_CONFIRMATION,
  validateEvaluationDataset
};
