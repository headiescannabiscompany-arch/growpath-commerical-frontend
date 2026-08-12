"use strict";

const COUNTABLE_CLASSES = [
  "clear",
  "cloudy",
  "amber",
  "amber_or_warm_light",
  "cloudy_or_glare"
];
const RESOLVED_CLASSES = ["clear", "cloudy", "amber"];

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

function possibleAmberCoverage(groundTruth, predictions) {
  const imageIds = [...new Set(groundTruth.map((head) => head.imageId))];
  const cases = imageIds.map((imageId) => {
    const truthAmber = groundTruth.filter(
      (head) => head.imageId === imageId && head.class === "amber"
    ).length;
    const confirmedAmber = predictions.filter(
      (head) => head.imageId === imageId && head.class === "amber"
    ).length;
    const ambiguousWarm = predictions.filter(
      (head) => head.imageId === imageId && head.class === "amber_or_warm_light"
    ).length;
    return {
      imageId,
      truthAmber,
      predictedMinimum: confirmedAmber,
      predictedMaximum: confirmedAmber + ambiguousWarm,
      covered:
        confirmedAmber <= truthAmber && truthAmber <= confirmedAmber + ambiguousWarm
    };
  });
  return {
    coveredImages: cases.filter((item) => item.covered).length,
    evaluatedImages: cases.length,
    rate: safeDivide(cases.filter((item) => item.covered).length, cases.length),
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
    possibleAmberInterval: possibleAmberCoverage(groundTruth, predictions)
  };
}

function compareCandidate(baseline, candidate) {
  const checks = {
    detectionF1NotRegressed: candidate.detection.f1 >= baseline.detection.f1,
    resolvedClassF1NotRegressed:
      candidate.classification.macroResolvedClassF1 >=
      baseline.classification.macroResolvedClassF1,
    amberF1Improved: candidate.classification.amberF1 > baseline.classification.amberF1,
    amberRecallImproved:
      candidate.classification.amberRecall > baseline.classification.amberRecall,
    falseAmberRateNotRegressed:
      candidate.classification.falseAmberRate !== null &&
      (baseline.classification.falseAmberRate === null ||
        candidate.classification.falseAmberRate <=
          baseline.classification.falseAmberRate),
    possibleAmberCoverageNotRegressed:
      candidate.possibleAmberInterval.rate >= baseline.possibleAmberInterval.rate
  };
  return { accepted: Object.values(checks).every(Boolean), checks };
}

function validateEvaluationDataset(document = {}) {
  const policy = document.eligibilityPolicy || {};
  const images = Array.isArray(document.images) ? document.images : [];
  const heads = flattenedHeads(document);
  const sessions = new Set(images.map((image) => image.captureSessionId).filter(Boolean));
  const devices = new Set(images.map((image) => image.deviceModel).filter(Boolean));
  const conditions = new Set(images.flatMap((image) => image.lightingConditions || []));
  const reasons = [];
  if (document.evaluationReady !== true) reasons.push("evaluationReady is not true");
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

module.exports = {
  COUNTABLE_CLASSES,
  RESOLVED_CLASSES,
  compareCandidate,
  evaluateCounter,
  intersectionOverUnion,
  validateEvaluationDataset
};
