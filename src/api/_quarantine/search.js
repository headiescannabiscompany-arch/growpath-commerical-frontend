import { client as api } from "./client.js";
import apiRoutes from "./routes.js";

export function search(q) {
  return api(`${apiRoutes.SEARCH.GLOBAL}?q=${encodeURIComponent(q)}`);
}
