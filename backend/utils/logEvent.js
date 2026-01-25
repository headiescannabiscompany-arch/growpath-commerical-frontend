// backend/utils/logEvent.js
const Event = require("../models/Event");

function getUserId(req) {
  // match your existing auth shapes (req.user / req.userId)
  return req.user?.id || req.user?._id || req.userId || req.user || null;
}

async function logEvent(req, type, meta = {}) {
  try {
    await Event.create({
      user: getUserId(req),
      type,
      meta: meta && typeof meta === "object" ? meta : {},
      ip: req.ip || "",
      ua: req.headers?.["user-agent"] || ""
    });
  } catch (e) {
    // Never break product flows because analytics failed
    // eslint-disable-next-line no-console
    console.warn("[EVENT] Failed to log event", type, e?.message || e);
  }
}

module.exports = { logEvent };
