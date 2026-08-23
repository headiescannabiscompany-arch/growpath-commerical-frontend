import { timelineSummaryForExport } from "../../src/utils/exportVisualTimeline";

describe("timelineSummaryForExport", () => {
  it("keeps ordinary viewer-friendly notes unchanged", () => {
    expect(
      timelineSummaryForExport("Lower leaves improved after the irrigation check.")
    ).toBe("Lower leaves improved after the irrigation check.");
  });

  it("replaces a retained machine payload with a private-record handoff", () => {
    const result = timelineSummaryForExport(
      'Tool: harvest_readiness\n\n{"readinessStatus":"review","evidenceFingerprint":"private-digest"}'
    );

    expect(result).toBe(
      "Tool: harvest_readiness. Detailed evidence remains in the private GrowPath record."
    );
    expect(result).not.toContain("evidenceFingerprint");
    expect(result).not.toContain("private-digest");
  });

  it("bounds oversized prose without pretending the private detail was deleted", () => {
    const result = timelineSummaryForExport("a".repeat(900));

    expect(result.length).toBeLessThan(780);
    expect(result).toContain("Full details remain in the private GrowPath record.");
  });
});
