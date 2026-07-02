const request = require("supertest");
const express = require("express");

const TEST_USER = "user_test_123";
const RUN_ID = "507f1f77bcf86cd799439011";
const RECIPE_ID = "507f1f77bcf86cd799439012";

const mockToolRun = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn()
};

const mockGrow = {
  exists: jest.fn()
};

const mockGrowLog = {
  create: jest.fn()
};

const mockTask = {
  create: jest.fn()
};

const mockNutrientRecipeModel = jest.fn(function NutrientRecipe(payload) {
  Object.assign(this, payload);
  this._id = RECIPE_ID;
  this.save = jest.fn().mockResolvedValue(this);
  this.toObject = jest.fn(() => ({ ...payload, _id: RECIPE_ID }));
});
mockNutrientRecipeModel.find = jest.fn();
mockNutrientRecipeModel.findOne = jest.fn();
mockNutrientRecipeModel.create = jest.fn();

jest.mock("../models/ToolRun", () => mockToolRun);
jest.mock("../models/Grow", () => mockGrow);
jest.mock("../models/GrowLog", () => mockGrowLog);
jest.mock("../models/Task", () => mockTask);
jest.mock("../models/NutrientRecipe", () => mockNutrientRecipeModel);
jest.mock("../models/ProductIngredient", () => ({ find: jest.fn(), create: jest.fn() }));
jest.mock("../services/createAutomationEvent", () => jest.fn().mockResolvedValue({}));

function createApp() {
  jest.isolateModules(() => {});
  const app = express();
  app.use(express.json());
  app.use("/api/tools", require("./tools"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || "error" });
  });
  return app;
}

function authed(requestBuilder) {
  return requestBuilder.set("x-test-user-id", TEST_USER);
}

function mockFindChain(model, items) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
  model.find.mockReturnValue(chain);
  return chain;
}

