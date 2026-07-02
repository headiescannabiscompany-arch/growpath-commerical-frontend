const request = require("supertest");
const express = require("express");

const mockToolRun = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
};

const mockNutrientRecipe = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn()
};

jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = { id: "user_test_123" };
  next();
});

jest.mock("../models/ToolRun", () => mockToolRun);
jest.mock("../models/NutrientRecipe", () => mockNutrientRecipe);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/tools", require("./tools"));
  return app;
}

function mockFindChain(model, items) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
  model.find.mockReturnValue(chain);
  return chain;
}

describe("Tools Router (tools.js)", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test("lists tool runs for the authenticated user and selected grow", async () => {
    const items = [{ _id: "run_1", growId: "grow_1", toolType: "vpd" }];
    const chain = mockFindChain(mockToolRun, items);

    const res = await request(app).get("/api/tools?growId=grow_1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, items, tools: items });
    expect(mockToolRun.find).toHaveBeenCalledWith({
      userId: "user_test_123",
      deletedAt: null,
      growId: "grow_1"
    });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  test("creates a canonical ToolRun snapshot owned by the authenticated user", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: "run_1",
      ...payload
    }));

    const res = await request(app)
      .post("/api/tools")
      .send({
        growId: "grow_1",
        plantId: "plant_1",
        toolType: "ph-ec-check",
        input: { inputPH: 7.1 },
        output: { phStatus: "high" },
        warnings: ["Input pH is above target."]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockToolRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_test_123",
        growId: "grow_1",
        plantId: "plant_1",
        toolName: "ph-ec-check",
        toolType: "ph-ec-check",
        inputs: { inputPH: 7.1 },
        outputs: { phStatus: "high" },
        warnings: ["Input pH is above target."],
        immutableSnapshot: expect.objectContaining({
          growId: "grow_1",
          toolType: "ph-ec-check",
          inputs: { inputPH: 7.1 },
          outputs: { phStatus: "high" }
        })
      })
    );
  });

  test("rejects tool runs without grow context", async () => {
    const res = await request(app).post("/api/tools").send({ toolType: "vpd" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(mockToolRun.create).not.toHaveBeenCalled();
  });

  test("loads one ToolRun only when it belongs to the authenticated user", async () => {
    const lean = jest.fn().mockResolvedValue({ _id: "run_1", userId: "user_test_123" });
    mockToolRun.findOne.mockReturnValue({ lean });

    const res = await request(app).get("/api/tools/runs/run_1");

    expect(res.status).toBe(200);
    expect(res.body.toolRun).toEqual({ _id: "run_1", userId: "user_test_123" });
    expect(mockToolRun.findOne).toHaveBeenCalledWith({
      _id: "run_1",
      userId: "user_test_123",
      deletedAt: null
    });
  });

  test("creates a nutrient recipe for the authenticated user", async () => {
    mockNutrientRecipe.create.mockImplementation(async (payload) => ({
      _id: "recipe_1",
      ...payload
    }));

    const res = await request(app)
      .post("/api/tools/recipes")
      .send({
        growId: "grow_1",
        name: "Veg Feed",
        batchVolume: 5,
        batchUnit: "gal",
        products: [{ name: "Base", N: 3, P2O5: 1, K2O: 2 }]
      });

    expect(res.status).toBe(201);
    expect(mockNutrientRecipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_test_123",
        growId: "grow_1",
        name: "Veg Feed",
        recipeType: "nutrient_solution",
        batchVolume: 5,
        batchUnit: "gal",
        products: [{ name: "Base", N: 3, P2O5: 1, K2O: 2 }]
      })
    );
  });

  test("revises a recipe using authenticated ownership", async () => {
    mockNutrientRecipe.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "recipe_1",
        userId: "user_test_123",
        name: "Veg Feed",
        version: 2
      })
    });
    mockNutrientRecipe.create.mockResolvedValue({ _id: "recipe_2", version: 3 });

    const res = await request(app)
      .post("/api/tools/recipes/recipe_1/revisions")
      .send({ name: "Veg Feed v3" });

    expect(res.status).toBe(201);
    expect(mockNutrientRecipe.findOne).toHaveBeenCalledWith({
      _id: "recipe_1",
      userId: "user_test_123",
      deletedAt: null
    });
    expect(mockNutrientRecipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_test_123",
        parentRecipeId: "recipe_1",
        name: "Veg Feed v3",
        version: 3
      })
    );
  });

  test("records recipe use without crossing ownership", async () => {
    const updated = { _id: "recipe_1", useCount: 2 };
    mockNutrientRecipe.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(updated)
    });

    const res = await request(app).post("/api/tools/recipes/recipe_1/use");

    expect(res.status).toBe(200);
    expect(res.body.recipe).toEqual(updated);
    expect(mockNutrientRecipe.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "recipe_1", userId: "user_test_123", deletedAt: null },
      {
        $inc: { useCount: 1 },
        $set: { lastUsedAt: expect.any(Date) }
      },
      { new: true }
    );
  });
});

