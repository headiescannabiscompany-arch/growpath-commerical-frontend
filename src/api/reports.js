import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export const submitReport = async ({ contentType, contentId, reason, token }) => {
  return apiRequest(apiRoutes.REPORTS.SUBMIT, {
    method: "POST",
    auth: token ? true : false,
    body: { contentType, contentId, reason }
  });
};

export const generateValidationReport = async ({
  batchId,
  supplier,
  includeCOA,
  notes,
  format = "pdf",
  token
} = {}) => {
  return apiRequest(apiRoutes.COMMERCIAL_REPORTS.VALIDATION, {
    method: "POST",
    auth: token ? true : false,
    body: { batchId, supplier, includeCOA, notes, format }
  });
};

export const explainCOA = async ({
  coaUrl,
  audience = "buyers",
  highlightLimits = true,
  format = "pdf",
  token
} = {}) => {
  return apiRequest(apiRoutes.COMMERCIAL_REPORTS.COA_EXPLAINED, {
    method: "POST",
    auth: token ? true : false,
    body: { coaUrl, audience, highlightLimits, format }
  });
};

export const exportCourseSales = async ({
  range = "last_30_days",
  courseId,
  format = "csv",
  token
} = {}) => {
  return apiRequest(apiRoutes.COMMERCIAL_REPORTS.COURSE_SALES, {
    method: "POST",
    auth: token ? true : false,
    body: { range, courseId, format }
  });
};

export function getFacilityReport(facilityId) {
  return apiRequest(
    `/api/facilities/${encodeURIComponent(String(facilityId))}/reports/summary`
  ).then((res) => res?.report ?? res?.data?.report ?? res?.data ?? res);
}
