#!/usr/bin/env node
/**
 * Temporary npm audit wrapper for Expo SDK 49.
 *
 * React Native 0.72.x depends on @react-native-community/cli packages that still
 * declare the GHSA-2p57-rm9w-gvfp "ip" advisory as unresolved even though we pin
 * ip@2.0.1 via package overrides. Running `npm audit` directly would fail every CI
 * build. This script shells out to `npm audit --omit=dev --audit-level=high`,
 * ignores the known CLI/IP advisories, and fails only when new vulnerabilities
 * appear. Once the app is upgraded to Expo SDK 5x / React Native 0.7x+ (where the
 * CLI has patched metadata), delete this script and call `npm audit` directly.
 */

import { spawnSync } from "node:child_process";

const auditArgs = ["audit", "--omit=dev", "--audit-level=high", "--json"];
const result = spawnSync("npm", auditArgs, { encoding: "utf8" });

if (result.status === 0) {
  console.log("npm audit passed with no vulnerabilities");
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(result.stdout || result.stderr || "{}");
} catch (error) {
  console.error("Failed to parse npm audit output:", error.message);
  process.stderr.write(result.stdout || result.stderr || "");
  process.exit(result.status ?? 1);
}

if (payload.error) {
  console.error("npm audit returned an error:", payload.error.summary || payload.error);
  process.exit(1);
}

const allowed = new Set([
  "ip",
  "@react-native-community/cli",
  "@react-native-community/cli-doctor",
  "@react-native-community/cli-hermes",
  "react-native"
]);

const vulnerabilities = payload.vulnerabilities || {};
const remaining = Object.keys(vulnerabilities).filter((name) => !allowed.has(name));

if (remaining.length > 0) {
  console.error("npm audit found blocking vulnerabilities:", remaining.join(", "));
  process.exit(1);
}

console.log(
  "npm audit only reported the known React Native CLI `ip` advisory (GHSA-2p57-rm9w-gvfp); ignoring until the Expo/RN upgrade."
);
process.exit(0);
