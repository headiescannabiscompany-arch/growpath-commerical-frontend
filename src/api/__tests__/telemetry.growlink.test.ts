import {
  createTelemetrySource,
  listGrowlinkControllers,
  listTelemetrySources,
  pullGrowlinkCurrentReadings,
  pullGrowlinkHistoricalWindow,
  TELEMETRY_ROUTES,
  verifyGrowlinkCredentials
} from "../telemetry";
import { apiRequest } from "../apiRequest";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("telemetry Growlink API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  test("verifies Growlink credentials through the telemetry API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: { tokenType: "bearer", expiresIn: 3600 }
    });

    await expect(
      verifyGrowlinkCredentials({
        userName: "grower@example.com",
        password: "secret"
      })
    ).resolves.toEqual({ ok: true, tokenType: "bearer", expiresIn: 3600 });

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.GROWLINK_VERIFY, {
      method: "POST",
      body: { userName: "grower@example.com", password: "secret" }
    });
  });

  test("lists Growlink controllers and normalizes ids", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        controllers: [
          { id: "controller-1", name: "Flower A" },
          { _id: "controller-2", name: "Veg" }
        ]
      }
    });

    await expect(
      listGrowlinkControllers({
        userName: "grower@example.com",
        password: "secret"
      })
    ).resolves.toEqual([
      { id: "controller-1", name: "Flower A" },
      { id: "controller-2", _id: "controller-2", name: "Veg" }
    ]);

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.GROWLINK_CONTROLLERS, {
      method: "POST",
      body: { userName: "grower@example.com", password: "secret" }
    });
  });

  test("pulls Growlink current readings by telemetry source", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        pulled: "5",
        ingested: "4",
        updated: "1",
        lastPointIso: "2026-06-22T13:00:00Z"
      }
    });

    await expect(pullGrowlinkCurrentReadings("source_1")).resolves.toEqual({
      sourceId: "source_1",
      pulled: 5,
      ingested: 4,
      updated: 1,
      skipped: undefined,
      lastPointIso: "2026-06-22T13:00:00Z"
    });

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.GROWLINK_CURRENT, {
      method: "POST",
      body: { sourceId: "source_1" }
    });
  });

  test("pulls Growlink historical reporting window", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        pulled: "12",
        ingested: "10",
        updated: "2",
        skipped: "0",
        lastPointIso: "2026-06-22T13:00:00Z"
      }
    });

    await expect(
      pullGrowlinkHistoricalWindow(
        "source_1",
        "2026-06-22T00:00:00Z",
        "2026-06-22T13:00:00Z"
      )
    ).resolves.toEqual({
      sourceId: "source_1",
      pulled: 12,
      ingested: 10,
      updated: 2,
      skipped: 0,
      startIso: "2026-06-22T00:00:00Z",
      endIso: "2026-06-22T13:00:00Z",
      lastPointIso: "2026-06-22T13:00:00Z"
    });

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.GROWLINK_PULL, {
      method: "POST",
      body: {
        sourceId: "source_1",
        startIso: "2026-06-22T00:00:00Z",
        endIso: "2026-06-22T13:00:00Z"
      }
    });
  });

  test("redacts Growlink secrets when normalizing telemetry sources", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        sources: [
          {
            id: "source_1",
            growId: "grow_1",
            type: "growlink",
            name: "Growlink Flower A",
            timezone: "America/Denver",
            config: {
              growlink: {
                controllerId: "controller-1",
                userName: "grower@example.com",
                password: "secret",
                passwordEncrypted: "cipher",
                accessToken: "token",
                accessTokenEncrypted: "token-cipher"
              }
            }
          }
        ]
      }
    });

    await expect(listTelemetrySources("grow_1")).resolves.toEqual([
      expect.objectContaining({
        id: "source_1",
        type: "growlink",
        config: {
          growlink: {
            controllerId: "controller-1",
            userName: "grower@example.com"
          }
        }
      })
    ]);
  });

  test("creates Growlink telemetry sources without changing the generic source contract", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        source: {
          id: "source_1",
          growId: "grow_1",
          type: "growlink",
          name: "Growlink Flower A",
          timezone: "America/Denver",
          config: { growlink: { controllerId: "controller-1" } }
        }
      }
    });

    await expect(
      createTelemetrySource({
        growId: "grow_1",
        type: "growlink",
        name: "Growlink Flower A",
        timezone: "America/Denver",
        config: { growlink: { controllerId: "controller-1" } }
      })
    ).resolves.toEqual(
      expect.objectContaining({
        id: "source_1",
        type: "growlink",
        config: { growlink: { controllerId: "controller-1" } }
      })
    );

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.SOURCES, {
      method: "POST",
      body: {
        growId: "grow_1",
        type: "growlink",
        name: "Growlink Flower A",
        timezone: "America/Denver",
        isActive: true,
        config: { growlink: { controllerId: "controller-1" } }
      }
    });
  });
});
