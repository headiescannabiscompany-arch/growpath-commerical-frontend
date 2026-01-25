import client from "./client";

export async function updateGrowInterests(growInterests: string[]) {
  return client.patch("/api/user/interests", { growInterests });
}
