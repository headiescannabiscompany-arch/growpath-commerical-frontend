import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type Webhook = {
  id: string;
  _id?: string;
  url: string;
  events: string[];
  enabled: boolean;
};

function normalizeWebhook(raw: any): Webhook {
  const id = String(raw?.id || raw?._id || "");
  return {
    id,
    _id: raw?._id,
    url: String(raw?.url || ""),
    events: Array.isArray(raw?.events) ? raw.events.map(String) : [],
    enabled: raw?.enabled !== false
  };
}

function normalizeList(res: any): Webhook[] {
  const list =
    res?.webhooks ||
    res?.data?.webhooks ||
    res?.data ||
    res?.items ||
    res?.results ||
    res ||
    [];
  return Array.isArray(list) ? list.map(normalizeWebhook).filter((w) => w.id) : [];
}

export async function listWebhooks(): Promise<Webhook[]> {
  const res = await apiRequest(endpoints.webhooks);
  return normalizeList(res);
}

export async function createWebhook(data: {
  url: string;
  events: string[];
  enabled?: boolean;
}): Promise<Webhook> {
  const res = await apiRequest(endpoints.webhooks, {
    method: "POST",
    body: data
  });
  return normalizeWebhook(res?.webhook || res?.created || res?.data || res);
}

export async function updateWebhook(
  id: string,
  data: Partial<Pick<Webhook, "url" | "events" | "enabled">>
): Promise<Webhook> {
  const res = await apiRequest(endpoints.webhook(id), {
    method: "PUT",
    body: data
  });
  return normalizeWebhook(res?.webhook || res?.updated || res?.data || res);
}

export async function deleteWebhook(id: string) {
  const res = await apiRequest(endpoints.webhook(id), {
    method: "DELETE"
  });
  return res?.deleted ?? res?.ok ?? res;
}
