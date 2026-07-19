#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = {
  agents: fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"),
  runbook: fs.readFileSync(
    path.join(root, "docs", "codex-browser-evidence-runbook.md"),
    "utf8"
  )
};

const requirements = [
  ["AGENTS Browser policy", files.agents, /in-app Browser/i],
  ["AGENTS scoped recovery policy", files.agents, /Only invoke the Browser recovery runbook/i],
  ["AGENTS no generic restart policy", files.agents, /Do not prescribe Codex restarts/i],
  ["AGENTS truthful evidence policy", files.agents, /substitute invented/i],
  ["runbook explicit-request scope", files.runbook, /user explicitly requests browser automation/i],
  ["runbook keyboard shortcut", files.runbook, /Ctrl\+Shift\+B/],
  ["runbook Chrome distinction", files.runbook, /ordinary Chrome/i],
  ["runbook commit SHA", files.runbook, /exact commit SHA/i],
  ["runbook production URL", files.runbook, /production URL/i],
  [
    "runbook evidence distinction",
    files.runbook,
    /Do not describe tests.*visual evidence/is
  ],
  ["runbook security guardrail", files.runbook, /Do not infer hacking/i]
];

const missing = requirements.filter(([, body, pattern]) => !pattern.test(body));
if (missing.length > 0) {
  for (const [label] of missing) console.error(`[codex-workflow] missing: ${label}`);
  process.exit(1);
}

console.log(`[codex-workflow] verified ${requirements.length} workflow requirements.`);
