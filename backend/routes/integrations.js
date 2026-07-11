"use strict";

const express = require("express");

const IntegrationAccessRequest = require("../models/IntegrationAccessRequest");
const IntegrationConnection = require("../models/IntegrationConnection");

const router = express.Router();

const PROVIDERS = [
  {
    id: "growlink",
    name: "Growlink",
    category: "telemetry",
    contractStatus: "access_required",
    access: "Read-only telemetry credentials required.",
    capabilities: ["current_readings", "historical_reporting"],
    documentationUrl: "https://api.developer.growlink.com/",
    requestUrl: "/api/integrations/access-requests"
  },
  {
    id: "ubibot",
    name: "UbiBot",
    category: "telemetry",
    contractStatus: "access_required",
    access: "Developer membership and channel credentials required.",
    capabilities: ["feed_summary", "mqtt_realtime_feeds"],
    documentationUrl:
      "https://www.ubibot.com/platform-api/2735/get-channel-feed-summaries/",
    requestUrl: "/api/integrations/access-requests"
  },
  {
    id: "pulse",
    name: "Pulse",
    category: "telemetry",
    contractStatus: "contract_pending",
    access: "Read-only device API contract pending.",
    capabilities: ["device_list", "telemetry_window"],
    documentationUrl: null,
    requestUrl: "/api/integrations/access-requests"
  }
];

function getUserId(req) {
  return String(
    req.userId ||
      req.ctx?.userId ||
      req.user?.id ||
      req.user?._id ||
      req.headers["x-test-user-id"] ||
      ""
  );
}

function requireUser(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" }
    });
    return "";
  }
  return userId;
}

function providerById(id) {
  return PROVIDERS.find((provider) => provider.id === String(id || ""));
}

function connectionDto(row) {
  const value = row?.toObject ? row.toObject() : row;
  if (!value) return null;
  return {
    id: String(value._id || value.id || ""),
    provider: String(value.provider || ""),
    label: String(value.label || ""),
    config: value.config || {},
    status: value.status || "draft",
    hasCredentials: Boolean(
      value.credentialsEncrypted && Object.keys(value.credentialsEncrypted).length
    ),
    lastTestAt: value.lastTestAt || null,
    lastError: value.lastError || null
  };
}

function encryptPlaceholder(credentials) {
  const out = {};
  for (const key of Object.keys(credentials || {})) {
    if (credentials[key]) out[key] = "[stored]";
  }
  return out;
}

router.get("/providers", (_req, res) => {
  res.json({ providers: PROVIDERS });
});

router.get("/connections", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const rows = await IntegrationConnection.find({
      ownerUserId: userId,
      deletedAt: null
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ connections: (rows || []).map(connectionDto) });
  } catch (error) {
    next(error);
  }
});

router.post("/connections", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const provider = providerById(req.body?.provider);
    if (!provider) return res.status(400).json({ message: "Unsupported provider" });
    const connection = await IntegrationConnection.create({
      ownerUserId: userId,
      provider: provider.id,
      label: String(req.body?.label || provider.name).trim(),
      config: req.body?.config || {},
      credentialsEncrypted: encryptPlaceholder(req.body?.credentials),
      status: req.body?.credentials ? "configured" : "draft"
    });
    res.status(201).json({ connection: connectionDto(connection) });
  } catch (error) {
    next(error);
  }
});

router.post("/connections/:id/test", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const connection = await IntegrationConnection.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: userId, deletedAt: null },
      {
        status: "access_requested",
        lastTestAt: new Date(),
        lastError: "Live provider validation requires configured gateway access."
      },
      { new: true }
    ).lean();
    if (!connection) return res.status(404).json({ message: "Connection not found" });
    res.json({ connection: connectionDto(connection) });
  } catch (error) {
    next(error);
  }
});

router.post("/access-requests", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const provider = providerById(req.body?.provider);
    if (!provider) return res.status(400).json({ message: "Unsupported provider" });
    const request = await IntegrationAccessRequest.create({
      ownerUserId: userId,
      provider: provider.id,
      organization: String(req.body?.organization || "GrowPath")
    });
    res.status(201).json({
      accessRequest: {
        id: String(request._id || request.id || ""),
        provider: provider.id,
        status: request.status || "requested"
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
