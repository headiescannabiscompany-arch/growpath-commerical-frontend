import apiClient from "./apiClient";
export async function updateGrowInterests(growInterests: string[]) {
  return apiClient.patch("/api/user/interests", { growInterests });
}
