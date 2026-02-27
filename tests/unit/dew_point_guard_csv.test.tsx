import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DewPointGuard from "@/app/home/personal/(tabs)/tools/dew-point-guard";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "g1" }),
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
  saveToolRunAndOpenJournal: jest.fn(async () => ({ ok: true, toolRunId: "tr1" }))
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

    mockBulkIngestTelemetryPoints.mockResolvedValue({ ingested: 2, updated: 0, skipped: 0 });
    mockPullPulseWindow.mockResolvedValue({ sourceId: "s-upload", pulled: 0, updated: 0, startIso: "", endIso: "" });
    mockVerifyPulseApiKey.mockResolvedValue({ ok: true });
    mockListPulseDevices.mockResolvedValue([]);
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
      "2026-02-27T05:10:00.000Z,69,62\n";

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
    expect(call.points).toHaveLength(2);
    expect(call.points[0].ts).toBe("2026-02-27T05:00:00.000Z");
    expect(call.points[0].rh).toBe(60);
    expect(Math.abs(call.points[0].airTempC - 21.1111)).toBeLessThan(0.02);

    await waitFor(() => expect(mockGetTelemetryPoints).toHaveBeenCalled());
  });
});

