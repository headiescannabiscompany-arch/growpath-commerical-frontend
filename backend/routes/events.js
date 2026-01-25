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
  const { type, meta } = req.body || {};
  if (!type || typeof type !== "string") {
    return res.status(400).json({ message: "type is required" });
  }
  if (!ALLOWED.has(type)) {
    return res.status(400).json({ message: "unknown event type" });
  }

  await logEvent(req, type, meta);
  return res.json({ ok: true });
});

module.exports = router;
