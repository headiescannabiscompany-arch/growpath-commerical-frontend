import client from "./client";

export const getReports = async (token) => {
  return client.get("/reports", {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const resolveReport = async (id, token) => {
  return client.patch(
    `/reports/${id}/resolve`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
};
