const test = require("node:test");
const assert = require("node:assert/strict");
const { classify } = require("../../scripts/audit-production-dependencies.cjs");

const report = (vulnerabilities = {}) => ({
  auditReportVersion: 2,
  vulnerabilities,
  metadata: {
    vulnerabilities: {
      ...Object.fromEntries(
        ["info", "low", "moderate", "high", "critical"].map((severity) => [
          severity,
          Object.values(vulnerabilities).filter((value) => value.severity === severity)
            .length
        ])
      ),
      total: Object.keys(vulnerabilities).length
    }
  }
});

test("an explicit successful empty audit has no blockers", () => {
  assert.deepEqual(classify(report()), []);
});

test("all high and critical findings block, including the former image-size exception", () => {
  const vulnerabilities = {
    "image-size": { severity: "high" },
    expo: { severity: "high" },
    "node-forge": { severity: "critical" },
    braces: { severity: "high" },
    minor: { severity: "moderate" }
  };
  assert.deepEqual(
    classify(report(vulnerabilities)).map(([name]) => name),
    ["image-size", "expo", "node-forge", "braces"]
  );
});

test("failed, empty, malformed and unsupported reports cannot masquerade as a pass", () => {
  for (const input of [
    null,
    {},
    { error: { code: "E503" } },
    { ...report(), error: { code: "E403" } },
    { ...report(), auditReportVersion: 1 },
    { ...report(), metadata: undefined },
    { ...report(), metadata: { vulnerabilities: {} } },
    {
      ...report(),
      metadata: { vulnerabilities: { ...report().metadata.vulnerabilities, high: 1 } }
    },
    ...[undefined, -1, 1, "0"].map((total) => ({
      ...report(),
      metadata: { vulnerabilities: { ...report().metadata.vulnerabilities, total } }
    })),
    { ...report(), vulnerabilities: [] },
    report({ mystery: { severity: "unknown" } })
  ]) {
    assert.throws(() => classify(input));
  }
});
