import client from "./client";

export const submitReport = async ({ contentType, contentId, reason, token }) => {
  return client.post(
    "/reports",
    { contentType, contentId, reason },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
