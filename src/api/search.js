import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function search(q) {
  return api(`${ROUTES.SEARCH.GLOBAL}?q=${encodeURIComponent(q)}`);
}