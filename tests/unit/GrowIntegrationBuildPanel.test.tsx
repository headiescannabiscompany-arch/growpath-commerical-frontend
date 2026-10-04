import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

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
let mockAuth: any;

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuth
}));

function deferred<T = any>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: any) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function pressHandler(node: any): () => void {
  let current = node;
  while (current && typeof current.props.onPress !== "function") current = current.parent;
  if (!current) throw new Error("Expected an actionable control");
  return current.props.onPress;
}

const connectedPulse = {
  id: "connection-1",
  provider: "pulse",
  label: "Pulse greenhouse",
  status: "connected",
  capabilities: [],
  lastSync: { status: "never" }
};
const builtSpace = {
  id: "space-1",
  connectionId: "connection-1",
  provider: "pulse",
  name: "Tent 1",
  zoneName: "Canopy",
  devices: [],
  permissionLevel: "read_only"
};
const integrationProps = {
  mode: "facility" as const,
  facilityId: "facility-1",
  targetRef: "grow-1"
};
const contextChanges = ["grow", "facility", "permission", "account", "session", "hydration", "unmount"] as const;
type ContextChange = typeof contextChanges[number];

function changeContext(view: ReturnType<typeof render>, change: ContextChange) {
  if (change === "unmount") {
    view.unmount();
    return;
  }
  if (change === "account") mockAuth = { ...mockAuth, user: { id: "user-2" } };
  if (change === "session") mockAuth = { ...mockAuth, token: "session-2" };
  if (change === "hydration") mockAuth = { ...mockAuth, isHydrating: true };
  view.rerender(<GrowIntegrationBuildPanel {...integrationProps}
    targetRef={change === "grow" ? "grow-2" : "grow-1"}
    facilityId={change === "facility" ? "facility-2" : "facility-1"}
    canConfigure={change !== "permission"}
  />);
}

async function discoverMapping() {
  await screen.findByText("Pulse greenhouse");
  fireEvent.press(screen.getByLabelText("Discover devices from Pulse greenhouse"));
  await screen.findByText("Greenhouse sensor");
}

