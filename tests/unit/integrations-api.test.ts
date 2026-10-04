const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  createIntegrationConnection,
  listIntegrationConnections,
  listIntegrationProviders,
  listIntegrationSpaces
} = require("@/api/integrations");

describe("workspace-scoped integration connection API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue({
      connections: [],
      connection: { id: "connection-1" },
      spaces: []
    });
  });

  it.each([
    ["personal", undefined, "/api/integrations/connections?workspaceType=personal"],
    ["commercial", undefined, "/api/integrations/connections?workspaceType=commercial"],
    [
      "facility",
      "facility-1",
      "/api/integrations/connections?workspaceType=facility&facilityId=facility-1"
    ]
  ])("lists only the active %s workspace", async (workspaceType, facilityId, path) => {
    await listIntegrationConnections({ workspaceType, facilityId });
    expect(mockApiRequest).toHaveBeenCalledWith(path);
  });

  it.each([
    ["personal", undefined],
    ["commercial", undefined],
    ["facility", "facility-1"]
  ])(
    "creates a connection in the active %s workspace without a client account id",
    async (workspaceType, facilityId) => {
      const input = {
        provider: "pulse",
        label: `${workspaceType} Pulse`,
        credentials: { apiKey: "secret" },
        workspaceType,
        ...(facilityId ? { facilityId, config: { facilityId } } : {})
      };
      await createIntegrationConnection(input);

      expect(mockApiRequest).toHaveBeenCalledWith("/api/integrations/connections", {
        method: "POST",
        body: input
      });
      expect(mockApiRequest.mock.calls[0][1].body.workspaceId).toBeUndefined();
    }
  );

  it("keeps the same grow ID isolated between two selected Facilities", async () => {
    await listIntegrationSpaces({
      workspaceType: "facility",
      facilityId: "facility-a",
      targetRef: "shared-grow-id",
      targetType: "grow"
    });
    await listIntegrationSpaces({
      workspaceType: "facility",
      facilityId: "facility-b",
      targetRef: "shared-grow-id",
      targetType: "grow"
    });

    expect(mockApiRequest.mock.calls.map(([path]) => path)).toEqual([
      "/api/integrations/spaces?workspaceType=facility&targetRef=shared-grow-id&facilityId=facility-a&targetType=grow",
      "/api/integrations/spaces?workspaceType=facility&targetRef=shared-grow-id&facilityId=facility-b&targetType=grow"
    ]);
    expect(mockApiRequest.mock.calls[0][0]).not.toContain("workspaceId");
    expect(mockApiRequest.mock.calls[1][0]).not.toContain("workspaceId");
  });
});

const provider = {
  id: "pulse",
  name: "Pulse Grow",
  contractStatus: "implemented",
  capabilities: ["telemetry", "devices"]
};
const connection = {
  id: "connection-1",
  provider: "pulse",
  label: "Greenhouse monitor",
  status: "connected"
};
const space = {
  id: "space-1",
  connectionId: "connection-1",
  provider: "pulse",
  name: "Greenhouse",
  zoneName: "",
  devices: [
    {
      providerDeviceId: "device-1",
      name: "Canopy monitor",
      metrics: ["air_temperature", "relative_humidity"]
    }
  ]
};

const collections = [
  { key: "providers", read: () => listIntegrationProviders(), row: provider },
  {
    key: "connections",
    read: () => listIntegrationConnections({ workspaceType: "personal" }),
    row: connection
  },
  {
    key: "spaces",
    read: () =>
      listIntegrationSpaces({
        workspaceType: "personal",
        targetRef: "grow-1",
        targetType: "grow"
      }),
    row: space
  }
];

