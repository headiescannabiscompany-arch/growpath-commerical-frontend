"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APP_DIR = path.join(ROOT, "src", "app");
const SRC_DIR = path.join(ROOT, "src");
const BACKEND_DIR = path.join(ROOT, "backend");
const OUT_DIR = path.join(ROOT, "tmp", "scan");

const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set([
  ".git",
  ".expo",
  ".npm-cache",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
  "tmp"
]);

const ROUTE_PLACEHOLDERS = [
  /\bcoming soon\b/i,
  /\bnot implemented\b/i,
  /\btemporarily stubbed\b/i,
  /\b\(stub\)\b/i,
  /\bTODO\b/,
  /\bhidden for release\b/i,
  /\brelease decision:\s*hidden\b/i,
  /\bbeta\b/i,
  /\bplanned for this shell\b/i
];

const RELEASE_SCRIPTS = [
  "scan:release",
  "release:preflight",
  "release:preflight:strict",
  "verify:sentry-dsn",
  "verify:live-urls",
  "verify:data-rights:live",
  "release:builds",
  "release:machine",
  "release:go-no-go"
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile() && CODE_EXTS.has(path.extname(entry.name))) out.push(abs);
  }
  return out;
}

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, "/");
}

function read(abs) {
  return fs.readFileSync(abs, "utf8").replace(/^\uFEFF/, "");
}

function toRoute(appRelativePath) {
  const noExt = appRelativePath.replace(/\.(tsx?|jsx?)$/i, "");
  const segments = noExt
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .filter((segment) => segment !== "_layout");
  if (segments.length === 0) return null;
  if (segments[segments.length - 1] === "index") segments.pop();
  return `/${segments.join("/")}`;
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function collectFrontendRoutes() {
  const files = walk(APP_DIR);
  const routes = [];
  const findings = [];

  for (const abs of files) {
    const file = rel(abs);
    const appRel = path.relative(APP_DIR, abs).replace(/\\/g, "/");
    const route = toRoute(appRel);
    if (!route) continue;

    const source = read(abs);
    const isLayout = /\/_layout\.(tsx?|jsx?)$/i.test(file);
    const hasDefaultExport =
      /\bexport\s+default\b/.test(source) ||
      /\bexport\s*\{\s*default\s*\}\s*from\b/.test(source);
    const controls = {
      pressable: (source.match(/\bPressable\b/g) || []).length,
      touchable: (source.match(/\bTouchable[A-Za-z]*\b/g) || []).length,
      button: (source.match(/\bButton\b/g) || []).length,
      link: (source.match(/\bLink\b/g) || []).length,
      textInput: (source.match(/\bTextInput\b/g) || []).length,
      onPress: (source.match(/\bonPress\s*[:=]/g) || []).length,
      href: (source.match(/\bhref\s*=/g) || []).length,
      routerPush: (source.match(/\brouter\.(push|replace|navigate)\s*\(/g) || []).length
    };

    if (!isLayout && !hasDefaultExport) {
      findings.push({
        severity: "error",
        check: "frontend route default export",
        file,
        route,
        message: "Route screen is missing export default."
      });
    }

    for (const pattern of ROUTE_PLACEHOLDERS) {
      const match = pattern.exec(source);
      if (match) {
        findings.push({
          severity: "error",
          check: "frontend placeholder language",
          file,
          route,
          line: lineNumber(source, match.index),
          message: `Placeholder marker found: ${match[0]}`
        });
      }
    }

    const visibleControls =
      controls.pressable + controls.touchable + controls.button + controls.link;
    const actions = controls.onPress + controls.href + controls.routerPush;
    if (!isLayout && visibleControls > 0 && actions === 0) {
      findings.push({
        severity: "warning",
        check: "frontend inert controls",
        file,
        route,
        message:
          "Interactive components are present but no onPress, href, or router navigation was detected."
      });
    }

    routes.push({ file, route, kind: isLayout ? "layout" : "screen", controls });
  }

  routes.sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file));
  return { routes, findings };
}