async function confirmMapping() {
  await discoverMapping();
  fireEvent.press(screen.getByLabelText("Confirm reviewed grow space mappings"));
  await screen.findByLabelText("Create or update the confirmed grow spaces");
}

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
    jest.resetAllMocks();
    mockAuth = {
      user: { id: "user-1" },
      token: "session-1",
      isHydrating: false,
      isAuthed: true
    };
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
    mockTestConnection.mockResolvedValue(connectedPulse);
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
        workspaceType: "facility",
        facilityId: "facility-1",
        config: { facilityId: "facility-1" }
      })
    );
    expect(mockListConnections).toHaveBeenCalledWith({
      workspaceType: "facility",
      facilityId: "facility-1"
    });
    expect(mockListSpaces).toHaveBeenCalledWith({
      workspaceType: "facility",
      facilityId: "facility-1",
      targetRef: "facility-grow-1",
      targetType: "grow"
    });
    expect(mockTestConnection).toHaveBeenCalledWith("connection-zentra");
  });

  it("notifies the destination boundary while discovery is active", async () => {
    let finish!: (value: any) => void;
    mockFetchStructure.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const onBusyChange = jest.fn();
    render(
      <GrowIntegrationBuildPanel
        mode="facility"
        targetRef="grow-1"
        facilityId="facility-1"
        onBusyChange={onBusyChange}
      />
    );
    await screen.findByText("Pulse greenhouse");
    fireEvent.press(screen.getByText("Discover devices"));
    await waitFor(() => expect(mockFetchStructure).toHaveBeenCalled());
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    await act(async () => finish({ suggestedMappings: [] }));
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("does not show a stale Facility when two Facilities reuse the same grow ID", async () => {
    let resolveFacilityOneSpaces: (spaces: any[]) => void = () => undefined;
    const facilityOneSpaces = new Promise<any[]>((resolve) => {
      resolveFacilityOneSpaces = resolve;
    });
    mockListSpaces.mockImplementation(({ facilityId }) => {
      if (facilityId === "facility-1") return facilityOneSpaces;
      return Promise.resolve([
        {
          id: "facility-2-space",
          connectionId: "connection-1",
          provider: "pulse",
          name: "Facility Two Room",
          zoneName: "Canopy",
          devices: [],
          permissionLevel: "read_only"
        }
      ]);
    });

    const view = render(
      <GrowIntegrationBuildPanel
        mode="facility"
        facilityId="facility-1"
        targetRef="duplicate-grow-id"
      />
    );
    await waitFor(() =>
      expect(mockListSpaces).toHaveBeenCalledWith({
        workspaceType: "facility",
        facilityId: "facility-1",
        targetRef: "duplicate-grow-id",
        targetType: "grow"
      })
    );

    view.rerender(
      <GrowIntegrationBuildPanel
        mode="facility"
        facilityId="facility-2"
        targetRef="duplicate-grow-id"
      />
    );
    expect(await screen.findByText("Facility Two Room / Canopy")).toBeTruthy();

    await act(async () => {
      resolveFacilityOneSpaces([
        {
          id: "facility-1-space",
          connectionId: "connection-1",
          provider: "pulse",
          name: "Facility One Room",
          zoneName: "Canopy",
          devices: [],
          permissionLevel: "read_only"
        }
      ]);
    });

    await waitFor(() =>
      expect(screen.queryByText("Facility One Room / Canopy")).toBeNull()
    );
    expect(screen.getByText("Facility Two Room / Canopy")).toBeTruthy();
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
        targetRef: "trial-1",
        targetType: "grow"
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
        targetRef="facility-grow-1"
        facilityId="facility-1"
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
      targetType: "grow",
      startIso: expect.any(String),
      endIso: expect.any(String),
      timezone: expect.any(String)
    });
  });

  it("keeps pending and failed initial reads distinct from an empty connection list", async () => {
    const pending = deferred();
    mockListConnections.mockReturnValueOnce(pending.promise);
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    expect(screen.getByText(/Loading integration connections/)).toBeTruthy();
    expect(screen.queryByText(/No controller connection is saved yet/)).toBeNull();
    expect(screen.queryByText("Save and test connection")).toBeNull();

    await act(async () => pending.reject(new Error("Connection lookup unavailable")));
    expect(screen.getByText(/Integration data is unavailable/)).toBeTruthy();
    expect(screen.getByText(/Connection lookup unavailable/)).toBeTruthy();
    expect(screen.queryByText(/No controller connection is saved yet/)).toBeNull();
    expect(screen.queryByText("Save and test connection")).toBeNull();
    expect(screen.getByText("Retry integrations")).toBeTruthy();
  });

  it("shows the empty connection guidance only after a successful complete read", async () => {
    mockListConnections.mockResolvedValue([]);
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    expect(await screen.findByText(/No controller connection is saved yet/)).toBeTruthy();
    expect(screen.queryByText(/Integration data is unavailable/)).toBeNull();
    expect(screen.getByText("Refresh integrations")).toBeTruthy();
  });

  it.each(["connections", "spaces", "providers"] as const)(
    "treats a failed %s read as unavailable without enabling setup",
    async (part) => {
      ({ connections: mockListConnections, spaces: mockListSpaces, providers: mockListProviders }[part])
        .mockRejectedValueOnce(new Error(`${part} offline`));
      render(<GrowIntegrationBuildPanel {...integrationProps} />);
      await screen.findByText("Retry integrations");
      expect(screen.queryByText(/No controller connection is saved yet/)).toBeNull();
      expect(screen.queryByText("Save and test connection")).toBeNull();
      fireEvent.press(screen.getByText("Retry integrations"));
      await screen.findByText("Pulse greenhouse");
      expect(mockCreateConnection).not.toHaveBeenCalled();
      expect(mockTestConnection).not.toHaveBeenCalled();
      expect(mockImportHistory).not.toHaveBeenCalled();
    }
  );

  it("serializes repeated Refresh and Retry handlers and preserves the key draft", async () => {
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.changeText(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token"), "unsaved-test-key");
    const refresh = pressHandler(screen.getByText("Refresh integrations"));
    const pendingRefresh = deferred();
    mockListConnections.mockReturnValueOnce(pendingRefresh.promise);
    act(() => { refresh(); refresh(); });
    expect(mockListConnections).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Refreshing integrations/)).toBeTruthy();
    expect(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token").props.value).toBe("unsaved-test-key");

    await act(async () => pendingRefresh.reject(new Error("Refresh failed")));
    const retry = pressHandler(screen.getByText("Retry integrations"));
    const pendingRetry = deferred();
    mockListConnections.mockReturnValueOnce(pendingRetry.promise);
    act(() => { retry(); retry(); });
    expect(mockListConnections).toHaveBeenCalledTimes(3);
    await act(async () => pendingRetry.resolve([connectedPulse]));
    expect(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token").props.value).toBe("unsaved-test-key");
    expect(mockCreateConnection).not.toHaveBeenCalled();
  });

  it("labels retained data after failure and rejects saved action handlers until retry succeeds", async () => {
    mockListSpaces.mockResolvedValue([builtSpace]);
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    const discover = pressHandler(screen.getByLabelText("Discover devices from Pulse greenhouse"));
    const history = pressHandler(screen.getByLabelText("Import the last 30 days from Pulse greenhouse"));
    mockListConnections.mockRejectedValueOnce(new Error("Refresh failed"));
    fireEvent.press(screen.getByText("Refresh integrations"));
    await screen.findByText("Retry integrations");
    expect(screen.getByText(/Previously loaded integration data is shown/)).toBeTruthy();
    expect(screen.getByText("Tent 1 / Canopy")).toBeTruthy();
    expect(screen.getByLabelText("Discover devices from Pulse greenhouse").props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText("Import the last 30 days from Pulse greenhouse").props.accessibilityState.disabled).toBe(true);
    act(() => { discover(); history(); });
    expect(mockTestConnection).not.toHaveBeenCalled();
    expect(mockImportHistory).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Retry integrations"));
    await waitFor(() => expect(screen.getByLabelText("Discover devices from Pulse greenhouse").props.accessibilityState.disabled).toBe(false));
    expect(screen.queryByText(/Previously loaded integration data is shown/)).toBeNull();
  });

  it("keeps the confirmed import receipt separate from a failed follow-up read", async () => {
    mockListSpaces.mockResolvedValue([builtSpace]);
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    mockListConnections.mockRejectedValueOnce(new Error("Follow-up lookup unavailable"));
    fireEvent.press(screen.getByLabelText("Import the last 30 days from Pulse greenhouse"));
    await screen.findByText("Retry integrations");
    expect(screen.getByText(/Imported 30 new and 0 updated readings/)).toBeTruthy();
    expect(screen.getByText(/Follow-up lookup unavailable/)).toBeTruthy();
    expect(mockImportHistory).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText("Retry integrations"));
    await screen.findByText("Refresh integrations");
    expect(screen.getByText(/Imported 30 new and 0 updated readings/)).toBeTruthy();
    expect(mockImportHistory).toHaveBeenCalledTimes(1);
  });

  it("keeps a confirmed build receipt when the following refresh fails", async () => {
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await confirmMapping();
    mockListSpaces.mockRejectedValueOnce(new Error("Spaces refresh unavailable"));
    fireEvent.press(screen.getByLabelText("Create or update the confirmed grow spaces"));
    await screen.findByText("Retry integrations");
    expect(screen.getByText(/Created or updated 1 read-only grow space/)).toBeTruthy();
    expect(screen.getByText(/Spaces refresh unavailable/)).toBeTruthy();
    expect(mockAutoBuild).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Create or update the confirmed grow spaces")).toBeNull();
  });

  it("invalidates the confirmation after refresh but preserves the review draft", async () => {
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await confirmMapping();
    const oldBuild = pressHandler(screen.getByLabelText("Create or update the confirmed grow spaces"));
    fireEvent.press(screen.getByText("Refresh integrations"));
    await waitFor(() => expect(mockListConnections).toHaveBeenCalledTimes(2));
    await screen.findByText("Refresh integrations");
    expect(screen.getByLabelText("Space name for Greenhouse sensor").props.value).toBe("Greenhouse");
    expect(screen.queryByLabelText("Create or update the confirmed grow spaces")).toBeNull();
    act(() => oldBuild());
    expect(mockAutoBuild).not.toHaveBeenCalled();
  });

  it("locks duplicate save handlers, provider selection, key input, and refresh during save", async () => {
    const pending = deferred();
    mockCreateConnection.mockReturnValueOnce(pending.promise);
    const zentra = await mockListProviders();
    mockListProviders.mockResolvedValue([...zentra, { ...zentra[0], id: "ubibot", name: "UbiBot" }]);
    mockListProviders.mockClear();
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.changeText(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token"), "test-key");
    const save = pressHandler(screen.getByText("Save and test connection"));
    const refresh = pressHandler(screen.getByText("Refresh integrations"));
    const chooseUbiBot = pressHandler(screen.getByText("UbiBot"));
    act(() => { save(); save(); refresh(); chooseUbiBot(); });
    expect(mockCreateConnection).toHaveBeenCalledTimes(1);
    expect(mockListConnections).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token").props.editable).toBe(false);
    expect(screen.getByRole("button", { name: "UbiBot" }).props.accessibilityState.disabled).toBe(true);
    mockTestConnection.mockResolvedValueOnce({ ...connectedPulse, id: "connection-zentra", provider: "zentra" });
    await act(async () => pending.resolve({ ...connectedPulse, id: "connection-zentra", provider: "zentra" }));
    expect(mockCreateConnection.mock.calls[0][0].provider).toBe("zentra");
  });

  it("serializes saved same-tick history handlers without duplicate imports or refresh", async () => {
    mockListSpaces.mockResolvedValue([builtSpace]);
    const pending = deferred();
    mockImportHistory.mockReturnValueOnce(pending.promise);
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    const history = pressHandler(screen.getByLabelText("Import the last 30 days from Pulse greenhouse"));
    const refresh = pressHandler(screen.getByText("Refresh integrations"));
    act(() => { history(); history(); refresh(); });
    expect(mockImportHistory).toHaveBeenCalledTimes(1);
    expect(mockListConnections).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ devices: 1, failures: 0, ingested: 12, updated: 0 }));
    expect(mockListConnections).toHaveBeenCalledTimes(2);
  });

  it("selects only a freshly connectable provider after catalog changes and clears the old key", async () => {
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.changeText(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token"), "old-provider-key");
    mockListProviders.mockResolvedValue([
      { id: "zentra", name: "METER Group / ZENTRA Cloud", contractStatus: "unavailable", credentialRequired: false },
      { id: "ubibot", name: "UbiBot", contractStatus: "implemented", credentialRequired: true }
    ]);
    fireEvent.press(screen.getByText("Refresh integrations"));
    const key = await screen.findByLabelText("UbiBot API key or token");
    expect(key.props.value).toBe("");
    expect(screen.queryByLabelText("METER Group / ZENTRA Cloud API key or token")).toBeNull();
    expect(mockCreateConnection).not.toHaveBeenCalled();
  });

  it.each(["configured", "error"])("does not claim a %s provider test is connected or fetch devices", async (status) => {
    mockTestConnection.mockResolvedValue({ ...connectedPulse, status });
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.press(screen.getByLabelText("Discover devices from Pulse greenhouse"));
    await waitFor(() => expect(mockTestConnection).toHaveBeenCalledTimes(1));
    expect(mockFetchStructure).not.toHaveBeenCalled();
    expect(screen.queryByText("Greenhouse sensor")).toBeNull();
    expect(screen.queryByText(/The connection worked/)).toBeNull();
  });

  it("does not claim success after saving a key whose provider test remains unverified", async () => {
    mockTestConnection.mockResolvedValue({ ...connectedPulse, id: "connection-zentra", provider: "zentra", status: "configured" });
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.changeText(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token"), "test-key");
    fireEvent.press(screen.getByText("Save and test connection"));
    await waitFor(() => expect(mockTestConnection).toHaveBeenCalledWith("connection-zentra"));
    expect(screen.queryByText(/ZENTRA Cloud connected/)).toBeNull();
    expect(mockFetchStructure).not.toHaveBeenCalled();
  });

  it.each(contextChanges)("stops discovery after a pending test when %s changes", async (change) => {
    const pending = deferred();
    mockTestConnection.mockReturnValueOnce(pending.promise);
    const view = render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.press(screen.getByLabelText("Discover devices from Pulse greenhouse"));
    await waitFor(() => expect(mockTestConnection).toHaveBeenCalledTimes(1));
    await act(async () => changeContext(view, change));
    await act(async () => pending.resolve(connectedPulse));
    expect(mockFetchStructure).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
    if (change !== "unmount") expect(screen.queryByText("Greenhouse sensor")).toBeNull();
  });

  it.each(contextChanges)("discards an old discovery structure when %s changes", async (change) => {
    const pending = deferred();
    mockFetchStructure.mockReturnValueOnce(pending.promise);
    const view = render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.press(screen.getByLabelText("Discover devices from Pulse greenhouse"));
    await waitFor(() => expect(mockFetchStructure).toHaveBeenCalledTimes(1));
    await act(async () => changeContext(view, change));
    await act(async () => pending.resolve({ devices: [], suggestedMappings: [{ deviceId: "late-device", deviceName: "Old context sensor", roomName: "Old room", zoneName: "Old zone", metrics: [] }] }));
    if (change !== "unmount") {
      expect(screen.queryByText("Old context sensor")).toBeNull();
      expect(screen.queryByLabelText("Confirm reviewed grow space mappings")).toBeNull();
    }
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it.each(contextChanges)("does not confirm an old preview after %s changes", async (change) => {
    const pending = deferred();
    mockPreview.mockReturnValueOnce(pending.promise);
    const view = render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await discoverMapping();
    fireEvent.press(screen.getByLabelText("Confirm reviewed grow space mappings"));
    await waitFor(() => expect(mockPreview).toHaveBeenCalledTimes(1));
    const reviewed = mockPreview.mock.calls[0][1];
    await act(async () => changeContext(view, change));
    await act(async () => pending.resolve({ deviceCount: 1, roomCount: 1, mappings: reviewed }));
    expect(mockConfirm).not.toHaveBeenCalled();
    if (change !== "unmount") expect(screen.queryByLabelText("Create or update the confirmed grow spaces")).toBeNull();
  });

  it.each(contextChanges)("does not enable a build from a stale confirmation after %s changes", async (change) => {
    const pending = deferred();
    mockConfirm.mockReturnValueOnce(pending.promise);
    const view = render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await discoverMapping();
    fireEvent.press(screen.getByLabelText("Confirm reviewed grow space mappings"));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    await act(async () => changeContext(view, change));
    await act(async () => pending.resolve(connectedPulse));
    if (change !== "unmount") {
      expect(screen.queryByLabelText("Create or update the confirmed grow spaces")).toBeNull();
      expect(screen.queryByText(/Reviewed 1 device/)).toBeNull();
    }
    expect(mockAutoBuild).not.toHaveBeenCalled();
  });

  it.each(contextChanges)("does not reload or report a previous build after %s changes", async (change) => {
    const pending = deferred();
    mockAutoBuild.mockReturnValueOnce(pending.promise);
    const view = render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await confirmMapping();
    fireEvent.press(screen.getByLabelText("Create or update the confirmed grow spaces"));
    await waitFor(() => expect(mockAutoBuild).toHaveBeenCalledTimes(1));
    await act(async () => changeContext(view, change));
    const readsBeforeOldWriteSettles = mockListConnections.mock.calls.length;
    await act(async () => pending.resolve({ createdOrUpdated: 7, spaces: [] }));
    expect(mockListConnections).toHaveBeenCalledTimes(readsBeforeOldWriteSettles);
    if (change !== "unmount") expect(screen.queryByText(/Created or updated 7/)).toBeNull();
  });

  it.each(contextChanges)("does not reload or report a previous history import after %s changes", async (change) => {
    mockListSpaces.mockResolvedValue([builtSpace]);
    const pending = deferred();
    mockImportHistory.mockReturnValueOnce(pending.promise);
    const view = render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.press(screen.getByLabelText("Import the last 30 days from Pulse greenhouse"));
    await waitFor(() => expect(mockImportHistory).toHaveBeenCalledTimes(1));
    await act(async () => changeContext(view, change));
    const readsBeforeOldWriteSettles = mockListConnections.mock.calls.length;
    await act(async () => pending.resolve({ devices: 1, failures: 0, ingested: 77, updated: 0 }));
    expect(mockListConnections).toHaveBeenCalledTimes(readsBeforeOldWriteSettles);
    if (change !== "unmount") expect(screen.queryByText(/Imported 77 new/)).toBeNull();
  });

  it.each(contextChanges)("does not test a previous credential save after %s changes", async (change) => {
    const pending = deferred();
    mockCreateConnection.mockReturnValueOnce(pending.promise);
    const view = render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.changeText(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token"), "test-key");
    fireEvent.press(screen.getByText("Save and test connection"));
    await waitFor(() => expect(mockCreateConnection).toHaveBeenCalledTimes(1));
    await act(async () => changeContext(view, change));
    const readsBeforeOldWriteSettles = mockListConnections.mock.calls.length;
    await act(async () => pending.resolve({ ...connectedPulse, id: "new-old-context" }));
    expect(mockTestConnection).not.toHaveBeenCalled();
    expect(mockListConnections).toHaveBeenCalledTimes(readsBeforeOldWriteSettles);
  });

  it("rejects stale saved write handlers after permission is revoked", async () => {
    mockListSpaces.mockResolvedValue([builtSpace]);
    const view = render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await confirmMapping();
    fireEvent.changeText(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token"), "test-key");
    const handlers = [
      pressHandler(screen.getByText("Save and test connection")),
      pressHandler(screen.getByLabelText("Discover devices from Pulse greenhouse")),
      pressHandler(screen.getByLabelText("Confirm reviewed grow space mappings")),
      pressHandler(screen.getByLabelText("Create or update the confirmed grow spaces")),
      pressHandler(screen.getByLabelText("Import the last 30 days from Pulse greenhouse"))
    ];
    const testedCount = mockTestConnection.mock.calls.length;
    const previewCount = mockPreview.mock.calls.length;
    await act(async () => changeContext(view, "permission"));
    act(() => handlers.forEach((handler) => handler()));
    expect(mockCreateConnection).not.toHaveBeenCalled();
    expect(mockTestConnection).toHaveBeenCalledTimes(testedCount);
    expect(mockPreview).toHaveBeenCalledTimes(previewCount);
    expect(mockAutoBuild).not.toHaveBeenCalled();
    expect(mockImportHistory).not.toHaveBeenCalled();
  });

  it("keeps actions usable when the already selected provider is pressed", async () => {
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.press(screen.getByRole("button", { name: "METER Group / ZENTRA Cloud" }));
    fireEvent.changeText(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token"), "fresh-test-key");
    expect(screen.getByLabelText("METER Group / ZENTRA Cloud API key or token").props.value).toBe("fresh-test-key");
    fireEvent.press(screen.getByLabelText("Discover devices from Pulse greenhouse"));
    await screen.findByText("Greenhouse sensor");
    expect(mockTestConnection).toHaveBeenCalledTimes(1);
  });

  it("removes an old review draft when refresh no longer returns its connection", async () => {
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await confirmMapping();
    const confirm = pressHandler(screen.getByLabelText("Confirm reviewed grow space mappings"));
    mockListConnections.mockResolvedValueOnce([]);
    fireEvent.press(screen.getByText("Refresh integrations"));
    await screen.findByText(/No controller connection is saved yet/);
    expect(screen.queryByText("Greenhouse sensor")).toBeNull();
    expect(screen.queryByLabelText("Create or update the confirmed grow spaces")).toBeNull();
    act(() => confirm());
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockAutoBuild).not.toHaveBeenCalled();
  });

  it("replaces a previous connected row with the actual failed test status", async () => {
    mockTestConnection.mockResolvedValue({ ...connectedPulse, status: "error" });
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    fireEvent.press(screen.getByLabelText("Discover devices from Pulse greenhouse"));
    await screen.findByText(/pulse · error · read only/);
    expect(screen.queryByText(/pulse · connected · read only/)).toBeNull();
    expect(mockFetchStructure).not.toHaveBeenCalled();
  });

  it.each(["connections", "spaces", "providers"] as const)("recovers from a non-array %s response without a false empty", async (part) => {
    ({ connections: mockListConnections, spaces: mockListSpaces, providers: mockListProviders }[part]).mockResolvedValueOnce(null);
    render(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Retry integrations");
    expect(screen.queryByText(/No controller connection is saved yet/)).toBeNull();
    expect(screen.queryByText("Save and test connection")).toBeNull();
    fireEvent.press(screen.getByText("Retry integrations"));
    await screen.findByText("Pulse greenhouse");
    expect(mockCreateConnection).not.toHaveBeenCalled();
  });

  it("waits for authenticated context before reading integration records", async () => {
    mockAuth = { user: null, token: null, isHydrating: true, isAuthed: false };
    const view = render(<GrowIntegrationBuildPanel {...integrationProps} />);
    expect(mockListConnections).not.toHaveBeenCalled();
    expect(screen.queryByText(/No controller connection is saved yet/)).toBeNull();
    mockAuth = { user: { id: "user-1" }, token: "session-1", isHydrating: false, isAuthed: true };
    view.rerender(<GrowIntegrationBuildPanel {...integrationProps} />);
    await screen.findByText("Pulse greenhouse");
    expect(mockListConnections).toHaveBeenCalledTimes(1);
  });
});
