import fs from "fs";
import path from "path";
import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DewPointGuard, {
  createDewPointGuardStyles
} from "@/app/home/personal/(tabs)/tools/dew-point-guard";
import { getThemePalette } from "@/theme/appTheme";

jest.setTimeout(20000);

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
const mockGetDocumentAsync = jest.fn();
const mockReadAsStringAsync = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "g1", plantId: "plant-blueberry-1" }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockGetDocumentAsync(...args)
}));

jest.mock("expo-file-system/legacy", () => ({
  readAsStringAsync: (...args: any[]) => mockReadAsStringAsync(...args)
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndOpenJournal: (...args: any[]) =>
    mockSaveToolRunAndOpenJournal.apply(null, args),
  saveToolRunAndCreateTask: (...args: any[]) =>
    mockSaveToolRunAndCreateTask.apply(null, args)
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args: any[]) => mockListPersonalPlants(...args)
}));

const mockListTelemetrySources = jest.fn();
const mockGetTelemetryPoints = jest.fn();
const mockBulkIngestTelemetryPoints = jest.fn();
const mockPullPulseWindow = jest.fn();
const mockCreateTelemetrySource = jest.fn();
const mockDeleteTelemetrySource = jest.fn();
const mockVerifyPulseApiKey = jest.fn();
const mockListPulseDevices = jest.fn();

jest.mock("@/api/telemetry", () => ({
  listTelemetrySources: (...args: any[]) => mockListTelemetrySources(...args),
  getTelemetryPoints: (...args: any[]) => mockGetTelemetryPoints(...args),
  bulkIngestTelemetryPoints: (...args: any[]) => mockBulkIngestTelemetryPoints(...args),
  pullPulseWindow: (...args: any[]) => mockPullPulseWindow(...args),
  createTelemetrySource: (...args: any[]) => mockCreateTelemetrySource(...args),
  deleteTelemetrySource: (...args: any[]) => mockDeleteTelemetrySource(...args),
  verifyPulseApiKey: (...args: any[]) => mockVerifyPulseApiKey(...args),
  listPulseDevices: (...args: any[]) => mockListPulseDevices(...args)
}));

