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
      calculatorVersion: "vpd-3",
      status: "completed",
      formulas: ["svp = ..."],
      linkedTaskIds: ["task-1"],
      immutableSnapshot: {
        schemaVersion: 2,
        calculatorVersion: "vpd-3",
        inputs: { rh: 60 },
        outputs: { vpdKpa: 1.2 }
      }
    });

    expect(run.inputs).toEqual({ rh: 60 });
    expect(run.input).toBe(run.inputs);
    expect(run.params).toBe(run.inputs);
    expect(run.outputs).toEqual({ vpdKpa: 1.2 });
    expect(run.output).toBe(run.outputs);
    expect(run.result).toBe(run.outputs);
    expect(run.schemaVersion).toBe(2);
    expect(run.calculatorVersion).toBe("vpd-3");
    expect(run.status).toBe("completed");
    expect(run.formulas).toEqual(["svp = ..."]);
    expect(run.linkedTaskIds).toEqual(["task-1"]);
    expect(run.immutableSnapshot).toMatchObject({
      schemaVersion: 2,
      calculatorVersion: "vpd-3"
    });
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
    expect(run.status).toBe("completed");
    expect(run.linkedTaskIds).toEqual([]);
    expect(run.immutableSnapshot).toMatchObject({
      toolName: "watering",
      inputs: { potLiters: 11 },
      outputs: { targetLiters: 2.66 }
    });
  });

  it("preserves plant and crop context in normalized runs and snapshot fallback", () => {
    const run = normalizeToolRun({
      _id: "run-crop-1",
      growId: "grow-1",
      plantId: "plant-1",
      cropProfileId: "crop-blueberry-1",
      toolName: "vpd",
      inputs: { stage: "fruiting" },
      outputs: { status: "high" },
      cropIdentity: {
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum"
      },
      selectedPlantContext: {
        id: "plant-1",
        name: "North row blueberry",
        cropProfileId: "crop-blueberry-1",
        growthProfile: {
          phenoLabel: "early-fruiting"
        }
      }
    });

    expect(run.plantId).toBe("plant-1");
    expect(run.cropProfileId).toBe("crop-blueberry-1");
    expect(run.cropIdentity).toMatchObject({
      scientificName: "Vaccinium corymbosum"
    });
    expect(run.selectedPlantContext).toMatchObject({
      name: "North row blueberry"
    });
    expect(run.plantGrowthProfile).toMatchObject({
      phenoLabel: "early-fruiting"
    });
    expect(run.immutableSnapshot).toMatchObject({
      plantId: "plant-1",
      cropProfileId: "crop-blueberry-1",
      selectedPlantContext: {
        name: "North row blueberry"
      },
      plantGrowthProfile: {
        phenoLabel: "early-fruiting"
      }
    });
  });
});
