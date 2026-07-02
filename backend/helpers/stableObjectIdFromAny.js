const mongoose = require("mongoose");
const crypto = require("crypto");

function stableObjectIdFromAny(value) {
  const s = String(value ?? "");
  if (mongoose.isValidObjectId(s)) return new mongoose.Types.ObjectId(s);
  // Deterministic 24-hex ObjectId from any string (e.g. "u2")
  const hex = crypto.createHash("md5").update(s).digest("hex"); // 32 hex chars
  return new mongoose.Types.ObjectId(hex.slice(0, 24));
}

module.exports = stableObjectIdFromAny;
