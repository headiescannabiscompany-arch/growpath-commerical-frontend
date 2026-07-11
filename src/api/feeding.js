import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";
import { persistImageUri } from "@/utils/photoUploads";

function buildAuthHeaders(token) {
  if (!token) return undefined;
  const raw = String(token);
  const normalized = raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;
  return { Authorization: normalized };
}

export async function uploadLabel(uri, token) {
  const photoUrl = await persistImageUri(uri);
  const form = new FormData();
  form.append("photo", { uri, name: "label.jpg", type: "image/jpeg" });
  if (photoUrl) form.append("photoUrl", photoUrl);
  const result = await apiRequest(apiRoutes.FEEDING.LABEL, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: form
  });
  return photoUrl && result && typeof result === "object"
    ? { ...result, photoUrl }
    : result;
}

function numericWeeks(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(Math.max(Math.round(parsed), 1), 52);
}

function defaultScheduleRows(data = {}) {
  if (Array.isArray(data.schedule) && data.schedule.length) return data.schedule;
  const weeks = numericWeeks(data.weeks);
  const stage = String(data.stage || data.currentStage || "veg");
  const productName = String(
    data.nutrientData?.productName || data.productName || "Nutrient"
  );
  return Array.from({ length: weeks }, (_, index) => ({
    week: index + 1,
    stage,
    feed: {
      amountPerGallon: `Review ${productName} label rate; start low and adjust from plant response.`
    },
    notes: "Generated as a conservative planning row before backend risk review."
  }));
}

function unwrapToolResponse(response) {
  return response?.data ?? response ?? {};
}

export function generateSchedule(data, token) {
  const schedule = defaultScheduleRows(data);
  const payload = {
    ...data,
    productName: data?.productName || data?.nutrientData?.productName,
    medium: data?.medium || data?.growMedium,
    schedule
  };
  return apiRequest("/api/tools/feeding-schedule-review", {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: payload
  }).then((response) => {
    const body = unwrapToolResponse(response);
    const outputs = body.outputs || {};
    return {
      ...body,
      data: {
        ...(body.data || {}),
        schedule: {
          schedule,
          notes:
            outputs.logSummary ||
            outputs.scheduleSummary ||
            "Generated schedule reviewed by the feeding schedule calculator.",
          review: outputs
        },
        toolRun: body.toolRun
      }
    };
  });
}

export function convertScheduleToTemplate(data, token) {
  return apiRequest(apiRoutes.FEEDING.TO_TEMPLATE, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: data
  });
}
