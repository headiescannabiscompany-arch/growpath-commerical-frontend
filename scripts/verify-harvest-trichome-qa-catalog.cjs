#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const fixturePath = path.join(
  ROOT,
  "tests",
  "fixtures",
  "harvest-trichome-qa-catalog.json"
);
const annotationTemplatePath = path.join(
  ROOT,
  "tests",
  "fixtures",
  "harvest-trichome-counter-annotation-template.json"
);
const baselinePredictionTemplatePath = path.join(
  ROOT,
  "tests",
  "fixtures",
  "harvest-trichome-baseline-prediction-template.json"
);

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function isUrl(value) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function main() {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const annotationTemplate = JSON.parse(fs.readFileSync(annotationTemplatePath, "utf8"));
  const baselinePredictionTemplate = JSON.parse(
    fs.readFileSync(baselinePredictionTemplatePath, "utf8")
  );
  const errors = [];

  requireCondition(
    fixture.schemaVersion === "growpath-harvest-trichome-qa-v1",
    "Unexpected Harvest trichome QA schema version.",
    errors
  );
  requireCondition(
    baselinePredictionTemplate.schemaVersion ===
      "growpath-harvest-trichome-predictions-v1" &&
      baselinePredictionTemplate.status === "deployed_baseline_aggregate_template" &&
      Array.isArray(baselinePredictionTemplate.images) &&
      baselinePredictionTemplate.images.length === 1 &&
      Array.isArray(baselinePredictionTemplate.images[0].heads) &&
      baselinePredictionTemplate.images[0].heads.length === 0,
    "The deployed baseline template must preserve aggregate tallies without invented head boxes.",
    errors
  );

  requireCondition(
    annotationTemplate.schemaVersion === "growpath-harvest-trichome-annotations-v1" &&
      annotationTemplate.status === "annotation_template" &&
      annotationTemplate.evaluationReady === false &&
      Array.isArray(annotationTemplate.images) &&
      annotationTemplate.images.length === 0,
    "Annotation template must remain empty and ineligible until reviewed labels are supplied.",
    errors
  );
  requireCondition(
    annotationTemplate.eligibilityPolicy?.minimumQualifiedImages >= 50 &&
      annotationTemplate.eligibilityPolicy?.minimumLabeledHeads >= 1000 &&
      annotationTemplate.eligibilityPolicy?.minimumCaptureSessions >= 10 &&
      annotationTemplate.eligibilityPolicy?.minimumDeviceModels >= 3 &&
      annotationTemplate.eligibilityPolicy?.minimumPerResolvedClass >= 100 &&
      annotationTemplate.eligibilityPolicy?.independentReviewersPerImage >= 2 &&
      annotationTemplate.eligibilityPolicy?.adjudicationRequired === true,
    "Counter eligibility floors or independent-review requirements were weakened.",
    errors
  );
  requireCondition(
    fixture.status === "rights_reviewed_seed",
    "Harvest trichome catalog must remain a rights-reviewed seed until quantitative blockers are closed.",
    errors
  );
  requireCondition(
    fixture.rightsPolicy?.useForModelTraining === false,
    "Harvest trichome references must not be model-training data.",
    errors
  );
  requireCondition(
    fixture.executionPolicy?.dryRunDefault === true &&
      fixture.executionPolicy?.stagingOnly === true &&
      fixture.executionPolicy?.networkInUnitTests === false &&
      fixture.executionPolicy?.providerCallsInUnitTests === false &&
      fixture.executionPolicy?.productionWrites === false &&
      fixture.executionPolicy?.requiresExactConfirmation ===
        "RUN_GROWPATH_HARVEST_TRICHOME_STAGING",
    "Harvest trichome execution policy must fail closed outside an explicitly confirmed staging run.",
    errors
  );

  const classIds = Object.keys(fixture.classDefinitions || {});
  for (const requiredClass of [
    "clear",
    "cloudy",
    "amber",
    "amber_or_warm_light",
    "cloudy_or_glare",
    "not_a_countable_head"
  ]) {
    requireCondition(
      classIds.includes(requiredClass),
      `Missing class definition: ${requiredClass}.`,
      errors
    );
  }

  requireCondition(
    fixture.calibrationReadiness?.qualitativeClassSeedReady === true &&
      fixture.calibrationReadiness?.quantitativeCounterReady === false &&
      fixture.calibrationReadiness?.representativeHarvestDecisionReady === false,
    "Seed readiness must not claim a production-ready counter or harvest decision.",
    errors
  );
  requireCondition(
    Array.isArray(fixture.calibrationReadiness?.blockers) &&
      fixture.calibrationReadiness.blockers.length >= 4,
    "Calibration blockers are incomplete.",
    errors
  );

  requireCondition(
    fixture.counterEvaluationGate?.annotationTemplate ===
      "tests/fixtures/harvest-trichome-counter-annotation-template.json" &&
      fixture.counterEvaluationGate?.baselinePredictionTemplate ===
        "tests/fixtures/harvest-trichome-baseline-prediction-template.json" &&
      String(fixture.counterEvaluationGate?.acceptance || "").includes(
        "must meet every absolute detector"
      ) &&
      Array.isArray(fixture.counterEvaluationGate?.separateMetrics) &&
      fixture.counterEvaluationGate.separateMetrics.length >= 5 &&
      fixture.counterEvaluationGate?.absoluteCandidateFloors?.minimumDetectionPrecision >=
        0.8 &&
      fixture.counterEvaluationGate?.absoluteCandidateFloors?.minimumDetectionRecall >=
        0.8 &&
      fixture.counterEvaluationGate?.absoluteCandidateFloors?.minimumDetectionF1 >= 0.8 &&
      fixture.counterEvaluationGate?.absoluteCandidateFloors
        ?.minimumResolvedClassMacroF1 >= 0.75 &&
      fixture.counterEvaluationGate?.absoluteCandidateFloors?.minimumAmberF1 >= 0.75 &&
      fixture.counterEvaluationGate?.absoluteCandidateFloors?.minimumAmberRecall >= 0.8 &&
      fixture.counterEvaluationGate?.absoluteCandidateFloors?.maximumFalseAmberRate <=
        0.15 &&
      fixture.counterEvaluationGate?.absoluteCandidateFloors
        ?.minimumPossibleAmberCoverage >= 0.8 &&
      fixture.counterEvaluationGate?.absoluteCandidateFloors
        ?.maximumMeanAmberIntervalError <= 0.08,
    "Counter evaluation must preserve aggregate-baseline truth and absolute detector, class, false-amber, and interval floors.",
    errors
  );

  const methodEvidence = fixture.methodEvidence || [];
  requireCondition(
    methodEvidence.length >= 1 &&
      methodEvidence.every(
        (item) =>
          item.datasetAccess === "author_inquiry_required" &&
          item.useAsMediaSource === false &&
          Array.isArray(item.doesNotSupply) &&
          item.doesNotSupply.includes("GrowPath accuracy evidence")
      ),
    "Architecture evidence must preserve dataset, weights, and transfer limits.",
    errors
  );

  requireCondition(
    Array.isArray(fixture.quarantinedCandidates) &&
      fixture.quarantinedCandidates.length >= 1 &&
      fixture.quarantinedCandidates.every(
        (item) =>
          item.useAsMediaSource === false &&
          item.useAsGroundTruth === false &&
          Array.isArray(item.reasons) &&
          item.reasons.length >= 4
      ),
    "Unverified candidate datasets must remain quarantined from media and ground-truth use.",
    errors
  );

  const sources = fixture.sources || [];
  requireCondition(
    sources.length >= 3,
    "At least three reviewed sources are required.",
    errors
  );
  const sourceIds = new Set();
  for (const source of sources) {
    requireCondition(
      !sourceIds.has(source.sourceId),
      `Duplicate source: ${source.sourceId}.`,
      errors
    );
    sourceIds.add(source.sourceId);
    requireCondition(
      isUrl(source.sourceUrl),
      `Invalid source URL: ${source.sourceId}.`,
      errors
    );
    requireCondition(
      isUrl(source.openAccessPackageUrl),
      `Invalid open-access package URL: ${source.sourceId}.`,
      errors
    );
    requireCondition(
      source.licenseId === "CC-BY-4.0" &&
        source.licenseUrl === "https://creativecommons.org/licenses/by/4.0/",
      `Unsupported or unverified license: ${source.sourceId}.`,
      errors
    );
    requireCondition(
      source.rightsReviewedAt === "2026-08-12" &&
        source.intendedUseApproved === true &&
        source.retracted === false,
      `Rights/retraction review is incomplete: ${source.sourceId}.`,
      errors
    );
    requireCondition(
      Array.isArray(source.notTrustedFor) &&
        source.notTrustedFor.includes("universal harvest timing") &&
        source.notTrustedFor.includes("whole-plant inference"),
      `Source limits are incomplete: ${source.sourceId}.`,
      errors
    );
  }

  const cases = fixture.referenceCases || [];
  requireCondition(cases.length >= 8, "Reference case seed is incomplete.", errors);
  const caseIds = new Set();
  for (const item of cases) {
    requireCondition(
      !caseIds.has(item.caseId),
      `Duplicate case: ${item.caseId}.`,
      errors
    );
    caseIds.add(item.caseId);
    requireCondition(
      sourceIds.has(item.sourceId),
      `Unknown source for case ${item.caseId}.`,
      errors
    );
    requireCondition(
      Array.isArray(item.expectedClasses) && item.expectedClasses.length > 0,
      `Expected classes missing for ${item.caseId}.`,
      errors
    );
    requireCondition(
      item.expectedClasses.every((value) => ["clear", "cloudy", "amber"].includes(value)),
      `Invalid expected class for ${item.caseId}.`,
      errors
    );
    requireCondition(
      typeof item.quantitativeGroundTruth === "boolean" &&
        typeof item.blindRecognitionEligible === "boolean",
      `Evaluation eligibility is incomplete for ${item.caseId}.`,
      errors
    );
    if (item.exactCounts) {
      const { clear, cloudy, amber, total } = item.exactCounts;
      requireCondition(
        clear + cloudy + amber === total,
        `Exact counts do not total for ${item.caseId}.`,
        errors
      );
      requireCondition(
        item.quantitativeGroundTruth === true && item.blindRecognitionEligible === false,
        `Annotated count case must not become a blind-recognition input: ${item.caseId}.`,
        errors
      );
    } else {
      requireCondition(
        item.quantitativeGroundTruth === false,
        `Qualitative case cannot claim quantitative ground truth: ${item.caseId}.`,
        errors
      );
    }
  }

  requireCondition(
    cases.some((item) => item.expectedClasses.includes("clear")) &&
      cases.some((item) => item.expectedClasses.includes("cloudy")) &&
      cases.some((item) => item.expectedClasses.includes("amber")),
    "Reference seed must cover clear, cloudy, and amber.",
    errors
  );

  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Harvest trichome QA catalog verified: ${sources.length} sources, ${cases.length} reference cases, no network/provider/write execution.`
  );
}

main();
