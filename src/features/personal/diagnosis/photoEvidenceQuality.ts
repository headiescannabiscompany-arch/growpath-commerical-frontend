import type { EvidencePurpose } from "@/types/evidence";

export const PLANT_REVIEW_PHOTO_LIMIT = 12;

type PhotoMetadata = {
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  fileName?: string;
  mimeType?: string;
};

export type PhotoQualityAssessment = {
  accepted: boolean;
  error?: string;
  warnings: string[];
};

const REVIEW_PURPOSES = new Set<EvidencePurpose>([
  "diagnosis",
  "crop_identification",
  "ipm",
  "harvest"
]);

export const PHOTO_CAPTURE_GUIDANCE: Partial<Record<EvidencePurpose, string[]>> = {
  crop_identification: [
    "Start with a zoomed-out whole-plant photo showing growth habit and habitat.",
    "Add sharp leaf-top, leaf-underside, and stem-node views from the same plant.",
    "Add an open flower plus any fruit, seed, bark, or other diagnostic structure present.",
    "Use even daylight or diffuse neutral light. Avoid direct flash against a dark background, glare, clipped highlights, and deep shadow that hide color or structure.",
    "Keep the intended plant large enough to inspect and separate it from neighboring plants when possible."
  ],
  diagnosis: [
    "One zoomed-out whole-plant photo showing the overall pattern.",
    "One mid-range photo showing where symptoms occur on the plant.",
    "Sharp close-ups of the affected leaf top and underside.",
    "A macro detail and root-zone or medium photo when either may explain the symptom.",
    "If the problem is only a small part of a wider photo, describe or mark the exact target and add a close-up of that area."
  ],
  ipm: [
    "One zoomed-out plant or scout-zone photo showing distribution.",
    "Sharp leaf-top and leaf-underside photos from affected and unaffected tissue.",
    "A macro of the organism, egg, webbing, frass, lesion edge, or other sign.",
    "A dated sticky-trap or root-zone photo when it is relevant to the scout.",
    "When several organisms or objects appear, name the intended target and add a dedicated macro; GrowPath must not assume the largest subject is the pest."
  ],
  harvest: [
    "Three sharp macro photos from top, middle, and lower bud sites.",
    "One wider bud-context photo showing where the macro samples came from.",
    "Use neutral white light and keep intact gland heads on bud calyxes in focus.",
    "Add extra representative sites when the canopy matures unevenly; do not rely on digital zoom.",
    "Photo count is not proof of coverage: even 12 wide photos cannot replace three true macros that resolve individual intact gland heads."
  ]
};

function finitePositive(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function assessEvidencePhoto(
  metadata: PhotoMetadata,
  purpose: EvidencePurpose
): PhotoQualityAssessment {
  if (!REVIEW_PURPOSES.has(purpose)) {
    return { accepted: true, warnings: [] };
  }

  const mimeType = String(metadata.mimeType || "").toLowerCase();
  if (mimeType && !mimeType.startsWith("image/")) {
    return {
      accepted: false,
      error:
        "This file is not a supported photo. Choose a JPEG, PNG, HEIC, or WebP image.",
      warnings: []
    };
  }

  const width = finitePositive(metadata.width);
  const height = finitePositive(metadata.height);
  const fileSize = finitePositive(metadata.fileSizeBytes);
  const warnings: string[] = [];

  if (width && height && Math.min(width, height) < 320) {
    return {
      accepted: false,
      error:
        "This photo is too small for dependable plant review. Retake or export it with both sides at least 320 pixels; 900 pixels or more is preferred.",
      warnings: []
    };
  }

  if (fileSize && fileSize < 12 * 1024) {
    return {
      accepted: false,
      error:
        "This file is too compressed for dependable plant review. Retake the photo or choose the original-resolution image.",
      warnings: []
    };
  }

  if (width && height) {
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);
    if (shortSide < 900) {
      warnings.push(
        "Resolution is limited. A photo with at least 900 pixels on the short side will preserve more diagnostic detail."
      );
    }
    if (longSide / shortSide > 3.5) {
      warnings.push(
        "This extreme crop may hide plant context. Add a normal-width zoomed-out photo."
      );
    }
  }

  if (fileSize && fileSize < 100 * 1024) {
    warnings.push(
      "This photo may be heavily compressed. Use the original camera file when fine detail matters."
    );
  }

  if (/\b(?:screen[-_ ]?shot|screen[-_ ]?capture)\b/i.test(metadata.fileName || "")) {
    warnings.push(
      "Screenshots often remove detail and metadata. Prefer the original camera photo."
    );
  }

  return { accepted: true, warnings };
}
