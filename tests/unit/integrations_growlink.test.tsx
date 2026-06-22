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
  createIntegrationConnection: (...args: any[]) => mockCreateIntegrationConnection(...args),
  testIntegrationConnection: (...args: any[]) => mockTestIntegrationConnection(...args),
  createIntegrationAccessRequest: (...args: any[]) =>
    mockCreateIntegrationAccessRequest(...args)
}));

const mockCreateTelemetrySource = jest.fn();
const mockListGrowlinkControllers = jest.fn();
const mockListTelemetrySources = jest.fn();
const mockPullGrowlinkCurrentReadings = jest.fn();
const mockVerifyGrowlinkCredentials = jest.fn();

jest.mock("@/api/telemetry", () => ({
  createTelemetrySource: (...args: any[]) => mockCreateTelemetrySource(...args),
  listGrowlinkControllers: (...args: any[]) => mockListGrowlinkControllers(...args),
  listTelemetrySources: (...args: any[]) => mockListTelemetrySources(...args),
  pullGrowlinkCurrentReadings: (...args: any[]) =>
    mockPullGrowlinkCurrentReadings(...args),
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
        modules: [{ id: "module-1" }]
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
  });

  it("verifies credentials, lists controllers, creates a read-only Growlink source, and pulls current readings", async () => {
    const screen = render(<DataIntegrationsScreen />);

    await waitFor(() => expect(screen.getByText("Growlink read-only telemetry")).toBeTruthy());
    await waitFor(() => expect(mockListTelemetrySources).toHaveBeenCalledWith("grow-1"));

    fireEvent.changeText(screen.getByPlaceholderText("Source name"), "Growlink Flower A");
    fireEvent.changeText(screen.getByPlaceholderText("Growlink email"), "grower@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Growlink password"), "secret");

    fireEvent.press(screen.getByText("Verify + load controllers"));

    await waitFor(() =>
      expect(mockVerifyGrowlinkCredentials).toHaveBeenCalledWith({
        userName: "grower@example.com",
        password: "secret"
      })
    );
    await waitFor(() => expect(screen.getByText("Flower A")).toBeTruthy());

    fireEvent.press(screen.getByText("Create source"));

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
            controllerId: "controller-1"
          }
        }
      })
    );

    fireEvent.press(screen.getAllByText("Pull now")[0]);

    await waitFor(() =>
      expect(mockPullGrowlinkCurrentReadings).toHaveBeenCalledWith("source-new")
    );
  });

  it("allows Growlink account verification to succeed when no hardware controllers exist yet", async () => {
    mockListTelemetrySources.mockResolvedValue([]);
    mockListGrowlinkControllers.mockResolvedValue([]);

    const screen = render(<DataIntegrationsScreen />);

    await waitFor(() => expect(screen.getByText("Growlink read-only telemetry")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("Growlink email"), "grower@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Growlink password"), "secret");
    fireEvent.press(screen.getByText("Verify + load controllers"));

    await waitFor(() =>
      expect(screen.getByText(/Growlink account verified\. No controllers were returned/)).toBeTruthy()
    );

    expect(mockCreateTelemetrySource).not.toHaveBeenCalled();
  });
});
