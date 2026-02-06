import { api } from "@/api/client";
import { endpoints } from "@/api/endpoints";

export async function pingHealth() {
  return api.get(endpoints.health);
}

export async function getDebugInfo() {
  return api.get(endpoints.debugInfo);
}
