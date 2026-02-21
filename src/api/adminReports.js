// src/api/adminReports.js
import { apiRequest } from "./apiRequest";
import routes from "./routes.js";

export const getReports = async (token) => {
  return apiRequest(routes.REPORTS.LIST, { auth: token ? true : false });
};

export const resolveReport = async (id, token) => {
  return apiRequest(routes.REPORTS.RESOLVE(id), {
    method: "PATCH",
    auth: token ? true : false,
    body: {}
  });
};
