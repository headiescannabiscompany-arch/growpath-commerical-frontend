const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HIGH_SEVERITIES = new Set(["high", "critical"]);
const SEVERITIES = new Set(["info", "low", "moderate", "high", "critical"]);

function validateAuditReport(report) {
  if (
    !report ||
    report.error ||
    report.auditReportVersion !== 2 ||
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== "object" ||
    Array.isArray(report.vulnerabilities) ||
    !report.metadata?.vulnerabilities
  ) {
    throw new Error(
      "npm audit returned an incomplete or failed report; refusing to pass."
    );
  }
  const observed = Object.fromEntries([...SEVERITIES].map((severity) => [severity, 0]));
  for (const [name, value] of Object.entries(report.vulnerabilities)) {
    if (!value || !SEVERITIES.has(value.severity)) {
      throw new Error(`npm audit returned an invalid severity for ${name}.`);
    }
    observed[value.severity] += 1;
  }
  for (const severity of SEVERITIES) {
    const count = report.metadata.vulnerabilities[severity];
    if (!Number.isSafeInteger(count) || count < 0 || count !== observed[severity]) {
      throw new Error(
        `npm audit returned inconsistent ${severity} counts; refusing to pass.`
      );
    }
  }
  if (
    report.metadata.vulnerabilities.total !== Object.keys(report.vulnerabilities).length
  ) {
    throw new Error("npm audit returned inconsistent total count; refusing to pass.");
  }
  return report;
}

function loadAuditReport() {
  const npmCli = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")
  ]
    .map((candidate) => String(candidate || "").trim())
    .filter(Boolean)
    .find((candidate) => fs.existsSync(candidate));
  if (!npmCli) throw new Error("Unable to locate npm-cli.js for the dependency audit.");

  const result = spawnSync(
    process.execPath,
    [npmCli, "audit", "--omit=dev", "--audit-level=high", "--json"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`npm audit failed with exit status ${String(result.status)}.`);
  }
  if (!result.stdout?.trim()) {
    throw new Error(result.stderr || "npm audit returned no JSON output.");
  }
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error("npm audit returned invalid JSON; refusing to pass.");
  }
  validateAuditReport(report);
  if (
    result.status === 1 &&
    report.metadata.vulnerabilities.high === 0 &&
    report.metadata.vulnerabilities.critical === 0
  ) {
    throw new Error(
      "npm audit failed without a matching high/critical finding; refusing to pass."
    );
  }
  return report;
}

function classify(report) {
  validateAuditReport(report);
  return Object.entries(report.vulnerabilities).filter(([, value]) =>
    HIGH_SEVERITIES.has(value.severity)
  );
}

function main() {
  // npm does not certify local file dependencies. Their installed sources and
  // security regressions must pass independently before the registry audit.
  const verification = spawnSync(
    process.execPath,
    [path.join(__dirname, "verify-security-dependency-repairs.cjs")],
    { cwd: ROOT, stdio: "inherit" }
  );
  if (verification.error || verification.status !== 0) {
    throw new Error(
      "Local dependency repair verification failed; release remains blocked."
    );
  }

  const blocked = classify(loadAuditReport());
  if (blocked.length) {
    for (const [name, value] of blocked) {
      console.error(
        `- ${name}: ${value.severity} (${value.range || "range unavailable"})`
      );
    }
    throw new Error("Production dependency audit found high/critical vulnerabilities.");
  }
  console.log(
    "Production dependency audit passed: local repairs verified; no high/critical registry findings; no advisory exceptions."
  );
}

module.exports = { classify, validateAuditReport };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}
