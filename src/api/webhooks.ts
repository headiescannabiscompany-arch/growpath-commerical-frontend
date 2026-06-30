import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type Webhook = {
  id: string;
  _id?: string;
  url: string;
  events: string[];
  enabled: boolean;
  secretPreview?: string;
  secretRotatedAt?: string | null;
  failureCount?: number;
  lastDeliveryAt?: string | null;
  lastError?: string;
};

export type WebhookDelivery = {
  id: string;
  _id?: string;
  webhookId: string;
  event: string;
  status: "success" | "failed" | "skipped" | string;
  attemptCount: number;
  httpStatus?: number | null;
  error?: string;
  requestId?: string;
  deliveredAt?: string | null;
  createdAt?: string | null;
};

export type WebhookSecretResult = {
  webhook: Webhook;
  signingSecret: string;
};

function normalizeWebhook(raw: any): Webhook {
  const id = String(raw?.id || raw?._id || "");
  return {
    id,
    _id: raw?._id,
    url: String(raw?.url || ""),
    events: Array.isArray(raw?.events) ? raw.events.map(String) : [],
    enabled: raw?.enabled !== false,
    secretPreview: raw?.secretPreview ? String(raw.secretPreview) : "",
    secretRotatedAt: raw?.secretRotatedAt || null,
    failureCount: Number(raw?.failureCount || 0),
    lastDeliveryAt: raw?.lastDeliveryAt || null,
    lastError: raw?.lastError ? String(raw.lastError) : ""
  };
}

function normalizeDelivery(raw: any): WebhookDelivery {
  return {
    id: String(raw?.id || raw?._id || ""),
    _id: raw?._id,
    webhookId: String(raw?.webhookId || ""),
    event: String(raw?.event || ""),
    status: String(raw?.status || "skipped"),
    attemptCount: Number(raw?.attemptCount || 0),
    httpStatus:
      raw?.httpStatus === null || raw?.httpStatus === undefined
        ? null
        : Number(raw.httpStatus),
    error: raw?.error ? String(raw.error) : "",
    requestId: raw?.requestId ? String(raw.requestId) : "",
    deliveredAt: raw?.deliveredAt || null,
    createdAt: raw?.createdAt || null
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
}): Promise<Webhook & { signingSecret?: string }> {
  const res = await apiRequest(endpoints.webhooks, {
    method: "POST",
    body: data
  });
  return {
    ...normalizeWebhook(res?.webhook || res?.created || res?.data || res),
    signingSecret: res?.signingSecret ? String(res.signingSecret) : undefined
  };
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

export async function rotateWebhookSecret(id: string): Promise<WebhookSecretResult> {
  const res = await apiRequest(`${endpoints.webhook(id)}/rotate-secret`, {
    method: "POST"
  });
  return {
    webhook: normalizeWebhook(res?.webhook || res?.data || res),
    signingSecret: String(res?.signingSecret || "")
  };
}

export async function testWebhookDelivery(id: string): Promise<{
  webhook: Webhook;
  delivery: WebhookDelivery;
}> {
  const res = await apiRequest(`${endpoints.webhook(id)}/test-delivery`, {
    method: "POST"
  });
  return {
    webhook: normalizeWebhook(res?.webhook || res?.data?.webhook || res),
    delivery: normalizeDelivery(res?.delivery || res?.data?.delivery || {})
  };
}

export async function listWebhookDeliveries(id: string): Promise<WebhookDelivery[]> {
  const res = await apiRequest(`${endpoints.webhook(id)}/deliveries`);
  const list = res?.deliveries || res?.data?.deliveries || res?.items || [];
  return Array.isArray(list)
    ? list.map(normalizeDelivery).filter((delivery) => delivery.id)
    : [];
}
