import client from "./client.js";
import ROUTES from "./routes.js";

export const getReports = async (token) => {
  return client.get(ROUTES.REPORTS.LIST, token);
};

export const resolveReport = async (id, token) => {
  return client.patch(ROUTES.REPORTS.RESOLVE(id), {}, token);
};
