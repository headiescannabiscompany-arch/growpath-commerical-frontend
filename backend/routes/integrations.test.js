const request = require("supertest");
const express = require("express");

const TEST_USER = "507f191e810c19729de860aa";
const CONNECTION_ID = "507f1f77bcf86cd799439031";

const mockIntegrationConnection = {
  find: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn()
};

const mockIntegrationAccessRequest = {
  create: jest.fn()
};

jest.mock("../models/IntegrationConnection", () => mockIntegrationConnection);
jest.mock("../models/IntegrationAccessRequest", () => mockIntegrationAccessRequest);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = TEST_USER;
    req.user = { _id: TEST_USER };
    req.ctx = { userId: TEST_USER };
    next();
  });
  app.use("/api/integrations", require("./integrations"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || "error" });
  });
  return app;
}

function chain(items) {
  return {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
}

function doc(row) {
  return {
    ...row,
    toObject: () => row
  };
}

describe("integration backend routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test("lists supported integration providers without credentials", async () => {
    const res = await request(app).get("/api/integrations/providers");

    expect(res.status).toBe(200);
    expect(res.body.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "growlink", contractStatus: "access_required" }),
        expect.objectContaining({ id: "ubibot", contractStatus: "access_required" })
      ])
    );
  });

  test("creates an owned connection and never echoes raw credentials", async () => {
    mockIntegrationConnection.create.mockResolvedValue(
      doc({
        _id: CONNECTION_ID,
        ownerUserId: TEST_USER,
        provider: "growlink",
        label: "Growlink Room",
        config: { controllerId: "controller-1" },
        credentialsEncrypted: { password: "[stored]" },
        status: "configured"
      })
    );

    const res = await request(app).post("/api/integrations/connections").send({
      provider: "growlink",
      label: "Growlink Room",
      config: { controllerId: "controller-1" },
      credentials: { password: "secret" }
    });

    expect(res.status).toBe(201);
    expect(mockIntegrationConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: TEST_USER,
        provider: "growlink",
        credentialsEncrypted: { password: "[stored]" }
      })
    );
    expect(res.body.connection).toMatchObject({
      id: CONNECTION_ID,
      provider: "growlink",
      hasCredentials: true
    });
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });

  test("lists only connections owned by the authenticated user", async () => {
    mockIntegrationConnection.find.mockReturnValue(
      chain([
        {
          _id: CONNECTION_ID,
          ownerUserId: TEST_USER,
          provider: "ubibot",
          label: "UbiBot Room",
          config: { channelId: "1419" },
          credentialsEncrypted: { accountKey: "[stored]" },
          status: "configured"
        }
      ])
    );

    const res = await request(app).get("/api/integrations/connections");

    expect(res.status).toBe(200);
    expect(mockIntegrationConnection.find).toHaveBeenCalledWith({
      ownerUserId: TEST_USER,
      deletedAt: null
    });
    expect(res.body.connections[0]).toMatchObject({
      id: CONNECTION_ID,
      provider: "ubibot",
      hasCredentials: true
    });
  });

  test("tests only an owned integration connection", async () => {
    mockIntegrationConnection.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: CONNECTION_ID,
        ownerUserId: TEST_USER,
        provider: "growlink",
        label: "Growlink Room",
        config: {},
        credentialsEncrypted: { password: "[stored]" },
        status: "access_requested",
        lastError: "Live provider validation requires configured gateway access."
      })
    });

    const res = await request(app).post(
      `/api/integrations/connections/${CONNECTION_ID}/test`
    );

    expect(res.status).toBe(200);
    expect(mockIntegrationConnection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: CONNECTION_ID, ownerUserId: TEST_USER, deletedAt: null },
      expect.objectContaining({ status: "access_requested" }),
      { new: true }
    );
    expect(res.body.connection).toMatchObject({
      id: CONNECTION_ID,
      status: "access_requested"
    });
  });

  test("records provider access requests under the authenticated user", async () => {
    mockIntegrationAccessRequest.create.mockResolvedValue({
      _id: "507f1f77bcf86cd799439032",
      provider: "ubibot",
      status: "requested"
    });

    const res = await request(app).post("/api/integrations/access-requests").send({
      provider: "ubibot",
      organization: "GrowPath"
    });

    expect(res.status).toBe(201);
    expect(mockIntegrationAccessRequest.create).toHaveBeenCalledWith({
      ownerUserId: TEST_USER,
      provider: "ubibot",
      organization: "GrowPath"
    });
    expect(res.body.accessRequest).toMatchObject({
      provider: "ubibot",
      status: "requested"
    });
  });
});