describe.each(collections)(
  "integration $key collection validation",
  ({ key, read, row }) => {
    it.each([false, true])(
      "accepts a valid collection and a deliberate empty collection (wrapped=%s)",
      async (wrapped) => {
        for (const rows of [[row], []]) {
          const payload = { [key]: rows };
          mockApiRequest.mockResolvedValueOnce(
            wrapped ? { ok: true, data: payload } : payload
          );
          await expect(read()).resolves.toBe(rows);
        }
      }
    );

    it.each([
      ["missing response", undefined],
      ["null response", null],
      ["bare array", []],
      ["missing collection", {}],
      ["missing wrapped collection", { ok: true, data: {} }],
      ["null envelope", { ok: true, data: null }]
    ])("rejects %s instead of declaring an empty workspace", async (_name, response) => {
      mockApiRequest.mockResolvedValueOnce(response);
      await expect(read()).rejects.toThrow(`Integration ${key} could not be verified`);
    });

    it.each([
      ["null collection", null],
      ["object collection", {}],
      ["string collection", "unavailable"],
      ["null row", [null]],
      ["array row", [[]]],
      ["missing row identity", [{}]]
    ])("rejects a %s", async (_name, rows) => {
      mockApiRequest.mockResolvedValueOnce({ ok: true, data: { [key]: rows } });
      await expect(read()).rejects.toThrow(`Integration ${key} could not be verified`);
    });

    it("rejects blank and duplicate saved identities without silently dropping rows", async () => {
      for (const rows of [[{ ...row, id: " " }], [row, { ...row }]]) {
        mockApiRequest.mockResolvedValueOnce({ [key]: rows });
        await expect(read()).rejects.toThrow(`Integration ${key} could not be verified`);
      }
    });

    it("does not accept a failed response carrying a collection", async () => {
      mockApiRequest.mockResolvedValueOnce({ ok: false, data: { [key]: [row] } });
      await expect(read()).rejects.toThrow(`Integration ${key} could not be verified`);
    });
  }
);

describe("integration collection rendered fields", () => {
  it.each([
    { name: null },
    { name: " " },
    { contractStatus: null },
    { contractStatus: "connected" },
    { capabilities: null },
    { capabilities: [null] },
    { credentialRequired: "false" },
    { setupNote: {} }
  ])("rejects malformed provider fields: %j", async (invalidFields) => {
    mockApiRequest.mockResolvedValueOnce({
      providers: [{ ...provider, ...invalidFields }]
    });
    await expect(listIntegrationProviders()).rejects.toThrow(
      "Integration providers could not be verified"
    );
  });

  it("preserves all supported provider contract states and optional metadata", async () => {
    const providers = [
      "implemented",
      "access_required",
      "contract_pending",
      "gateway_required"
    ].map((contractStatus, index) => ({
      ...provider,
      id: `another-provider-${index}`,
      contractStatus,
      capabilities: [],
      credentialRequired: index === 1,
      documentationUrl: null,
      requestUrl: null,
      setupNote: "Provider-specific setup remains required.",
      providerMetadata: { retained: true }
    }));
    mockApiRequest.mockResolvedValueOnce({ ok: true, data: { providers } });
    await expect(listIntegrationProviders()).resolves.toBe(providers);
  });

  it.each([
    { provider: {} },
    { provider: "" },
    { label: [] },
    { label: " " },
    { status: null },
    { status: "implemented" }
  ])("rejects malformed connection fields: %j", async (invalidFields) => {
    mockApiRequest.mockResolvedValueOnce({
      connections: [{ ...connection, ...invalidFields }]
    });
    await expect(
      listIntegrationConnections({ workspaceType: "personal" })
    ).rejects.toThrow("Integration connections could not be verified");
  });

  it("accepts every existing connection state without requiring optional metadata", async () => {
    const connections = [
      "draft",
      "configured",
      "connected",
      "error",
      "access_requested"
    ].map((status, index) => ({ ...connection, id: `connection-${index}`, status }));
    mockApiRequest.mockResolvedValueOnce({ connections });
    await expect(listIntegrationConnections({ workspaceType: "personal" })).resolves.toBe(
      connections
    );
  });

  it.each([
    { connectionId: null },
    { provider: {} },
    { name: " " },
    { zoneName: {} },
    { devices: null },
    { devices: {} },
    { devices: [null] },
    { devices: [{ name: "Missing provider identity", metrics: [] }] },
    { devices: [{ providerDeviceId: "device-1", name: {}, metrics: [] }] },
    { devices: [{ providerDeviceId: "device-1", name: "Monitor", metrics: null }] }
  ])("rejects malformed grow space fields: %j", async (invalidFields) => {
    mockApiRequest.mockResolvedValueOnce({ spaces: [{ ...space, ...invalidFields }] });
    await expect(
      listIntegrationSpaces({ workspaceType: "personal", targetRef: "grow-1" })
    ).rejects.toThrow("Integration spaces could not be verified");
  });

  it("accepts spaces without a zone or optional provenance and preserves device metadata", async () => {
    const spaces = [
      { ...space, id: "empty-space", zoneName: undefined, devices: [] },
      {
        ...space,
        devices: [
          { ...space.devices[0], metrics: [], metricMap: { vendor_key: "unmapped" } }
        ],
        provenance: { reviewedAt: "2026-10-04T12:00:00.000Z" }
      }
    ];
    mockApiRequest.mockResolvedValueOnce({ ok: true, data: { spaces } });
    await expect(
      listIntegrationSpaces({ workspaceType: "personal", targetRef: "grow-1" })
    ).resolves.toBe(spaces);
  });
});
