import client from "./client.js";
import ROUTES from "./routes.js";

export const submitReport = async ({ contentType, contentId, reason, token }) => {
  return client.post(ROUTES.REPORTS.SUBMIT, { contentType, contentId, reason }, token);
};

export const generateValidationReport = async ({
  batchId,
  supplier,
  includeCOA,
  notes,
  format = "pdf",
  token
} = {}) => {
  return client.post(
    ROUTES.COMMERCIAL_REPORTS.VALIDATION,
    { batchId, supplier, includeCOA, notes, format },
    token
  );
};

export const explainCOA = async ({
  coaUrl,
  audience = "buyers",
  highlightLimits = true,
  format = "pdf",
  token
} = {}) => {
  return client.post(
    ROUTES.COMMERCIAL_REPORTS.COA_EXPLAINED,
    { coaUrl, audience, highlightLimits, format },
    token
  );
};

export const exportCourseSales = async ({
  range = "last_30_days",
  courseId,
  format = "csv",
  token
} = {}) => {
  return client.post(
    ROUTES.COMMERCIAL_REPORTS.COURSE_SALES,
    { range, courseId, format },
    token
  );
};
