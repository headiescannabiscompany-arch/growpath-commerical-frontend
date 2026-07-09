import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DataIntegrationsScreen from "@/app/home/personal/(tabs)/tools/integrations";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" })
}));

const mockListIntegrationProviders = jest.fn();
const mockListIntegrationConnections = jest.fn();
const mockCreateIntegrationConnection = jest.fn();
const mockTestIntegrationConnection = jest.fn();
const mockCreateIntegrationAccessRequest = jest.fn();

jest.mock("@/api/integrations", () => ({
  listIntegrationProviders: (...args: any[]) => mockListIntegrationProviders(...args),
  listIntegrationConnections: (...args: any[]) => mockListIntegrationConnections(...args),
  createIntegrationConnection: (...args: any[]) =>
    mockCreateIntegrationConnection(...args),
  testIntegrationConnection: (...args: any[]) => mockTestIntegrationConnection(...args),
  createIntegrationAccessRequest: (...args: any[]) =>
    mockCreateIntegrationAccessRequest(...args)
}));

const mockCreateTelemetrySource = jest.fn();
const mockListGrowlinkControllers = jest.fn();
const mockListTelemetrySources = jest.fn();
const mockPullGrowlinkCurrentReadings = jest.fn();
const mockPullGrowlinkHistoricalWindow = jest.fn();
const mockVerifyGrowlinkCredentials = jest.fn();

jest.mock("@/api/telemetry", () => ({
  createTelemetrySource: (...args: any[]) => mockCreateTelemetrySource(...args),
  listGrowlinkControllers: (...args: any[]) => mockListGrowlinkControllers(...args),
  listTelemetrySources: (...args: any[]) => mockListTelemetrySources(...args),
  pullGrowlinkCurrentReadings: (...args: any[]) =>
    mockPullGrowlinkCurrentReadings(...args),
  pullGrowlinkHistoricalWindow: (...args: any[]) =>
    mockPullGrowlinkHistoricalWindow(...args),
  verifyGrowlinkCredentials: (...args: any[]) => mockVerifyGrowlinkCredentials(...args)
}));

