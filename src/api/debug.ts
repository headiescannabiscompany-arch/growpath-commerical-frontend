import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";

export async function pingHealth() {
  return apiRequest(endpoints.health);
}

export async function getDebugInfo() {
  return apiRequest(endpoints.debugInfo);
}
