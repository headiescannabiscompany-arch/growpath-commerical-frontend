import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DewPointGuard from "@/app/home/personal/(tabs)/tools/dew-point-guard";

const mockSaveToolRunAndOpenJournal = jest.fn(async () => ({
  ok: true,
  toolRunId: "tr1"
}));
const mockSaveToolRunAndCreateTask = jest.fn(async () => ({
  ok: true,
  toolRunId: "tr1",
  taskId: "task-1"
}));
const mockListPersonalPlants = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "g1", plantId: "plant-blueberry-1" }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true }))
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndOpenJournal: (...args: any[]) => mockSaveToolRunAndOpenJournal(...args),
  saveToolRunAndCreateTask: (...args: any[]) => mockSaveToolRunAndCreateTask(...args)
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args: any[]) => mockListPersonalPlants(...args)
}));

const mockListTelemetrySources = jest.fn();
const mockGetTelemetryPoints = jest.fn();
const mockBulkIngestTelemetryPoints = jest.fn();
const mockPullPulseWindow = jest.fn();
const mockCreateTelemetrySource = jest.fn();
const mockVerifyPulseApiKey = jest.fn();
const mockListPulseDevices = jest.fn();

jest.mock("@/api/telemetry", () => ({
  listTelemetrySources: (...args: any[]) => mockListTelemetrySources(...args),
  getTelemetryPoints: (...args: any[]) => mockGetTelemetryPoints(...args),
  bulkIngestTelemetryPoints: (...args: any[]) => mockBulkIngestTelemetryPoints(...args),
  pullPulseWindow: (...args: any[]) => mockPullPulseWindow(...args),
  createTelemetrySource: (...args: any[]) => mockCreateTelemetrySource(...args),
  verifyPulseApiKey: (...args: any[]) => mockVerifyPulseApiKey(...args),
  listPulseDevices: (...args: any[]) => mockListPulseDevices(...args)
}));