describe("Data Integrations Growlink flow", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    mockListIntegrationProviders.mockResolvedValue([]);
    mockListIntegrationConnections.mockResolvedValue([]);
    mockListTelemetrySources.mockResolvedValue([
      {
        id: "source-existing",
        growId: "grow-1",
        type: "growlink",
        name: "Growlink Existing",
        timezone: "America/Denver",
        isActive: true,
        config: { growlink: { controllerId: "controller-existing" } }
      }
    ]);
    mockVerifyGrowlinkCredentials.mockResolvedValue({ ok: true });
    mockListGrowlinkControllers.mockResolvedValue([
      {
        id: "controller-1",
        name: "Flower A",
        serialNumber: "GL-001",
        timeZoneId: "America/Denver",
        modules: [{ id: "module-1", name: "Flower A Temp/RH" }]
      }
    ]);
    mockCreateTelemetrySource.mockResolvedValue({
      id: "source-new",
      growId: "grow-1",
      type: "growlink",
      name: "Growlink Flower A",
      timezone: "America/Denver",
      isActive: true,
      config: { growlink: { controllerId: "controller-1" } }
    });
    mockPullGrowlinkCurrentReadings.mockResolvedValue({
      sourceId: "source-existing",
      pulled: 4,
      updated: 0
    });
    mockPullGrowlinkHistoricalWindow.mockResolvedValue({
      sourceId: "source-existing",
      pulled: 6,
      ingested: 4,
      updated: 2,
      skipped: 0,
      startIso: "2026-06-22T00:00:00.000Z",
      endIso: "2026-06-22T14:00:00.000Z"
    });
  });

  it("verifies credentials, lists controllers, creates a read-only Growlink source, and pulls readings", async () => {
    const screen = render(<DataIntegrationsScreen />);

    await waitFor(() =>
      expect(screen.getByText("Growlink read-only telemetry")).toBeTruthy()
    );
    await waitFor(() => expect(mockListTelemetrySources).toHaveBeenCalledWith("grow-1"));

    fireEvent.changeText(screen.getByPlaceholderText("Source name"), "Growlink Flower A");
    fireEvent.changeText(
      screen.getByPlaceholderText("Growlink email"),
      "grower@example.com"
    );
    fireEvent.changeText(screen.getByPlaceholderText("Growlink password"), "secret");

    fireEvent.press(screen.getByText("Verify + preview controllers"));

    await waitFor(() =>
      expect(mockVerifyGrowlinkCredentials).toHaveBeenCalledWith({
        userName: "grower@example.com",
        password: "secret"
      })
    );
    await waitFor(() => expect(screen.getByText("Flower A")).toBeTruthy());
    expect(screen.getByText("Room import preview")).toBeTruthy();
    expect(screen.getByText("Suggested room: Flower A")).toBeTruthy();
    expect(screen.getByText(/Permission: read-only \/ Detected rooms: 1/)).toBeTruthy();
    expect(screen.getByText(/air_temperature, relative_humidity/)).toBeTruthy();

    fireEvent.press(screen.getByText("Create read-only source"));

    await waitFor(() =>
      expect(mockCreateTelemetrySource).toHaveBeenCalledWith({
        growId: "grow-1",
        type: "growlink",
        name: "Growlink Flower A",
        timezone: "America/Denver",
        config: {
          growlink: {
            userName: "grower@example.com",
            password: "secret",
            controllerId: "controller-1",
            accountStructure: expect.objectContaining({
              provider: "growlink",
              permissionLevel: "read-only",
              detectedRooms: 1,
              detectedDevices: 1,
              detectedStreams: 2,
              suggestedGrowSpaces: [
                expect.objectContaining({
                  name: "Flower A",
                  type: "flower",
                  source: "growlink_account_structure",
                  provider: "growlink",
                  permissionLevel: "read-only",
                  devices: ["Flower A Temp/RH"],
                  normalizedMetrics: ["air_temperature", "relative_humidity"],
                  sensorStreams: [
                    expect.objectContaining({
                      providerMetricKey: "air_temperature",
                      normalizedMetric: "air_temperature",
                      suggestedRoomName: "Flower A",
                      suggestedDeviceName: "Flower A Temp/RH"
                    }),
                    expect.objectContaining({
                      providerMetricKey: "relative_humidity",
                      normalizedMetric: "relative_humidity",
                      suggestedRoomName: "Flower A",
                      suggestedDeviceName: "Flower A Temp/RH"
                    })
                  ]
                })
              ],
              suggestedAutomationRules: expect.arrayContaining([
                expect.objectContaining({
                  roomName: "Flower A",
                  source: "growlink_account_structure",
                  ruleType: "tool_suggestion",
                  suggestedToolType: "vpd_dew_point_guard",
                  requiredMetrics: ["air_temperature", "relative_humidity"],
                  action: "Use imported room readings in VPD and Dew Point Guard."
                }),
                expect.objectContaining({
                  roomName: "Flower A",
                  source: "growlink_account_structure",
                  ruleType: "alert_suggestion",
                  triggerMetric: "relative_humidity",
                  action:
                    "Create high-humidity and dew-point-risk reminders after lights out."
                })
              ]),
              rooms: [
                expect.objectContaining({
                  name: "Flower A",
                  type: "flower",
                  controllerName: "Flower A",
                  devices: ["Flower A Temp/RH"],
                  metrics: ["air_temperature", "relative_humidity"],
                  sensorStreams: [
                    expect.objectContaining({
                      providerMetricKey: "air_temperature",
                      normalizedMetric: "air_temperature",
                      suggestedRoomName: "Flower A",
                      suggestedDeviceName: "Flower A Temp/RH"
                    }),
                    expect.objectContaining({
                      providerMetricKey: "relative_humidity",
                      normalizedMetric: "relative_humidity",
                      suggestedRoomName: "Flower A",
                      suggestedDeviceName: "Flower A Temp/RH"
                    })
                  ],
                  permissionLevel: "read-only",
                  provider: "growlink"
                })
              ]
            })
          }
        }
      })
    );

    fireEvent.press(screen.getAllByText("Pull now")[0]);

    await waitFor(() =>
      expect(mockPullGrowlinkCurrentReadings).toHaveBeenCalledWith("source-new")
    );

    fireEvent.changeText(
      screen.getByPlaceholderText("History start ISO"),
      "2026-06-22T00:00:00.000Z"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("History end ISO"),
      "2026-06-22T14:00:00.000Z"
    );
    fireEvent.press(screen.getAllByText("Pull history")[0]);

    await waitFor(() =>
      expect(mockPullGrowlinkHistoricalWindow).toHaveBeenCalledWith(
        "source-new",
        "2026-06-22T00:00:00.000Z",
        "2026-06-22T14:00:00.000Z"
      )
    );
  });

  it("allows Growlink account verification to succeed when no hardware controllers exist yet", async () => {
    mockListTelemetrySources.mockResolvedValue([]);
    mockListGrowlinkControllers.mockResolvedValue([]);

    const screen = render(<DataIntegrationsScreen />);

    await waitFor(() =>
      expect(screen.getByText("Growlink read-only telemetry")).toBeTruthy()
    );

    fireEvent.changeText(
      screen.getByPlaceholderText("Growlink email"),
      "grower@example.com"
    );
    fireEvent.changeText(screen.getByPlaceholderText("Growlink password"), "secret");
    fireEvent.press(screen.getByText("Verify + preview controllers"));

    await waitFor(() =>
      expect(
        screen.getByText(/Growlink account verified\. No controllers were returned/)
      ).toBeTruthy()
    );

    expect(mockCreateTelemetrySource).not.toHaveBeenCalled();
  });

  it("removes provider/controller prefixes from suggested room names", async () => {
    mockListTelemetrySources.mockResolvedValue([]);
    mockListGrowlinkControllers.mockResolvedValue([
      {
        id: "controller-prefixed",
        name: "Hydro-X Pro",
        serialNumber: "TM-001",
        timeZoneId: "America/New_York",
        modules: [
          { id: "module-prefixed", name: "TrolMaster Hydro-X Pro Flower Room 2 CO2" }
        ]
      }
    ]);

    const screen = render(<DataIntegrationsScreen />);

    await waitFor(() =>
      expect(screen.getByText("Growlink read-only telemetry")).toBeTruthy()
    );

    fireEvent.changeText(
      screen.getByPlaceholderText("Growlink email"),
      "grower@example.com"
    );
    fireEvent.changeText(screen.getByPlaceholderText("Growlink password"), "secret");
    fireEvent.press(screen.getByText("Verify + preview controllers"));

    await waitFor(() =>
      expect(screen.getByText("Suggested room: Flower Room 2")).toBeTruthy()
    );
    expect(
      screen.queryByText("Suggested room: TrolMaster Hydro-X Pro Flower Room 2")
    ).toBeNull();
  });
});
