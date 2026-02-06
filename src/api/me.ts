import { api } from "./client";
import { endpoints } from "./endpoints";
import type { AuthUser } from "./auth";

export async function apiMe() {
  return api.get(endpoints.me);
}
