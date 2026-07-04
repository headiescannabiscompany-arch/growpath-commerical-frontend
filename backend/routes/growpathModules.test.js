const request = require("supertest");
const express = require("express");

const TEST_USER = "user_test_123";
const RECORD_ID = "507f1f77bcf86cd799439099";

const mockGrowpathModuleRecord = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn()
};

jest.mock("../models/GrowpathModuleRecord", () => mockGrowpathModuleRecord);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/growpath-modules", require("./growpathModules"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || "error" });
  });
  return app;
}

function authed(requestBuilder) {
  return requestBuilder.set("x-test-user-id", TEST_USER);
}

function mockFindChain(items) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
  mockGrowpathModuleRecord.find.mockReturnValue(chain);
  return chain;
}

describe("GrowPath module records router", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test("lists supported module record types", async () => {
    const res = await request(app).get("/api/growpath-modules/types");

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual(
      expect.arrayContaining([
        "ipm_scout",
        "pheno_hunt",
        "topdress_plan",
        "nutrient_source_comparison",
        "soil_nutrient_batch"
      ])
    );
  });

  test("requires authentication for module record listing", async () => {
    const res = await request(app).get("/api/growpath-modules");

    expect(res.status).toBe(401);
    expect(mockGrowpathModuleRecord.find).not.toHaveBeenCalled();
  });

  test("lists owned module records with filters", async () => {
    const chain = mockFindChain([
      {
        _id: RECORD_ID,
        userId: TEST_USER,
        recordType: "pheno_hunt",
        title: "Sour Diesel hunt",
        growId: "grow-1",
        warnings: ["Missing smoke review"],
        tags: ["early_sex"]
      }
    ]);

    const res = await authed(
      request(app).get(
        "/api/growpath-modules?recordType=pheno_hunt&growId=grow-1&tag=early_sex"
      )
    );

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      id: RECORD_ID,
      recordType: "pheno_hunt",
      title: "Sour Diesel hunt",
      warnings: ["Missing smoke review"],
      tags: ["early_sex"]
    });
    expect(mockGrowpathModuleRecord.find).toHaveBeenCalledWith({
      userId: TEST_USER,
      deletedAt: null,
      recordType: "pheno_hunt",
      growId: "grow-1",
      tags: "early_sex"
    });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chain.limit).toHaveBeenCalledWith(100);
  });

  test("creates an owned module record from a tool output", async () => {
    mockGrowpathModuleRecord.create.mockImplementation(async (payload) => ({
      _id: RECORD_ID,
      ...payload,
      toObject: () => ({ _id: RECORD_ID, ...payload })
    }));

    const res = await authed(
      request(app)
        .post("/api/growpath-modules")
        .send({
          recordType: "ipm_scout",
          title: "Leaf stippling scout",
          growId: "grow-1",
          linkedToolRunId: "tool-run-1",
          localRuleResult: { suspectedIssues: [{ issueName: "thrips possible" }] },
          aiVerificationResult: {
            likelyIssues: [{ issueName: "possible thrips pressure" }]
          },
          warnings: ["Re-scout before treatment"],
          tags: ["ipm-scout", "pest"]
        })
    );

    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({
      id: RECORD_ID,
      userId: TEST_USER,
      recordType: "ipm_scout",
      title: "Leaf stippling scout",
      linkedToolRunId: "tool-run-1"
    });
    expect(mockGrowpathModuleRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_USER,
        recordType: "ipm_scout",
        title: "Leaf stippling scout",
        linkedToolRunId: "tool-run-1",
        tags: ["ipm-scout", "pest"]
      })
    );
  });

  test("rejects unsupported module record types", async () => {
    const res = await authed(
      request(app)
        .post("/api/growpath-modules")
        .send({ recordType: "random_note", title: "Bad record" })
    );

    expect(res.status).toBe(400);
    expect(mockGrowpathModuleRecord.create).not.toHaveBeenCalled();
  });

  test("updates and archives owned module records", async () => {
    mockGrowpathModuleRecord.findOneAndUpdate
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({
          _id: RECORD_ID,
          userId: TEST_USER,
          recordType: "pheno_hunt",
          title: "Sour Diesel hunt",
          userDecision: "needs_follow_up"
        })
      })
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({
          _id: RECORD_ID,
          userId: TEST_USER,
          recordType: "pheno_hunt",
          title: "Sour Diesel hunt",
          status: "archived"
        })
      });

    const patch = await authed(
      request(app)
        .patch(`/api/growpath-modules/${RECORD_ID}`)
        .send({ recordType: "ipm_scout", userDecision: "needs_follow_up" })
    );

    expect(patch.status).toBe(200);
    expect(patch.body.item.userDecision).toBe("needs_follow_up");
    expect(mockGrowpathModuleRecord.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { _id: RECORD_ID, userId: TEST_USER, deletedAt: null },
      expect.not.objectContaining({ recordType: "ipm_scout" }),
      { new: true, runValidators: true }
    );

    const archive = await authed(
      request(app).delete(`/api/growpath-modules/${RECORD_ID}`)
    );

    expect(archive.status).toBe(200);
    expect(mockGrowpathModuleRecord.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { _id: RECORD_ID, userId: TEST_USER, deletedAt: null },
      expect.objectContaining({ status: "archived", deletedAt: expect.any(Date) }),
      { new: true }
    );
  });
});
