"use strict";

const crypto = require("crypto");

function encryptionKey() {
  const secret = String(process.env.TELEMETRY_SECRET_KEY || process.env.JWT_SECRET || "");
  if (!secret) throw new Error("Missing TELEMETRY_SECRET_KEY or JWT_SECRET");
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

function decryptSecret(value) {
  const [version, iv, tag, ciphertext] = String(value || "").split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Invalid encrypted secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

module.exports = { encryptSecret, decryptSecret };
