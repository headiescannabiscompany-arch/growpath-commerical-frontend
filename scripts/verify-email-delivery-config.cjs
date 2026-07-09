#!/usr/bin/env node
const REQUIRED = [
  "REQUIRE_EMAIL_VERIFICATION",
  "EMAIL_PROVIDER",
  "RESEND_API_KEY"
];

const DEFAULT_EMAIL_FROM = "GrowPathAI <noreply@growpathai.com>";

const strict = process.argv.includes("--strict");

function value(key) {
  return String(process.env[key] || "").trim();
}

function mask(key, raw) {
  if (!raw) return "(missing)";
  if (/KEY|TOKEN|SECRET|PASSWORD/i.test(key)) {
    return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
  }
  return raw;
}

const findings = [];

for (const key of REQUIRED) {
  if (!value(key)) findings.push(`Missing ${key}`);
}

if (value("REQUIRE_EMAIL_VERIFICATION").toLowerCase() !== "true") {
  findings.push("REQUIRE_EMAIL_VERIFICATION must be true for production verification emails.");
}

if (value("EMAIL_PROVIDER").toLowerCase() !== "resend") {
  findings.push("EMAIL_PROVIDER must be resend for the current backend email sender.");
}

if (value("RESEND_API_KEY") && !value("RESEND_API_KEY").startsWith("re_")) {
  findings.push("RESEND_API_KEY should start with re_.");
}

if (value("EMAIL_FROM") && !/^.+<[^@\s]+@[^@\s]+\.[^@\s]+>$/.test(value("EMAIL_FROM"))) {
  findings.push(
    `EMAIL_FROM must use display-name format, for example: ${DEFAULT_EMAIL_FROM}.`
  );
}

console.log("[email-delivery-config] Required production email variables:");
for (const key of REQUIRED) {
  console.log(`- ${key}: ${mask(key, value(key))}`);
}

console.log("");
console.log("[email-delivery-config] Expected sender setup:");
console.log("- Provider: Resend");
console.log("- Verified sending domain: growpathai.com in Resend");
console.log(`- Default sender when EMAIL_FROM is omitted: ${DEFAULT_EMAIL_FROM}`);
console.log(`- Optional EMAIL_FROM override: ${DEFAULT_EMAIL_FROM}`);
console.log("- Public support fallback: support@growpathai.com");

if (findings.length) {
  console.log("");
  console.log("[email-delivery-config] Findings:");
  findings.forEach((finding) => console.log(`- ${finding}`));
  if (strict) process.exit(1);
  process.exit(0);
}

console.log("");
console.log("[email-delivery-config] OK: production email config shape is present.");
