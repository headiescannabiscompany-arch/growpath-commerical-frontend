// src/api/adminReports.js
import apiClient from "./client.js";
import routes from "./routes.js";

export const getReports = async (token) => {
  return apiClient.get(routes.REPORTS.LIST, token);
};

export const resolveReport = async (id, token) => {
  return apiClient.patch(routes.REPORTS.RESOLVE(id), {}, token);
};
