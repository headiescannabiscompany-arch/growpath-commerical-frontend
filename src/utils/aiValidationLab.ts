import type { AiFeedbackRequest } from "@/api/aiValidation";

export function parseJsonObject(value: string, label: string) {
  try {
    const parsed = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object`);
    }
    return parsed as Record<string, unknown>;
  } catch (e: any) {
    throw new Error(e?.message || `${label} must be valid JSON`);
  }
}

export function parseFeedbackRating(value: string) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("rating must be a number between 1 and 5");
  }
  return rating;
}

export function labelsFromText(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildFeedbackPayload(input: {
  targetType: string;
  targetId: string;
  rating: string;
  comment: string;
  labels: string;
}): AiFeedbackRequest {
  const targetType = input.targetType.trim();
  const targetId = input.targetId.trim();

  if (!targetType) throw new Error("targetType is required");
  if (!targetId) throw new Error("targetId is required");

  return {
    targetType,
    targetId,
    rating: parseFeedbackRating(input.rating),
    comment: input.comment.trim() || undefined,
    labels: labelsFromText(input.labels)
  };
}