describe("Dew Point Guard CSV flow", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSaveToolRunAndOpenJournal.mockResolvedValue({ ok: true, toolRunId: "tr1" });
    mockSaveToolRunAndCreateTask.mockResolvedValue({
      ok: true,
      toolRunId: "tr1",
      taskId: "task-1"
    });
    mockListPersonalPlants.mockResolvedValue([
      {
        id: "plant-blueberry-1",
        growId: "g1",
        name: "Blueberry row A",
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum",
        cultivar: "Duke",
        cropProfileId: "crop-blueberry-1",
        stage: "fruiting",
        medium: "soil",
        growthProfile: {
          phenoLabel: "early-fruiting",
          sizeMetrics: { canopyWidthCm: 120 },
          timingAdjustments: { fruitingDaysOffset: -4 },
          waterUseProfile: { observedDemand: "medium" }
        }
      }
    ]);

    mockListTelemetrySources.mockResolvedValue([
      {
        id: "s-upload",
        growId: "g1",
        type: "upload",
        name: "Upload Telemetry",
        timezone: "America/New_York",
        isActive: true,
        config: {}
      }
    ]);

    mockGetTelemetryPoints.mockResolvedValue({
      sourceId: "s-upload",
      startIso: "2026-02-27T00:00:00.000Z",
      endIso: "2026-02-27T12:00:00.000Z",
      points: []
    });

    mockBulkIngestTelemetryPoints.mockResolvedValue({
      ingested: 3,
      updated: 0,
      skipped: 0
    });
    mockPullPulseWindow.mockResolvedValue({
      sourceId: "s-upload",
      pulled: 0,
      updated: 0,
      startIso: "",
      endIso: ""
    });
    mockVerifyPulseApiKey.mockResolvedValue({ ok: true });
    mockListPulseDevices.mockResolvedValue([]);
    mockCreateTelemetrySource.mockResolvedValue({
      id: "s-pulse",
      growId: "g1",
      type: "pulse",
      name: "Pulse Flower Room",
      timezone: "America/New_York",
      isActive: true,
      config: { pulse: { deviceId: "pulse-1" } }
    });
  });

  it("parses pasted CSV, maps columns, ingests, and refreshes window", async () => {
    const { getByTestId } = render(<DewPointGuard />);

    fireEvent.press(getByTestId("dpg-mode-source"));
    fireEvent.press(getByTestId("dpg-load-sources"));
    await waitFor(() => expect(mockListTelemetrySources).toHaveBeenCalled());

    fireEvent.press(getByTestId("dpg-source-s-upload"));

    const csv =
      "ts,tempF,rh\n" +
      "2026-02-27T05:00:00.000Z,70,60\n" +
      "2026-02-27T05:10:00.000Z,69,62\n" +
      "2026-02-27T05:20:00,68,61\n";

    fireEvent.changeText(getByTestId("dpg-csv-paste"), csv);
    fireEvent.press(getByTestId("dpg-csv-parse"));

    await waitFor(() => expect(getByTestId("dpg-csv-preview-count")).toBeTruthy());

    fireEvent.press(getByTestId("dpg-unit-f"));

    fireEvent.press(getByTestId("dpg-map-ts"));
    fireEvent.press(getByTestId("dpg-col-0"));
    fireEvent.press(getByTestId("dpg-map-temp"));
    fireEvent.press(getByTestId("dpg-col-1"));
    fireEvent.press(getByTestId("dpg-map-rh"));
    fireEvent.press(getByTestId("dpg-col-2"));

    fireEvent.press(getByTestId("dpg-csv-ingest"));
    await waitFor(() => expect(mockBulkIngestTelemetryPoints).toHaveBeenCalled());

    const call = mockBulkIngestTelemetryPoints.mock.calls[0][0];
    expect(call.sourceId).toBe("s-upload");
    expect(call.points).toHaveLength(3);
    expect(call.points[0].ts).toBe("2026-02-27T05:00:00.000Z");
    expect(call.points[0].rh).toBe(60);
    expect(Math.abs(call.points[0].airTempC - 21.1111)).toBeLessThan(0.02);
    expect(call.points[2].ts).toBe("2026-02-27T05:20:00.000Z");

    await waitFor(() => expect(mockGetTelemetryPoints).toHaveBeenCalled());
  });

  it("verifies Pulse credentials, loads devices, and creates a Pulse telemetry source", async () => {
    mockListPulseDevices.mockResolvedValue([
      { id: "pulse-1", name: "Flower Room", model: "Pulse Pro" }
    ]);

    const { getByTestId, getByText } = render(<DewPointGuard />);

    fireEvent.press(getByTestId("dpg-mode-source"));
    fireEvent.changeText(getByTestId("dpg-pulse-api-key"), "PULSE-SECRET");
    fireEvent.press(getByTestId("dpg-pulse-verify-devices"));

    await waitFor(() =>
      expect(mockVerifyPulseApiKey).toHaveBeenCalledWith("PULSE-SECRET")
    );
    await waitFor(() =>
      expect(mockListPulseDevices).toHaveBeenCalledWith("PULSE-SECRET")
    );
    await waitFor(() => expect(getByText("Flower Room")).toBeTruthy());

    fireEvent.press(getByTestId("dpg-pulse-device-pulse-1"));
    fireEvent.press(getByTestId("dpg-create-pulse-source"));

    await waitFor(() =>
      expect(mockCreateTelemetrySource).toHaveBeenCalledWith({
        growId: "g1",
        type: "pulse",
        name: "Pulse Flower Room",
        timezone: "America/New_York",
        config: { pulse: { apiKey: "PULSE-SECRET", deviceId: "pulse-1" } }
      })
    );
  });

  it("saves manual runs with selected plant and crop context", async () => {
    const { getByLabelText } = render(<DewPointGuard />);

    await waitFor(() =>
      expect(mockListPersonalPlants).toHaveBeenCalledWith({ growId: "g1" })
    );

    fireEvent.press(getByLabelText("Save and Open Journal"));

    await waitFor(() => expect(mockSaveToolRunAndOpenJournal).toHaveBeenCalled());
    expect(mockSaveToolRunAndOpenJournal).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "g1",
        plantId: "plant-blueberry-1",
        cropProfileId: "crop-blueberry-1",
        selectedPlantContext: expect.objectContaining({
          cropCommonName: "Blueberry",
          scientificName: "Vaccinium corymbosum",
          growthProfile: expect.objectContaining({
            phenoLabel: "early-fruiting"
          })
        }),
        toolKey: "dew-point-guard"
      })
    );
  });
});