function collectNetworkDrift() {
  const files = walk(SRC_DIR);
  const allowed = new Set([
    "src/api/apiRequest.ts",
    "src/api/client.ts",
    "src/api/client.js",
    "src/api/uriToBlob.ts"
  ]);
  const findings = [];

  for (const abs of files) {
    const file = rel(abs);
    if (allowed.has(file)) continue;
    const source = read(abs);
    const patterns = [
      { check: "direct fetch", regex: /\bfetch\s*\(/g },
      { check: "direct axios", regex: /\baxios\b/g },
      { check: "direct XMLHttpRequest", regex: /\bXMLHttpRequest\b/g }
    ];
    for (const { check, regex } of patterns) {
      let match = null;
      while ((match = regex.exec(source)) !== null) {
        findings.push({
          severity: "error",
          check,
          file,
          line: lineNumber(source, match.index),
          message: "Network calls should go through the frontend API layer."
        });
      }
    }
  }

  return findings;
}

function collectBackendRoutes() {
  const files = walk(path.join(BACKEND_DIR, "routes"));
  const routes = [];
  const findings = [];
  const routeRegex =
    /\b(?:router|app)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;

  for (const abs of files.filter((f) => !/\.test\.[cm]?[jt]s$/i.test(f))) {
    const file = rel(abs);
    const source = read(abs);
    let match = null;
    let count = 0;
    while ((match = routeRegex.exec(source)) !== null) {
      count += 1;
      routes.push({
        file,
        method: match[1].toUpperCase(),
        path: match[2],
        line: lineNumber(source, match.index)
      });
    }

    if (count === 0) {
      findings.push({
        severity: "warning",
        check: "backend route declarations",
        file,
        message: "No Express route declarations were detected in this route file."
      });
    }

    const testCandidate = abs.replace(/\.[cm]?js$/i, ".test.js");
    if (!fs.existsSync(testCandidate)) {
      findings.push({
        severity: "warning",
        check: "backend route test coverage",
        file,
        message: "No sibling backend route test file was found."
      });
    }
  }

  routes.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return { routes, findings };
}

function collectReleaseReadiness() {
  const pkg = JSON.parse(read(path.join(ROOT, "package.json")));
  const findings = [];
  for (const script of RELEASE_SCRIPTS) {
    if (!pkg.scripts?.[script]) {
      findings.push({
        severity: "error",
        check: "release script availability",
        file: "package.json",
        message: `Missing package script: ${script}`
      });
    }
  }
  return findings;
}

function writeReport(report) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "full-surface-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  const bySeverity = report.findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    "# Full Surface Audit",
    "",
    "## Summary",
    `- frontend route files: ${report.summary.frontendRouteFiles}`,
    `- frontend routes: ${report.summary.frontendRoutes}`,
    `- backend route declarations: ${report.summary.backendRoutes}`,
    `- errors: ${bySeverity.error || 0}`,
    `- warnings: ${bySeverity.warning || 0}`,
    "",
    "## Findings"
  ];

  if (report.findings.length === 0) {
    lines.push("- none");
  } else {
    for (const finding of report.findings) {
      const loc = [finding.file, finding.line].filter(Boolean).join(":");
      lines.push(
        `- ${finding.severity.toUpperCase()} ${finding.check} (${loc}): ${finding.message}`
      );
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "full-surface-audit.md"),
    `${lines.join("\n")}\n`,
    "utf8"
  );
}

function main() {
  const frontend = collectFrontendRoutes();
  const networkFindings = collectNetworkDrift();
  const backend = collectBackendRoutes();
  const releaseFindings = collectReleaseReadiness();
  const findings = [
    ...frontend.findings,
    ...networkFindings,
    ...backend.findings,
    ...releaseFindings
  ].sort((a, b) => {
    const severityRank = { error: 0, warning: 1 };
    return (
      (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) ||
      String(a.file).localeCompare(String(b.file)) ||
      String(a.check).localeCompare(String(b.check))
    );
  });

  const routeSet = new Set(frontend.routes.map((row) => row.route));
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      frontendRouteFiles: frontend.routes.length,
      frontendRoutes: routeSet.size,
      backendRoutes: backend.routes.length,
      errors: findings.filter((finding) => finding.severity === "error").length,
      warnings: findings.filter((finding) => finding.severity === "warning").length
    },
    frontendRoutes: frontend.routes,
    backendRoutes: backend.routes,
    findings
  };

  writeReport(report);

  console.log("Full surface audit");
  console.log(`Frontend route files: ${report.summary.frontendRouteFiles}`);
  console.log(`Frontend routes: ${report.summary.frontendRoutes}`);
  console.log(`Backend route declarations: ${report.summary.backendRoutes}`);
  console.log(`Errors: ${report.summary.errors}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log("Wrote tmp/scan/full-surface-audit.md");
  console.log("Wrote tmp/scan/full-surface-audit.json");

  if (report.summary.errors > 0) process.exit(1);
}

main();
