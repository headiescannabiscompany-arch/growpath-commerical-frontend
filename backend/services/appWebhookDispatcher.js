"use strict";

const crypto = require("crypto");
const fetch = require("node-fetch");
const WebhookEndpoint = require("../models/WebhookEndpoint");
const WebhookDeliveryLog = require("../models/WebhookDeliveryLog");
const { encryptSecret, decryptSecret } = require("../utils/secretBox");

const ALLOWED_EVENTS = new Set([
  "TASK_ASSIGNED",
  "TASK_OVERDUE",
  "COMPLIANCE_REQUIRED",
  "COMPLIANCE_MISSED",
  "AUTOMATION_TRIGGERED",
  "TEAM_INVITE"
]);

const MAX_DELIVERY_ATTEMPTS = 3;
const TEST_EVENT = "WEBHOOK_TEST";

function createSigningSecret() {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

function previewSecret(secret) {
  const value = String(secret || "");
  if (value.length <= 10) return value ? "configured" : "";
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function signPayload(secret, timestamp, payload) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

async function setNewSecret(webhook) {
  const signingSecret = createSigningSecret();
  webhook.signingSecretEncrypted = encryptSecret(signingSecret);
  webhook.signingSecretPreview = previewSecret(signingSecret);
  webhook.secretRotatedAt = new Date();
  await webhook.save();
  return signingSecret;
}

function buildDeliveryPayload(event, data) {
  return JSON.stringify({
    id: `evt_${crypto.randomBytes(12).toString("hex")}`,
    event,
    createdAt: new Date().toISOString(),
    data: data || {}
  });
}

async function deliverWebhook(webhook, event, data) {
  const requestId = `whreq_${crypto.randomBytes(12).toString("hex")}`;
  if (!webhook.enabled) {
    return WebhookDeliveryLog.create({
      webhookId: webhook._id,
      userId: webhook.userId,
      facilityId: webhook.facilityId || null,
      event,
      status: "skipped",
      requestId,
      error: "Webhook is disabled"
    });
  }

  if (!webhook.signingSecretEncrypted) {
    await setNewSecret(webhook);
  }

  const payload = buildDeliveryPayload(event, data);
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = decryptSecret(webhook.signingSecretEncrypted);
  const signature = signPayload(secret, timestamp, payload);
  let attemptCount = 0;
  let httpStatus = null;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt += 1) {
    attemptCount = attempt;
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "GrowPath-Webhooks/1.0",
          "x-growpath-event": event,
          "x-growpath-request-id": requestId,
          "x-growpath-signature": `t=${timestamp},v1=${signature}`
        },
        body: payload,
        timeout: 8000
      });
      httpStatus = response.status;
      if (response.ok || response.status === 202) {
        webhook.failureCount = 0;
        webhook.lastDeliveryAt = new Date();
        webhook.lastError = "";
        await webhook.save();
        return WebhookDeliveryLog.create({
          webhookId: webhook._id,
          userId: webhook.userId,
          facilityId: webhook.facilityId || null,
          event,
          status: "success",
          attemptCount,
          httpStatus,
          requestId,
          deliveredAt: new Date()
        });
      }
      lastError = `HTTP ${response.status}`;
      if (response.status < 500 && response.status !== 429) break;
    } catch (err) {
      lastError = err?.message || "Delivery failed";
    }
  }

  webhook.failureCount = Number(webhook.failureCount || 0) + 1;
  webhook.lastDeliveryAt = new Date();
  webhook.lastError = lastError || "Delivery failed";
  await webhook.save();
  return WebhookDeliveryLog.create({
    webhookId: webhook._id,
    userId: webhook.userId,
    facilityId: webhook.facilityId || null,
    event,
    status: "failed",
    attemptCount,
    httpStatus,
    error: webhook.lastError,
    requestId,
    deliveredAt: new Date()
  });
}

async function dispatchAppWebhookEvent({ event, userId, facilityId = null, data = {} }) {
  const normalizedEvent = String(event || "")
    .trim()
    .toUpperCase();
  if (!ALLOWED_EVENTS.has(normalizedEvent)) return [];

  const filter = {
    enabled: true,
    events: normalizedEvent
  };
  if (facilityId) {
    filter.facilityId = String(facilityId);
  } else if (userId) {
    filter.userId = String(userId);
    filter.facilityId = null;
  } else {
    return [];
  }

  const webhooks = await WebhookEndpoint.find(filter).limit(50);
  const deliveries = [];
  for (const webhook of webhooks) {
    try {
      deliveries.push(await deliverWebhook(webhook, normalizedEvent, data));
    } catch (err) {
      deliveries.push(
        await WebhookDeliveryLog.create({
          webhookId: webhook._id,
          userId: webhook.userId,
          facilityId: webhook.facilityId || null,
          event: normalizedEvent,
          status: "failed",
          attemptCount: 0,
          error: err?.message || "Webhook dispatch failed",
          deliveredAt: new Date()
        })
      );
    }
  }
  return deliveries;
}

module.exports = {
  ALLOWED_EVENTS,
  TEST_EVENT,
  dispatchAppWebhookEvent,
  deliverWebhook,
  setNewSecret
};
