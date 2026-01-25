import { api } from "./client";
import type { Webhook } from "../types/webhook";

export async function listWebhooks(facilityId: string): Promise<Webhook[]> {
  return api<Webhook[]>(`/api/facilities/${facilityId}/webhooks`);
}

export async function createWebhook(
  facilityId: string,
  data: Omit<Webhook, "id" | "facilityId">
): Promise<Webhook> {
  return api<Webhook>(`/api/facilities/${facilityId}/webhooks`, {
    method: "POST",
    body: data
  });
}

export async function updateWebhook(
  facilityId: string,
  webhookId: string,
  data: Partial<Webhook>
): Promise<Webhook> {
  return api<Webhook>(`/api/facilities/${facilityId}/webhooks/${webhookId}`, {
    method: "PATCH",
    body: data
  });
}

export async function deleteWebhook(
  facilityId: string,
  webhookId: string
): Promise<{ ok: true }> {
  return api<{ ok: true }>(`/api/facilities/${facilityId}/webhooks/${webhookId}`, {
    method: "DELETE"
  });
}
