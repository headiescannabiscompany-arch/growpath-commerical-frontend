"use strict";

const ALLOWED_CLASSES = new Set([
  "clear",
  "cloudy",
  "amber",
  "amber_or_warm_light",
  "cloudy_or_glare"
]);

function clean(value) {
  return String(value ?? "").trim();
}

function reviewerId(value) {
  if (value && typeof value === "object") {
    return clean(value.id || value.pk || value.email || value.username);
  }
  return clean(value);
}

function normalizedClass(value) {
  const normalized = clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return ALLOWED_CLASSES.has(normalized) ? normalized : "";
}

function normalizedBox(value = {}) {
  const x = Number(value.x) / 100;
  const y = Number(value.y) / 100;
  const width = Number(value.width) / 100;
  const height = Number(value.height) / 100;
  const rotation = Number(value.rotation || 0);
  if (
    ![x, y, width, height, rotation].every(Number.isFinite) ||
    rotation !== 0 ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > 1.000001 ||
    y + height > 1.000001
  ) {
    return null;
  }
  return { x, y, width, height };
}

function taskMetadata(metadataDocument, taskId) {
  const tasks = Array.isArray(metadataDocument?.tasks) ? metadataDocument.tasks : [];
  return tasks.find((item) => clean(item.taskId) === clean(taskId)) || null;
}

function selectedAdjudication(task, metadata) {
  const annotations = Array.isArray(task.annotations) ? task.annotations : [];
  const requestedId = clean(metadata.adjudicatedAnnotationId);
  const selected = requestedId
    ? annotations.find((annotation) => clean(annotation.id) === requestedId)
    : annotations.find((annotation) => annotation.ground_truth === true);
  if (!selected) {
    throw new Error(
      `Task ${task.id} has no adjudicated annotation. Mark one ground_truth or supply adjudicatedAnnotationId.`
    );
  }
  const independentReviewers = new Set(
    annotations.map((annotation) => reviewerId(annotation.completed_by)).filter(Boolean)
  );
  if (independentReviewers.size < 2) {
    throw new Error(`Task ${task.id} requires at least two independent reviewers.`);
  }
  return { selected, independentReviewers: independentReviewers.size };
}

function convertedHeads(annotation, taskId) {
  const results = Array.isArray(annotation.result) ? annotation.result : [];
  return results
    .filter((result) => result?.type === "rectanglelabels")
    .map((result, index) => {
      const labels = Array.isArray(result.value?.rectanglelabels)
        ? result.value.rectanglelabels
        : [];
      const label = normalizedClass(labels[0]);
      const box = normalizedBox(result.value);
      if (!label) {
        throw new Error(`Task ${taskId} contains an unsupported or missing head class.`);
      }
      if (!box) {
        throw new Error(
          `Task ${taskId} contains an invalid or rotated box; use axis-aligned head boxes.`
        );
      }
      return {
        id: clean(result.id) || `${taskId}-head-${index + 1}`,
        class: label,
        box
      };
    });
}

function validateMetadata(metadata, taskId) {
  const missing = [];
  if (!clean(metadata.imageId)) missing.push("imageId");
  if (!clean(metadata.assetLocator)) missing.push("assetLocator");
  if (!clean(metadata.captureSessionId)) missing.push("captureSessionId");
  if (!clean(metadata.deviceModel)) missing.push("deviceModel");
  if (
    !Array.isArray(metadata.lightingConditions) ||
    !metadata.lightingConditions.length
  ) {
    missing.push("lightingConditions");
  }
  if (!clean(metadata.rights?.sourceId)) missing.push("rights.sourceId");
  if (!clean(metadata.rights?.licenseId)) missing.push("rights.licenseId");
  if (!clean(metadata.rights?.reviewedAt)) missing.push("rights.reviewedAt");
  if (metadata.rights?.approvedForCommercialQa !== true) {
    missing.push("rights.approvedForCommercialQa");
  }
  if (missing.length) {
    throw new Error(`Task ${taskId} metadata is incomplete: ${missing.join(", ")}.`);
  }
}

function convertLabelStudioExport(exportTasks, metadataDocument) {
  if (!Array.isArray(exportTasks) || !exportTasks.length) {
    throw new Error("Label Studio export must contain at least one task.");
  }
  const images = exportTasks.map((task) => {
    const metadata = taskMetadata(metadataDocument, task.id);
    if (!metadata)
      throw new Error(`Missing rights/capture metadata for task ${task.id}.`);
    validateMetadata(metadata, task.id);
    const adjudication = selectedAdjudication(task, metadata);
    const heads = convertedHeads(adjudication.selected, task.id);
    if (!heads.length) throw new Error(`Task ${task.id} has no adjudicated head boxes.`);
    return {
      imageId: clean(metadata.imageId),
      assetLocator: clean(metadata.assetLocator),
      captureSessionId: clean(metadata.captureSessionId),
      deviceModel: clean(metadata.deviceModel),
      captureType: clean(metadata.captureType || "ordinary_phone_macro"),
      lightingConditions: [
        ...new Set(metadata.lightingConditions.map(clean).filter(Boolean))
      ],
      sampleRegion: clean(metadata.sampleRegion || "calyx"),
      rights: {
        sourceId: clean(metadata.rights.sourceId),
        licenseId: clean(metadata.rights.licenseId),
        reviewedAt: clean(metadata.rights.reviewedAt),
        approvedForCommercialQa: true,
        attribution: clean(metadata.rights.attribution)
      },
      reviewerAgreement: {
        independentReviewers: adjudication.independentReviewers,
        adjudicated: true,
        adjudicatedAnnotationId: clean(adjudication.selected.id)
      },
      heads
    };
  });
  const imageIds = images.map((image) => image.imageId);
  if (new Set(imageIds).size !== imageIds.length) {
    throw new Error("Imported imageId values must be unique.");
  }
  return {
    schemaVersion: "growpath-harvest-trichome-annotations-v1",
    status: "imported_requires_final_review",
    evaluationReady: false,
    purpose:
      "Blinded, rights-reviewed staging evaluation of trichome detection and maturity classification.",
    eligibilityPolicy: metadataDocument.eligibilityPolicy,
    importedAt: new Date().toISOString(),
    importSource: "label_studio_json",
    images
  };
}

module.exports = { convertLabelStudioExport, normalizedBox, normalizedClass };
