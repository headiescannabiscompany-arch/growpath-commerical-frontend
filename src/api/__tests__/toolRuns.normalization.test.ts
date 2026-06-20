import { normalizeToolRun } from "../toolRuns";

describe("normalizeToolRun", () => {
  it("prefers canonical plural fields and exposes compatibility aliases", () => {
    const run = normalizeToolRun({
      id: "run-1",
      toolType: "vpd",
      inputs: { rh: 60 },
      input: { rh: 55 },
      outputs: { vpdKpa: 1.2 },
      output: { vpdKpa: 1.1 },
      schemaVersion: 2,
      calculatorVersion: "vpd-3"
    });

    expect(run.inputs).toEqual({ rh: 60 });
    expect(run.input).toBe(run.inputs);
    expect(run.params).toBe(run.inputs);
    expect(run.outputs).toEqual({ vpdKpa: 1.2 });
    expect(run.output).toBe(run.outputs);
    expect(run.result).toBe(run.outputs);
    expect(run.schemaVersion).toBe(2);
    expect(run.calculatorVersion).toBe("vpd-3");
  });

  it("normalizes legacy params and result records", () => {
    const run = normalizeToolRun({
      _id: "legacy-1",
      toolName: "watering",
      params: { potLiters: 11 },
      result: { targetLiters: 2.66 }
    });

    expect(run.id).toBe("legacy-1");
    expect(run.toolType).toBe("watering");
    expect(run.inputs).toEqual({ potLiters: 11 });
    expect(run.outputs).toEqual({ targetLiters: 2.66 });
    expect(run.schemaVersion).toBe(1);
    expect(run.calculatorVersion).toBe("legacy");
  });
});