describe("Dew Point Guard CSV flow", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetDocumentAsync.mockResolvedValue({ canceled: true });
    mockReadAsStringAsync.mockResolvedValue("");
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
        workspaceType: "personal",
        config: {
          provider: "generic",
          workspaceType: "personal",
          importReview: {
            provider: "generic",
            growId: "g1",
            workspaceType: "personal",
            roomId: null,
            roomName: "Tent 1",
            timezone: "America/New_York"
          }
        }
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
    mockCreateTelemetrySource.mockImplementation(async (input: any) => ({
      id: input.type === "pulse" ? "s-pulse" : "s-upload-created",
      isActive: true,
      ...input
    }));
    mockDeleteTelemetrySource.mockResolvedValue({
      sourceId: "s-upload",
      deletedAt: "2026-08-25T18:00:00.000Z",
      deletedPointCount: 119
    });
  });

  async function prepareReviewedGenericCsv(screen: ReturnType<typeof render>) {
    fireEvent.press(screen.getByTestId("dpg-mode-source"));
    fireEvent.press(screen.getByTestId("dpg-load-sources"));
    await waitFor(() => expect(mockListTelemetrySources).toHaveBeenCalled());
    fireEvent.changeText(screen.getByTestId("dpg-source-timezone"), "America/New_York");
    fireEvent.changeText(
      screen.getByTestId("dpg-csv-paste"),
      [
        "ts,tempF,rh",
        "2026-02-27T05:00:00.000Z,70,60",
        "2026-02-27T05:10:00.000Z,69,62"
      ].join("\n")
    );
    fireEvent.press(screen.getByTestId("dpg-csv-parse"));
    await waitFor(() => expect(screen.getByTestId("dpg-csv-preview-count")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("dpg-csv-room-name"), "Tent 1");
    fireEvent.press(screen.getByTestId("dpg-confirm-csv-review"));
    await waitFor(() =>
      expect(screen.getByTestId("dpg-csv-review-confirmed")).toBeTruthy()
    );
    await waitFor(() => expect(screen.getByTestId("dpg-csv-ingest")).not.toBeDisabled());
  }

  it("themes every Dew Point Guard surface and input in Night and Day modes", () => {
    const nightPalette = getThemePalette("night", "dark");
    const dayPalette = getThemePalette("day", "light");
    const nightStyles = createDewPointGuardStyles(nightPalette);
    const dayStyles = createDewPointGuardStyles(dayPalette);

    expect(nightStyles.screen.backgroundColor).toBe(nightPalette.page);
    expect(nightStyles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(nightStyles.panel).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(nightStyles.chip.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.chipActive.backgroundColor).toBe(nightPalette.accent);
    expect(nightStyles.chipTextActive.color).toBe(nightPalette.accentText);
    expect(nightStyles.primaryButton.backgroundColor).toBe(nightPalette.accent);
    expect(nightStyles.primaryButtonText.color).toBe(nightPalette.accentText);
    expect(nightStyles.secondaryButton.backgroundColor).toBe(nightPalette.surface);
    expect(nightStyles.secondaryButtonText.color).toBe(nightPalette.link);
    expect(nightStyles.selectCardActive.backgroundColor).toBe(nightPalette.accentSoft);
    expect(nightStyles.summaryPanel.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(nightStyles.successText.color).toBe(nightPalette.success);
    expect(nightStyles.warningText.color).toBe(nightPalette.warning);
    expect(nightStyles.errorText.color).toBe(nightPalette.danger);

    expect(dayStyles.screen.backgroundColor).toBe(dayPalette.page);
    expect(dayStyles.input.backgroundColor).toBe(dayPalette.surface);
    expect(dayStyles.sectionTitle.color).toBe(dayPalette.text);
    expect(dayStyles.mutedText.color).toBe(dayPalette.textMuted);
    expect(dayStyles.primaryButton.backgroundColor).toBe(dayPalette.accent);
  });

  it("keeps every Dew Point Guard input and source color palette-aware", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/home/personal/(tabs)/tools/dew-point-guard.tsx"),
      "utf8"
    );
    const inputs = source.match(/<TextInput\b/g) || [];

    expect(inputs).toHaveLength(4);
    expect(source.match(/placeholderTextColor={palette\.textMuted}/g) || []).toHaveLength(
      inputs.length
    );
    expect(source.match(/selectionColor={palette\.accent}/g) || []).toHaveLength(
      inputs.length
    );
    expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\b(?:white|black)\b/i);
  });

  it("requires confirmation and removes the selected source with its imported history", async () => {
    const screen = render(<DewPointGuard />);
    fireEvent.press(screen.getByTestId("dpg-mode-source"));
    fireEvent.press(screen.getByTestId("dpg-load-sources"));
    await waitFor(() => expect(screen.getByTestId("dpg-source-s-upload")).toBeTruthy());

    fireEvent.press(screen.getByTestId("dpg-remove-selected-source"));
    expect(mockDeleteTelemetrySource).not.toHaveBeenCalled();
    expect(screen.getByTestId("dpg-remove-source-confirmation")).toBeTruthy();
    fireEvent.press(screen.getByTestId("dpg-confirm-remove-source"));

    await waitFor(() =>
      expect(mockDeleteTelemetrySource).toHaveBeenCalledWith("s-upload")
    );
    await waitFor(() => expect(screen.queryByTestId("dpg-source-s-upload")).toBeNull());
  });

  it("can cancel source removal without deleting data", async () => {
    const screen = render(<DewPointGuard />);
    fireEvent.press(screen.getByTestId("dpg-mode-source"));
    fireEvent.press(screen.getByTestId("dpg-load-sources"));
    await waitFor(() => expect(screen.getByTestId("dpg-source-s-upload")).toBeTruthy());

    fireEvent.press(screen.getByTestId("dpg-remove-selected-source"));
    fireEvent.press(screen.getByTestId("dpg-cancel-remove-source"));

    expect(mockDeleteTelemetrySource).not.toHaveBeenCalled();
    expect(screen.queryByTestId("dpg-remove-source-confirmation")).toBeNull();
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

    fireEvent.changeText(getByTestId("dpg-source-timezone"), "America/New_York");
    fireEvent.changeText(getByTestId("dpg-csv-room-name"), "Tent 1");
    fireEvent.press(getByTestId("dpg-confirm-csv-review"));
    await waitFor(() => expect(getByTestId("dpg-csv-review-confirmed")).toBeTruthy());
    await waitFor(() => expect(getByTestId("dpg-csv-ingest")).not.toBeDisabled());

    fireEvent.press(getByTestId("dpg-csv-ingest"));
    await waitFor(() => expect(mockBulkIngestTelemetryPoints).toHaveBeenCalled());

    const call = mockBulkIngestTelemetryPoints.mock.calls[0][0];
    expect(call.sourceId).toBe("s-upload");
    expect(call.points).toHaveLength(3);
    expect(call.points[0].ts).toBe("2026-02-27T05:00:00.000Z");
    expect(call.points[0].rh).toBe(60);
    expect(Math.abs(call.points[0].airTempC - 21.1111)).toBeLessThan(0.02);
    expect(call.points[2].ts).toBe("2026-02-27T10:20:00.000Z");

    await waitFor(() => expect(mockGetTelemetryPoints).toHaveBeenCalled());
  });

  it("reads a native document URI through Expo FileSystem without retaining the URI", async () => {
    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: "content://document/provider/private-history.csv",
          name: "controller-history.csv",
          size: 88,
          mimeType: "text/csv"
        }
      ]
    });
    mockReadAsStringAsync.mockResolvedValueOnce(
      "timestamp,tempF,rh\n2026-02-27T05:00:00.000Z,70,60"
    );
    const screen = render(<DewPointGuard />);
    fireEvent.press(screen.getByTestId("dpg-mode-source"));
    fireEvent.press(screen.getByTestId("dpg-pick-csv"));

    await waitFor(() =>
      expect(mockReadAsStringAsync).toHaveBeenCalledWith(
        "content://document/provider/private-history.csv"
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId("dpg-csv-review-file").props.children.join("")).toContain(
        "controller-history.csv"
      )
    );
    expect(screen.queryByText(/content:\/\/document\/provider/)).toBeNull();

    fireEvent.changeText(screen.getByTestId("dpg-source-timezone"), "America/New_York");
    fireEvent.changeText(screen.getByTestId("dpg-csv-room-name"), "Greenhouse A");
    fireEvent.press(screen.getByTestId("dpg-confirm-csv-review"));
    await waitFor(() =>
      expect(screen.getByTestId("dpg-csv-review-confirmed")).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId("dpg-create-source-from-csv"));
    await waitFor(() => expect(mockCreateTelemetrySource).toHaveBeenCalled());
    const createInput = mockCreateTelemetrySource.mock.calls[0][0];
    expect(createInput.config.sourceFileIdentity).toMatchObject({
      name: "controller-history.csv",
      mimeType: "text/csv",
      uriScheme: "content"
    });
    expect(JSON.stringify(createInput)).not.toContain("content://document/provider");
  });

  it("passes explicit Facility workspace scope when loading history sources", async () => {
    const screen = render(
      <DewPointGuard
        historyImportMode
        workspaceType="facility"
        facilityId="facility-1"
        growLabel="Flower Cycle 12"
        initialRoomName="Flower A"
      />
    );
    fireEvent.press(screen.getByTestId("dpg-load-sources"));

    await waitFor(() =>
      expect(mockListTelemetrySources).toHaveBeenCalledWith("g1", {
        workspaceType: "facility",
        facilityId: "facility-1",
        targetType: "grow"
      })
    );
  });

  it("blocks an AC Infinity file from an unrelated generic upload source", async () => {
    const screen = render(<DewPointGuard />);
    fireEvent.press(screen.getByTestId("dpg-mode-source"));
    fireEvent.press(screen.getByTestId("dpg-load-sources"));
    await waitFor(() => expect(mockListTelemetrySources).toHaveBeenCalled());
    fireEvent.changeText(screen.getByTestId("dpg-source-timezone"), "America/New_York");
    fireEvent.changeText(
      screen.getByTestId("dpg-csv-paste"),
      [
        '"Device ID","Test Controller","",""',
        '"Sample Frequency","10 MIN","",""',
        '"Start Time","03/18/2026 1:28:00 AM","",""',
        '"End Time","03/18/2026 1:38:00 AM","",""',
        '"Temperature Units","°F","",""',
        '"Time","Inside Temperature","Inside Relative Humidity"',
        '"03/18/2026 1:28 AM","64.7","41.2"'
      ].join("\n")
    );
    fireEvent.press(screen.getByTestId("dpg-csv-parse"));
    await waitFor(() => expect(screen.getByTestId("dpg-csv-preview-count")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("dpg-csv-room-name"), "Tent 1");
    fireEvent.press(screen.getByTestId("dpg-confirm-csv-review"));
    await waitFor(() =>
      expect(screen.getByTestId("dpg-csv-review-confirmed")).toBeTruthy()
    );

    expect(screen.getByTestId("dpg-csv-source-mismatch")).toBeTruthy();
    expect(screen.getByTestId("dpg-csv-ingest")).toBeDisabled();
    fireEvent.press(screen.getByTestId("dpg-csv-ingest"));
    expect(mockBulkIngestTelemetryPoints).not.toHaveBeenCalled();
  });

  it("rejects an invalid source timezone during review", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const screen = render(<DewPointGuard />);
    fireEvent.press(screen.getByTestId("dpg-mode-source"));
    fireEvent.changeText(
      screen.getByTestId("dpg-csv-paste"),
      "timestamp,tempF,rh\n2026-02-27T05:00:00.000Z,70,60"
    );
    fireEvent.press(screen.getByTestId("dpg-csv-parse"));
    await waitFor(() => expect(screen.getByTestId("dpg-csv-preview-count")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("dpg-csv-room-name"), "Tent 1");
    fireEvent.changeText(screen.getByTestId("dpg-source-timezone"), "Moon/Sea");
    fireEvent.press(screen.getByTestId("dpg-confirm-csv-review"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Timezone not recognized",
      expect.stringContaining("IANA timezone")
    );
    expect(screen.queryByTestId("dpg-csv-review-confirmed")).toBeNull();
    expect(screen.getByTestId("dpg-csv-ingest")).toBeDisabled();
  });

  it("re-imports matching timestamps through duplicate-safe upsert", async () => {
    const screen = render(<DewPointGuard />);
    await prepareReviewedGenericCsv(screen);

    fireEvent.press(screen.getByTestId("dpg-csv-ingest"));
    await waitFor(() => expect(mockBulkIngestTelemetryPoints).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("dpg-csv-ingest")).not.toBeDisabled());
    fireEvent.press(screen.getByTestId("dpg-csv-ingest"));
    await waitFor(() => expect(mockBulkIngestTelemetryPoints).toHaveBeenCalledTimes(2));

    const [first, second] = mockBulkIngestTelemetryPoints.mock.calls.map(
      ([input]) => input
    );
    expect(first.mode).toBe("upsert");
    expect(second.mode).toBe("upsert");
    expect(second.sourceId).toBe(first.sourceId);
    expect(second.points.map((point: any) => point.ts)).toEqual(
      first.points.map((point: any) => point.ts)
    );
    expect(mockCreateTelemetrySource).not.toHaveBeenCalled();
  });

  it("detects an AC Infinity export, creates a sanitized source, and preserves optional channels", async () => {
    mockListTelemetrySources.mockResolvedValueOnce([]);
    const screen = render(<DewPointGuard />);
    fireEvent.press(screen.getByTestId("dpg-mode-source"));
    fireEvent.press(screen.getByTestId("dpg-load-sources"));
    await waitFor(() => expect(mockListTelemetrySources).toHaveBeenCalled());
    fireEvent.changeText(screen.getByTestId("dpg-source-timezone"), "America/New_York");

    const csv = [
      '"Device ID","Test Controller","",""',
      '"Sample Frequency","24 HRS","",""',
      '"Start Time","03/18/2026 1:28:00 AM","",""',
      '"End Time","03/19/2026 1:28:00 AM","",""',
      '"Temperature Units","°F","",""',
      '"Time","CO₂ (Sensor 1)","LIGHT (Sensor 1)","Inside Temperature","Inside Relative Humidity","Inside VPD","Outside Temperature","Outside Relative Humidity"',
      '"03/18/2026 1:28 AM","606","2.5","64.7","41.2","1.22","69.9","30.6"',
      '"03/19/2026 1:28 AM","620","3.0","65.1","42.0","1.20","70.1","31.2"'
    ].join("\n");
    fireEvent.changeText(screen.getByTestId("dpg-csv-paste"), csv);
    fireEvent.press(screen.getByTestId("dpg-csv-parse"));

    expect(screen.getByTestId("dpg-csv-import-summary").props.children).toContain(
      "AC Infinity export detected"
    );
    expect(screen.getByTestId("dpg-csv-warning").props.children).toContain(
      "one sample per day"
    );
    fireEvent.changeText(screen.getByTestId("dpg-csv-room-name"), "Flower A");
    fireEvent.press(screen.getByTestId("dpg-csv-light-controller-state"));
    expect(screen.getByTestId("dpg-csv-light-state-note").props.children).toBeTruthy();
    fireEvent.press(screen.getByTestId("dpg-confirm-csv-review"));
    await waitFor(() =>
      expect(screen.getByTestId("dpg-csv-review-confirmed")).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId("dpg-create-source-from-csv"));
    await waitFor(() => expect(mockCreateTelemetrySource).toHaveBeenCalled());
    expect(mockCreateTelemetrySource).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "g1",
        type: "upload",
        name: "AC Infinity CSV History",
        timezone: "America/New_York",
        workspaceType: "personal",
        targetType: "grow",
        config: expect.objectContaining({
          provider: "ac_infinity",
          importMode: "csv",
          temperatureUnit: "F",
          importReview: expect.objectContaining({
            provider: "ac_infinity",
            growId: "g1",
            roomName: "Flower A",
            workspaceType: "personal",
            timezone: "America/New_York",
            lightingColumnMeaning: "controller_state"
          }),
          columns: expect.arrayContaining([
            "Inside Temperature",
            "Inside Relative Humidity"
          ])
        })
      })
    );

    await waitFor(() =>
      expect(screen.queryByTestId("dpg-csv-source-mismatch")).toBeNull()
    );
    await waitFor(() => expect(screen.getByTestId("dpg-csv-ingest")).not.toBeDisabled());

    fireEvent.press(screen.getByTestId("dpg-csv-ingest"));
    await waitFor(() => expect(mockBulkIngestTelemetryPoints).toHaveBeenCalled());
    expect(mockBulkIngestTelemetryPoints.mock.calls[0][0].points[0]).toEqual(
      expect.objectContaining({
        ts: "2026-03-18T05:28:00.000Z",
        rh: 41.2,
        vpdKpa: 1.22,
        co2Ppm: 606,
        lightValue: 2.5,
        lightUnit: "controller_reported_lighting_state"
      })
    );
  });

  it("verifies Pulse credentials, loads devices, and creates a Pulse telemetry source", async () => {
    mockListPulseDevices.mockResolvedValue([
      { id: "pulse-1", name: "Flower Room", model: "Pulse Pro" }
    ]);

    const { getByTestId, getByText } = render(<DewPointGuard />);

    fireEvent.press(getByTestId("dpg-mode-source"));
    fireEvent.changeText(getByTestId("dpg-pulse-api-key"), "PULSE-SECRET");
    expect(getByTestId("dpg-pulse-api-key").props.accessibilityLabel).toBe(
      "Pulse API key"
    );
    expect(getByTestId("dpg-pulse-api-key").props.secureTextEntry).toBe(true);
    fireEvent.press(getByTestId("dpg-pulse-verify-devices"));

    await waitFor(() =>
      expect(mockVerifyPulseApiKey).toHaveBeenCalledWith({
        workspaceType: "personal",
        apiKey: "PULSE-SECRET"
      })
    );
    await waitFor(() =>
      expect(mockListPulseDevices).toHaveBeenCalledWith({
        workspaceType: "personal",
        apiKey: "PULSE-SECRET"
      })
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
        workspaceType: "personal",
        targetType: "grow",
        config: {
          pulse: {
            apiKey: "PULSE-SECRET",
            deviceId: "pulse-1",
            accountStructure: expect.objectContaining({
              provider: "pulse",
              permissionLevel: "read-only",
              detectedRooms: 1,
              detectedDevices: 1,
              detectedStreams: 4,
              rooms: [
                expect.objectContaining({
                  name: "Flower Room",
                  type: "environment",
                  devices: ["Flower Room"],
                  metrics: ["air_temperature", "relative_humidity", "dew_point", "vpd"],
                  permissionLevel: "read-only",
                  provider: "pulse"
                })
              ]
            })
          }
        }
      })
    );
    await waitFor(() => expect(getByTestId("dpg-pulse-api-key").props.value).toBe(""));
  });

  it("passes the selected Facility scope when checking Pulse credentials", async () => {
    const { getByTestId } = render(
      <DewPointGuard historyImportMode workspaceType="facility" facilityId="facility-2" />
    );

    fireEvent.changeText(getByTestId("dpg-pulse-api-key"), "FACILITY-PULSE-SECRET");
    fireEvent.press(getByTestId("dpg-pulse-verify-devices"));

    await waitFor(() =>
      expect(mockVerifyPulseApiKey).toHaveBeenCalledWith({
        workspaceType: "facility",
        facilityId: "facility-2",
        apiKey: "FACILITY-PULSE-SECRET"
      })
    );
    await waitFor(() =>
      expect(mockListPulseDevices).toHaveBeenCalledWith({
        workspaceType: "facility",
        facilityId: "facility-2",
        apiKey: "FACILITY-PULSE-SECRET"
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

  it("creates dew point inspection tasks with shared Schedule metadata", async () => {
    const { getByLabelText } = render(<DewPointGuard />);

    await waitFor(() =>
      expect(mockListPersonalPlants).toHaveBeenCalledWith({ growId: "g1" })
    );

    fireEvent.press(getByLabelText("Create Inspection Task"));

    await waitFor(() => expect(mockSaveToolRunAndCreateTask).toHaveBeenCalled());
    expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "g1",
        plantId: "plant-blueberry-1",
        cropProfileId: "crop-blueberry-1",
        toolKey: "dew-point-guard",
        title: "Review dew point risk window",
        priority: "medium",
        allDay: true,
        calendarType: "dew_point_guard_followup",
        sourceStage: "dew_point_window_review",
        reminderPlan: expect.objectContaining({
          channels: ["in_app"],
          reminders: [expect.objectContaining({ offsetMinutes: -720 })]
        }),
        description: expect.stringContaining("Dew Point Guard risk")
      })
    );
  });
});
