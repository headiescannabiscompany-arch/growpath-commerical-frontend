const request = require("supertest");
const express = require("express");

const TEST_USER = "507f191e810c19729de860aa";
const GROW_ID = "507f1f77bcf86cd799439011";
const SOURCE_ID = "507f1f77bcf86cd799439017";

const mockGrow = {
  exists: jest.fn()
};

const mockTelemetrySource = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
};

const mockTelemetryPoint = {
  find: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn()
};

jest.mock("../models/Grow", () => mockGrow);
jest.mock("../models/TelemetrySource", () => mockTelemetrySource);
jest.mock("../models/TelemetryPoint", () => mockTelemetryPoint);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = TEST_USER;
    req.user = { _id: TEST_USER };
    req.ctx = { userId: TEST_USER };
    next();
  });
  app.use("/api/telemetry", require("./telemetry"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || "error" });
  });
  return app;
}

function chain(items) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
}

function doc(row) {
  return {
    ...row,
    toObject: () => row
  };
}

describe("telemetry backend routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGrow.exists.mockResolvedValue(true);
    app = createApp();
  });

  test("creates a telemetry source only for a grow owned by the authenticated user", async () => {
    mockTelemetrySource.create.mockResolvedValue(
      doc({
        _id: SOURCE_ID,
        ownerUserId: TEST_USER,
        growId: GROW_ID,
        type: "ubibot",
        name: "UbiBot Room",
        timezone: "America/New_York",
        isActive: true,
        config: {
          ubibot: {
            channelId: "1419",
            accountKey: "secret",
            accountKeyEncrypted: "cipher"
          }
        }
      })
    );

    const res = await request(app).post("/api/telemetry/sources").send({
      growId: GROW_ID,
      type: "ubibot",
      name: "UbiBot Room",
      config: { ubibot: { channelId: "1419", accountKey: "secret" } }
    });

    expect(res.status).toBe(201);
    expect(mockGrow.exists).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: [{ $or: [{ user: TEST_USER }, { userId: TEST_USER }] }]
      })
    );
    expect(mockTelemetrySource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: TEST_USER,
        growId: GROW_ID,
        type: "ubibot"
      })
    );
    expect(res.body.source).toMatchObject({
      id: SOURCE_ID,
      type: "ubibot",
      config: { ubibot: { channelId: "1419" } }
    });
  });

  test("rejects source creation when the grow is not owned by the user", async () => {
    mockGrow.exists.mockResolvedValue(false);

    const res = await request(app).post("/api/telemetry/sources").send({
      growId: GROW_ID,
      type: "manual",
      name: "Manual readings"
    });

    expect(res.status).toBe(404);
    expect(mockTelemetrySource.create).not.toHaveBeenCalled();
  });

  test("lists only telemetry sources owned by the authenticated user", async () => {
    mockTelemetrySource.find.mockReturnValue(
      chain([
        {
          _id: SOURCE_ID,
          ownerUserId: TEST_USER,
          growId: GROW_ID,
          type: "growlink",
          name: "Growlink Room",
          config: {
            growlink: {
              controllerId: "controller-1",
              password: "secret",
              accessToken: "token"
            }
          }
        }
      ])
    );

    const res = await request(app).get(`/api/telemetry/sources?growId=${GROW_ID}`);

    expect(res.status).toBe(200);
    expect(mockTelemetrySource.find).toHaveBeenCalledWith({
      ownerUserId: TEST_USER,
      deletedAt: null,
      growId: GROW_ID
    });
    expect(res.body.sources[0]).toMatchObject({
      id: SOURCE_ID,
      config: { growlink: { controllerId: "controller-1" } }
    });
  });

  test("ingests telemetry points only after source ownership is confirmed", async () => {
    mockTelemetrySource.findOne.mockResolvedValue({ _id: SOURCE_ID, ownerUserId: TEST_USER });
    mockTelemetryPoint.updateOne.mockResolvedValue({ upsertedCount: 1 });

    const res = await request(app).post("/api/telemetry/points:bulk").send({
      sourceId: SOURCE_ID,
      points: [{ ts: "2026-07-09T12:00:00.000Z", airTempC: 24, rh: 60 }]
    });

    expect(res.status).toBe(200);
    expect(mockTelemetrySource.findOne).toHaveBeenCalledWith({
      _id: SOURCE_ID,
      ownerUserId: TEST_USER,
      deletedAt: null
    });
    expect(mockTelemetryPoint.updateOne).toHaveBeenCalledWith(
      { sourceId: SOURCE_ID, ts: new Date("2026-07-09T12:00:00.000Z") },
      expect.objectContaining({
        $set: expect.objectContaining({
          sourceId: SOURCE_ID,
          airTempC: 24,
          rh: 60
        })
      }),
      { upsert: true }
    );
    expect(res.body).toEqual({ ingested: 1, updated: 0, skipped: 0 });
  });

  test("does not expose points for a telemetry source owned by another user", async () => {
    mockTelemetrySource.findOne.mockResolvedValue(null);

    const res = await request(app).get(
      `/api/telemetry/points?sourceId=${SOURCE_ID}&startIso=2026-07-09T00:00:00.000Z`
    );

    expect(res.status).toBe(404);
    expect(mockTelemetryPoint.find).not.toHaveBeenCalled();
  });
});
