import client from "./client.js";
import ROUTES from "./routes.js";

export const submitReport = async ({ contentType, contentId, reason, token }) => {
  return client.post(
    ROUTES.REPORTS.SUBMIT,
    { contentType, contentId, reason },
    token
  );
};