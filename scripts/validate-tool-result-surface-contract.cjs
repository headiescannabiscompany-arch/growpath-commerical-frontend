#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[tool-result-surface-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const surface = read("src/features/personal/tools/ToolResultSurface.tsx");
const test = read("src/features/personal/tools/__tests__/ToolResultSurface.test.tsx");

[
  "ToolResultMetric",
  "ToolResultNotice",
  "ToolResultAction",
  "metrics",
  "inputs",
  "outputs",
  "notices",
  "recommendations",
  "assumptions",
  "formulas",
  "uncertainty",
  "confidence",
  "actions",
  "feedback",
  "copyPayload",
  "onReuseInputs",
  "onAskAI"
].forEach((field) => {
  requireText("ToolResultSurface", surface, new RegExp(`\\b${field}\\b`), field);
});

[
  ["action state", /const \[activeAction, setActiveAction\]/],
  ["action feedback", /const \[actionFeedback, setActionFeedback\]/],
  ["disabled while action active", /if \(activeAction \|\| action\.disabled\) return/],
  ["pending label", /pending \? action\.pendingLabel \|\| "Working\.\.\." : action\.label/],
  ["success message", /if \(action\.successMessage\) setActionFeedback\(action\.successMessage\)/],
  ["error message", /setActionFeedback\(error\?\.message \|\| "Unable to complete this action\."\)/],
  ["copy result action", /key: "copy-result"/],
  ["reuse inputs action", /key: "reuse-inputs"/],
  ["ask AI action", /key: "ask-ai"/],
  ["AI prompt safety", /Do not make absolute diagnosis claims/],
  ["live feedback region", /accessibilityLiveRegion="polite"/]
].forEach(([description, pattern]) => {
  requireText("ToolResultSurface", surface, pattern, description);
});

[
  "renders canonical tool result sections and standard actions",
  "opens personal AI with structured result context by default",
  "copies the structured result payload",
  "shows pending and success feedback for result actions",
  "shows action error feedback without losing the result"
].forEach((name) => {
  requireText("ToolResultSurface tests", test, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), name);
});

if (!process.exitCode) {
  console.log("[tool-result-surface-contract] Tool result surface/action contract verified");
}
