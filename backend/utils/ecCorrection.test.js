"use strict";

const { computeEcCorrection } = require("./ecCorrection");

describe("computeEcCorrection", () => {
  test("no_change within tolerance", () => {
    const r = computeEcCorrection({
      currentEC: 1.81,
      targetEC: 1.8,
      tolerance: 0.05
    });
    expect(r.action).toBe("no_change");
    expect(r.confidence).toBe("high");
  });

  test("dilute with reservoir volume", () => {
    const r = computeEcCorrection({
      currentEC: 2.3,
      targetEC: 1.8,
      reservoirVolumeL: 40
    });
    expect(r.action).toBe("dilute");
    expect(r.waterAddL).toBe(11.111);
    expect(r.finalVolumeL).toBe(51.111);
    expect(r.confidence).toBe("high");
  });

  test("dilute ratio-only when no volume", () => {
    const r = computeEcCorrection({ currentEC: 2.0, targetEC: 1.0 });
    expect(r.action).toBe("dilute");
    expect(r.fractionToKeep).toBe(0.5);
    expect(r.confidence).toBe("medium");
  });

  test("increase using ecPerMlPerL with volume", () => {
    const r = computeEcCorrection({
      currentEC: 1.0,
      targetEC: 1.5,
      reservoirVolumeL: 40,
      ecPerMlPerL: 0.1
    });
    expect(r.action).toBe("increase");
    expect(r.mlPerL).toBe(5);
    expect(r.totalMl).toBe(200);
    expect(r.confidence).toBe("high");
  });

  test("increase missing calibration => low confidence", () => {
    const r = computeEcCorrection({ currentEC: 1.0, targetEC: 1.5 });
    expect(r.action).toBe("increase");
    expect(r.confidence).toBe("low");
    expect(r.assumptions.join(" ")).toMatch(/No calibration coefficient/i);
  });
});
