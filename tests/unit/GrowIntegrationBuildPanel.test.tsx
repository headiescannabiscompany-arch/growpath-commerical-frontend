import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import GrowIntegrationBuildPanel from "@/components/integrations/GrowIntegrationBuildPanel";

const mockListConnections = jest.fn();
const mockListSpaces = jest.fn();
const mockListProviders = jest.fn();
const mockCreateConnection = jest.fn();
const mockTestConnection = jest.fn();
const mockFetchStructure = jest.fn();
const mockPreview = jest.fn();
const mockConfirm = jest.fn();
const mockAutoBuild = jest.fn();
const mockImportHistory = jest.fn();

jest.mock("@/api/integrations", () => ({
  listIntegrationConnections: (...args: any[]) => mockListConnections(...args),
  listIntegrationSpaces: (...args: any[]) => mockListSpaces(...args),
  listIntegrationProviders: (...args: any[]) => mockListProviders(...args),
  createIntegrationConnection: (...args: any[]) => mockCreateConnection(...args),
  testIntegrationConnection: (...args: any[]) => mockTestConnection(...args),
  fetchIntegrationStructure: (...args: any[]) => mockFetchStructure(...args),
  previewIntegrationMapping: (...args: any[]) => mockPreview(...args),
  confirmIntegrationMapping: (...args: any[]) => mockConfirm(...args),
  autoBuildIntegrationSpaces: (...args: any[]) => mockAutoBuild(...args),
  importIntegrationHistory: (...args: any[]) => mockImportHistory(...args)
}));

describe("GrowIntegrationBuildPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListConnections.mockResolvedValue([
      {
        id: "connection-1",
        provider: "pulse",
        label: "Pulse greenhouse",
        status: "connected",
        capabilities: [],
        lastSync: { status: "never" }
      }
    ]);
    mockListSpaces.mockResolvedValue([]);
    mockListProviders.mockResolvedValue([
      {
        id: "zentra",
        name: "METER Group / ZENTRA Cloud",
        category: "cloud_api",
        contractStatus: "implemented",
        access: "personal_api_token",
        credentialRequired: true,
        capabilities: [],
        permissionLevel: "read_only",
        readOnly: true,
        setupNote: "Use the customer token."
      }
    ]);
    mockCreateConnection.mockResolvedValue({
      id: "connection-zentra",
      label: "METER Group / ZENTRA Cloud",
      provider: "zentra",
      status: "configured"
    });
    mockTestConnection.mockResolvedValue({ id: "connection-1" });
    mockFetchStructure.mockResolvedValue({
      devices: [],
      suggestedMappings: [
        {
          deviceId: "device-1",
          deviceName: "Greenhouse sensor",
          roomName: "Greenhouse",
          zoneName: "Canopy",
          metrics: ["air_temperature", "relative_humidity"]
        }
      ]
    });
    mockPreview.mockImplementation(async (_id, mappings) => ({
      provider: "pulse",
      permissionLevel: "read_only",
      deviceCount: mappings.length,
      roomCount: 1,
      zoneCount: 1,
      mappings
    }));
    mockConfirm.mockResolvedValue({ id: "connection-1" });
    mockAutoBuild.mockResolvedValue({
      mode: "commercial",
      targetRef: "trial-1",
      spaces: [],
      createdOrUpdated: 1
    });
    mockImportHistory.mockResolvedValue({
      provider: "pulse",
      startIso: "2026-07-15T00:00:00.000Z",
      endIso: "2026-08-14T00:00:00.000Z",
      devices: 1,
      failures: 0,
      pulled: 30,
      ingested: 30,
      updated: 0
    });
  });

  it("lets each configurable workspace save and test a customer provider key", async () => {
    mockTestConnection.mockResolvedValue({
      id: "connection-zentra",
      label: "METER Group / ZENTRA Cloud",
      provider: "zentra",
      status: "connected"
    });
    render(
      <GrowIntegrationBuildPanel
        mode="facility"
        targetRef="facility-grow-1"
        facilityId="facility-1"
      />
    );

    await waitFor(() =>
      expect(screen.getByText("METER Group / ZENTRA Cloud")).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("METER Group / ZENTRA Cloud API key or token"),
      "customer-token"
    );
    fireEvent.press(screen.getByText("Save and test connection"));

    await waitFor(() =>
      expect(mockCreateConnection).toHaveBeenCalledWith({
        provider: "zentra",
        label: "METER Group / ZENTRA Cloud",
        credentials: { apiKey: "customer-token" },
        config: { facilityId: "facility-1" }
      })
    );
    expect(mockTestConnection).toHaveBeenCalledWith("connection-zentra");
  });

  it("requires reviewed mapping before an idempotent workspace build", async () => {
    render(<GrowIntegrationBuildPanel mode="commercial" targetRef="trial-1" />);

    await waitFor(() => expect(screen.getByText("Pulse greenhouse")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Discover devices from Pulse greenhouse"));
    await waitFor(() => expect(screen.getByText("Greenhouse sensor")).toBeTruthy());
    expect(
      screen.queryByLabelText("Create or update the confirmed grow spaces")
    ).toBeNull();

    fireEvent.changeText(
      screen.getByLabelText("Space name for Greenhouse sensor"),
      "Greenhouse Bay 1"
    );
    fireEvent.press(screen.getByLabelText("Confirm reviewed grow space mappings"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Create or update the confirmed grow spaces")
      ).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Create or update the confirmed grow spaces"));

    await waitFor(() =>
      expect(mockAutoBuild).toHaveBeenCalledWith("connection-1", {
        mode: "commercial",
        targetRef: "trial-1"
      })
    );
    expect(mockConfirm).toHaveBeenCalledWith(
      "connection-1",
      expect.arrayContaining([expect.objectContaining({ roomName: "Greenhouse Bay 1" })])
    );
  });

  it("keeps mapping controls disabled for a read-only Facility role", async () => {
    render(
      <GrowIntegrationBuildPanel
        mode="facility"
        targetRef="facility-1"
        canConfigure={false}
      />
    );
    await waitFor(() => expect(screen.getByText("Pulse greenhouse")).toBeTruthy());
    expect(
      screen.getByLabelText("Discover devices from Pulse greenhouse").props
        .accessibilityState.disabled
    ).toBe(true);
    expect(screen.getByText(/cannot change device mappings/)).toBeTruthy();
  });

  it("imports reviewed history into an already built grow space", async () => {
    mockListSpaces.mockResolvedValue([
      {
        id: "space-1",
        connectionId: "connection-1",
        provider: "pulse",
        name: "Tent 1",
        zoneName: "Canopy",
        devices: [
          {
            providerDeviceId: "device-1",
            name: "Canopy monitor",
            metrics: ["temperature", "humidity"],
            permissionLevel: "read_only"
          }
        ],
        permissionLevel: "read_only"
      }
    ]);
    render(<GrowIntegrationBuildPanel mode="personal" targetRef="grow-1" />);

    await waitFor(() =>
      expect(
        screen.getByLabelText("Import the last 30 days from Pulse greenhouse")
      ).toBeTruthy()
    );
    fireEvent.press(
      screen.getByLabelText("Import the last 30 days from Pulse greenhouse")
    );
    await waitFor(() => expect(mockImportHistory).toHaveBeenCalledTimes(1));
    expect(mockImportHistory.mock.calls[0][0]).toBe("connection-1");
    expect(mockImportHistory.mock.calls[0][1]).toMatchObject({
      mode: "personal",
      targetRef: "grow-1",
      startIso: expect.any(String),
      endIso: expect.any(String),
      timezone: expect.any(String)
    });
  });
});
