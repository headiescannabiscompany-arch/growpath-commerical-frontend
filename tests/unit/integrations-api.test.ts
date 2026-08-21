const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  createIntegrationConnection,
  listIntegrationConnections,
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
