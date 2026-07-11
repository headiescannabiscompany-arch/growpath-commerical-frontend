import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";
import type { FacilityReport } from "../types/report";

type ReportTokenOptions = { token?: string };

export const submitReport = async ({
  contentType,
  contentId,
  reason,
  token
}: {
  contentType: string;
  contentId: string;
  reason: string;
} & ReportTokenOptions) => {
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
}: {
  batchId?: string;
  supplier?: string;
  includeCOA?: boolean;
  notes?: string;
  format?: string;
} & ReportTokenOptions = {}) => {
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
}: {
  coaUrl?: string;
  audience?: string;
  highlightLimits?: boolean;
  format?: string;
} & ReportTokenOptions = {}) => {
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
}: {
  range?: string;
  courseId?: string;
  format?: string;
} & ReportTokenOptions = {}) => {
  return apiRequest(apiRoutes.COMMERCIAL_REPORTS.COURSE_SALES, {
    method: "POST",
    auth: token ? true : false,
    body: { range, courseId, format }
  });
};

export function getFacilityReport(facilityId: string) {
  return apiRequest<FacilityReport | { data?: FacilityReport; report?: FacilityReport }>(
    `/api/facilities/${encodeURIComponent(facilityId)}/reports/summary`
  ).then((res: any) => res?.report ?? res?.data?.report ?? res?.data ?? res);
}