describe("Tools Router (tools.js)", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGrow.exists.mockResolvedValue(true);
    app = createApp();
  });

  test("lists tool runs for the authenticated user and selected grow", async () => {
    const items = [{ _id: RUN_ID, growId: "grow_1", toolType: "vpd", inputs: {}, outputs: {} }];
    const chain = mockFindChain(mockToolRun, items);

    const res = await authed(request(app).get("/api/tools?growId=grow_1"));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: RUN_ID,
      growId: "grow_1",
      toolType: "vpd",
      toolName: "vpd"
    });
    expect(mockToolRun.find).toHaveBeenCalledWith(
      expect.objectContaining({ growId: "grow_1", user: expect.any(Object) })
    );
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test("creates a canonical ToolRun snapshot owned by the authenticated user", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app)
        .post("/api/tools")
        .send({
          growId: "grow_1",
          plantId: "plant_1",
          toolType: "ph-ec-check",
          input: { inputPH: 7.1 },
          output: { phStatus: "high", warnings: ["Input pH is above target."] }
        })
    );

    expect(res.status).toBe(201);
    expect(res.body.created).toMatchObject({
      id: RUN_ID,
      growId: "grow_1",
      plantId: "plant_1",
      toolName: "ph-ec-check",
      toolType: "ph-ec-check",
      inputs: { inputPH: 7.1 },
      outputs: { phStatus: "high", warnings: ["Input pH is above target."] }
    });
    expect(mockGrow.exists).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [{ growId: "grow_1" }],
        deletedAt: null
      })
    );
    expect(mockToolRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow_1",
        plantId: "plant_1",
        toolName: "ph-ec-check",
        toolType: "ph-ec-check",
        inputs: { inputPH: 7.1 },
        outputs: { phStatus: "high", warnings: ["Input pH is above target."] }
      })
    );
  });

  test("rejects unauthenticated tool run writes", async () => {
    const res = await request(app).post("/api/tools").send({ toolType: "vpd" });

    expect(res.status).toBe(401);
    expect(mockToolRun.create).not.toHaveBeenCalled();
  });

  test("loads one ToolRun only when it belongs to the authenticated user", async () => {
    mockToolRun.findOne.mockResolvedValue({
      _id: RUN_ID,
      user: "object-user",
      toolName: "vpd",
      inputs: {},
      outputs: {}
    });

    const res = await authed(request(app).get(`/api/tools/runs/${RUN_ID}`));

    expect(res.status).toBe(200);
    expect(res.body.toolRun).toMatchObject({ id: RUN_ID, toolName: "vpd" });
    expect(mockToolRun.findOne).toHaveBeenCalledWith({
      _id: RUN_ID,
      user: expect.any(Object)
    });
  });

  test("saves an owned ToolRun to a grow log and links it back", async () => {
    const run = {
      _id: RUN_ID,
      user: "object-user",
      growId: "grow_1",
      plantId: "plant_1",
      toolName: "vpd",
      result: { status: "ok" },
      save: jest.fn().mockResolvedValue(null)
    };
    mockToolRun.findOne.mockResolvedValue(run);
    mockGrowLog.create.mockResolvedValue({ _id: "log_1", title: "Saved VPD" });

    const res = await authed(
      request(app)
        .post(`/api/tools/runs/${RUN_ID}/save-log`)
        .send({ title: "Saved VPD" })
    );

    expect(res.status).toBe(201);
    expect(mockGrow.exists).toHaveBeenCalled();
    expect(mockGrowLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: `personal:${TEST_USER}`,
        userId: TEST_USER,
        growId: "grow_1",
        plantId: "plant_1",
        title: "Saved VPD",
        linkedToolRunId: RUN_ID
      })
    );
    expect(run.linkedLogId).toBe("log_1");
    expect(run.save).toHaveBeenCalled();
  });

  test("creates a source-linked task from an owned ToolRun", async () => {
    const run = {
      _id: RUN_ID,
      user: "object-user",
      growId: "grow_1",
      plantId: "plant_1",
      toolName: "vpd",
      recommendations: ["Check again tomorrow."],
      linkedTaskIds: [],
      save: jest.fn().mockResolvedValue(null)
    };
    mockToolRun.findOne.mockResolvedValue(run);
    mockTask.create.mockResolvedValue({ _id: "task_1", title: "Follow up" });

    const res = await authed(
      request(app)
        .post(`/api/tools/runs/${RUN_ID}/create-task`)
        .send({ title: "Follow up", priority: "high" })
    );

    expect(res.status).toBe(201);
    expect(mockTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: `personal:${TEST_USER}`,
        createdByUserId: TEST_USER,
        growId: "grow_1",
        plantId: "plant_1",
        title: "Follow up",
        priority: "high",
        sourceType: "tool_run",
        sourceObjectId: RUN_ID,
        sourceToolRunId: RUN_ID
      })
    );
    expect(run.linkedTaskId).toBe("task_1");
    expect(run.linkedTaskIds).toEqual(["task_1"]);
    expect(run.save).toHaveBeenCalled();
  });

  test("creates a nutrient recipe for the authenticated user", async () => {
    const res = await authed(
      request(app)
        .post("/api/tools/recipes")
        .send({
          growId: "grow_1",
          name: "Veg Feed",
          batchVolume: 5,
          batchUnit: "gal",
          products: [
            { name: "Base", amount: 10, unit: "ml", N: 3, P2O5: 1, K2O: 2 }
          ]
        })
    );

    expect(res.status).toBe(201);
    expect(mockNutrientRecipeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow_1",
        name: "Veg Feed",
        batchVolume: 5,
        batchUnit: "gal",
        products: [
          { name: "Base", amount: 10, unit: "ml", N: 3, P2O5: 1, K2O: 2 }
        ]
      })
    );
  });

  test("revises a recipe using authenticated ownership", async () => {
    const previous = {
      _id: RECIPE_ID,
      user: "object-user",
      growId: "grow_1",
      name: "Veg Feed",
      description: "",
      version: 2,
      stage: "veg",
      medium: "soil",
      batchVolume: 5,
      batchUnit: "gal",
      products: [{ name: "Base", amount: 10, unit: "ml", N: 3, P2O5: 1, K2O: 2 }],
      releaseEnvironment: {},
      waterBaseline: {},
      measuredEC: null,
      measuredPH: null,
      notes: "",
      toObject: () => ({
        growId: "grow_1",
        name: "Veg Feed",
        version: 2,
        batchVolume: 5,
        batchUnit: "gal",
        products: [{ name: "Base", amount: 10, unit: "ml", N: 3, P2O5: 1, K2O: 2 }]
      }),
      save: jest.fn().mockResolvedValue(null)
    };
    mockNutrientRecipeModel.findOne.mockResolvedValue(previous);
    mockNutrientRecipeModel.create.mockResolvedValue({ _id: "recipe_2", version: 3 });

    const res = await authed(
      request(app)
        .post(`/api/tools/recipes/${RECIPE_ID}/revisions`)
        .send({ name: "Veg Feed v3" })
    );

    expect(res.status).toBe(201);
    expect(mockNutrientRecipeModel.findOne).toHaveBeenCalledWith({
      _id: RECIPE_ID,
      user: expect.any(Object),
      active: true
    });
    expect(previous.active).toBe(false);
    expect(previous.save).toHaveBeenCalled();
    expect(mockNutrientRecipeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Veg Feed v3",
        version: 3,
        previousVersionId: RECIPE_ID
      })
    );
  });
});
