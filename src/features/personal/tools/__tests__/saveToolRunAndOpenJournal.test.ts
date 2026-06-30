import { createToolRun } from "@/api/toolRuns";

import { saveToolRunAndOpenJournal } from "../saveToolRunAndOpenJournal";

jest.mock("@/api/toolRuns", () => ({
  createToolRun: jest.fn()
}));

const mockedCreateToolRun = createToolRun as jest.MockedFunction<typeof createToolRun>;

describe("saveToolRunAndOpenJournal", () => {
  beforeEach(() => {
    mockedCreateToolRun.mockReset();
  });

  it("reuses an existing tool run instead of creating a duplicate", async () => {
    const router = { push: jest.fn() };

    const result = await saveToolRunAndOpenJournal({
      router,
      growId: "grow 1",
      toolKey: "vpd",
      toolRunId: "run/1",
      input: { rh: 60 },
      output: { vpdKpa: 1.2 }
    });

    expect(result).toEqual({ ok: true, toolRunId: "run/1" });
    expect(mockedCreateToolRun).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith(
      "/home/personal/logs/new?growId=grow%201&toolRunId=run%2F1"
    );
  });

  it("creates a tool run when no existing run is supplied", async () => {
    mockedCreateToolRun.mockResolvedValue({ _id: "created-run" });
    const router = { push: jest.fn() };

    const result = await saveToolRunAndOpenJournal({
      router,
      growId: "grow-1",
      plantId: "plant-1",
      cropProfileId: "crop-blueberry-1",
      selectedPlantContext: {
        id: "plant-1",
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum"
      },
      plantGrowthProfile: {
        phenoLabel: "early fruiting"
      },
      toolKey: "ppfd",
      input: { dliTarget: 35 },
      output: { requiredPpfd: 810 }
    });

    expect(result).toEqual({ ok: true, toolRunId: "created-run" });
    expect(mockedCreateToolRun).toHaveBeenCalledWith({
      toolType: "ppfd",
      growId: "grow-1",
      plantId: "plant-1",
      cropProfileId: "crop-blueberry-1",
      cropIdentity: undefined,
      selectedPlantContext: {
        id: "plant-1",
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum"
      },
      plantGrowthProfile: {
        phenoLabel: "early fruiting"
      },
      input: { dliTarget: 35 },
      output: { requiredPpfd: 810 }
    });
  });
});
