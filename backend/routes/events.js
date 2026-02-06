// backend/routes/events.js
const express = require("express");
const router = express.Router();

// If you have an authOptional middleware, use it. Otherwise, remove or replace as needed.
let authOptional;
try {
  authOptional = require("../middleware/authOptional");
} catch {
  authOptional = (req, res, next) => next(); // fallback: no auth
}
const { logEvent } = require("../utils/logEvent");

const ALLOWED = new Set([
  "view_feed",
  "create_post",
  "like_post",
  "hit_paywall",
  "upgrade_click",
  "upgrade_success"
]);

router.post("/", authOptional, async (req, res) => {
  const body = req.body || {};
  // Accept both shapes: { eventType, meta } (canonical) and { type, meta } (legacy)
  const eventType = body.eventType || body.type || null;
  const meta = body.meta || {};
  const source = body.source || "app";
  const ts = body.ts || new Date().toISOString();

  if (!eventType || typeof eventType !== "string") {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "eventType is required" }
    });
  }

  if (!ALLOWED.has(eventType)) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "unknown event type" }
    });
  }

  await logEvent(req, eventType, meta, { source, ts });
  return res.json({ ok: true });
});

module.exports = router;
