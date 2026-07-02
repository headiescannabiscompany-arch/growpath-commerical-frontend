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

  test("runs pH/EC range check and saves a canonical ToolRun", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app)
        .post("/api/tools/ph-ec-check")
        .send({
          growId: "grow_1",
          medium: "coco",
          stage: "flower",
          inputPH: 6.0,
          runoffPH: 6.8,
          inputEC: 1.4,
          runoffEC: 2.8,
          ecUnit: "mS/cm",
          waterSource: "RO"
        })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      runoffECStatus: "high",
      driftDirection: "runoff_higher",
      retestTaskSuggestion: expect.objectContaining({ title: "Retest pH / EC" })
    });
    expect(res.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Runoff EC is materially higher than input EC.",
        "Runoff EC is above the selected target range.",
        "Runoff pH is outside the selected target range."
      ])
    );
    expect(mockToolRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "ph_ec_check",
        toolType: "ph_ec_check",
        inputs: expect.objectContaining({ growId: "grow_1", runoffEC: 2.8 })
      })
    );
  });

  test("runs topdress planner with late flower warning", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app)
        .post("/api/tools/topdress-plan")
        .send({
          growId: "grow_1",
          plantCount: 4,
          soilVolumePerPlant: 10,
          soilVolumeUnit: "gallons",
          stage: "late_flower",
          productName: "Craft Blend",
          doseRate: 2,
          doseUnit: "tbsp_per_gallon",
          plannedApplyDate: "2026-07-03T12:00:00.000Z"
        })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      amountPerPlant: 20,
      totalAmount: 80,
      amountUnit: "tbsp",
      taskToCreate: expect.objectContaining({ title: "Topdress Craft Blend" })
    });
    expect(res.body.outputs.warnings[0]).toMatch(/Late flower topdressing/);
  });

  test("runs dry amendment mix builder with guaranteed-analysis output", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app)
        .post("/api/tools/dry-amendment-mix")
        .send({
          growId: "grow_1",
          recipeName: "Test 3-3-3",
          ingredients: [
            {
              name: "Meal A",
              amount: 500,
              amountUnit: "grams",
              N: 3,
              P2O5: 3,
              K2O: 3,
              releaseClass: "medium"
            },
            {
              name: "Mineral B",
              amount: 500,
              amountUnit: "grams",
              N: 0,
              P2O5: 0,
              K2O: 0,
              Ca: 20,
              releaseClass: "slow"
            }
          ],
          dosePerGallonSoil: 10
        })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      recipeName: "Test 3-3-3",
      totalAnalysis: expect.objectContaining({
        N: 1.5,
        P2O5: 1.5,
        K2O: 1.5,
        elementalP: 0.65,
        elementalK: 1.25,
        Ca: 10
      }),
      dosePerCubicFoot: 74.81
    });
    expect(res.body.outputs.releaseTimeline.medium[0]).toMatchObject({
      name: "Meal A"
    });
  });

  test("runs dry/cure guard without treating temperatures above 68F as automatic failure", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app)
        .post("/api/tools/dry-cure-guard")
        .send({
          growId: "grow_1",
          mode: "curing",
          dryRoomTemp: 72,
          tempUnit: "F",
          dryRoomRH: 60,
          jarRH: 70
        })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      moldRisk: "high",
      overdryRisk: "low",
      nextAction: "Inspect and vent immediately"
    });
    expect(res.body.outputs.recommendations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/above the common 60F target/),
        "Jar RH is high. Open jars, inspect for mold, and allow moisture to drop."
      ])
    );
    expect(res.body.outputs.realisticNotes).toMatch(/not the only path/i);
  });

  test("runs soil builder and nutrient source comparison foundations", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const soil = await authed(
      request(app)
        .post("/api/tools/soil-builder")
        .send({
          growId: "grow_1",
          mixName: "Living soil",
          totalVolume: 30,
          volumeUnit: "gallons",
          basePercent: 33,
          compostPercent: 33,
          aerationPercent: 34,
          amendments: [{ name: "Kelp meal", doseRate: 0.5, releaseClass: "medium" }]
        })
    );
    const comparison = await authed(
      request(app)
        .post("/api/tools/nutrient-source-comparison")
        .send({ growId: "grow_1", nutrient: "calcium", intent: "long_term_soil" })
    );

    expect(soil.status).toBe(201);
    expect(soil.body.outputs).toMatchObject({
      totalGallons: 30,
      totalCubicFeet: 4.01,
      recipe: expect.objectContaining({ recipeType: "soil_mix" })
    });
    expect(comparison.status).toBe(201);
    expect(comparison.body.outputs).toMatchObject({
      nutrient: "calcium",
      bestChoiceByIntent: "calcitic lime",
      slowSources: expect.arrayContaining(["oyster shell"])
    });
  });

  test("runs stress testing and clone rooting tools", async () => {
    mockGrow.exists.mockResolvedValue(true);
    mockToolRun.create.mockImplementation((payload) => ({
      _id: RUN_ID,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const stress = await authed(
      request(app)
        .post("/api/tools/stress-test")
        .send({
          growId: "grow_1",
          plantId: "plant_1",
          stressType: "heat",
          severity: 8,
          recoveryDays: 3,
          damageScore: 7,
          vigorScore: 6,
          stabilitySignals: "intersex watch"
        })
    );
    const clone = await authed(
      request(app)
        .post("/api/tools/clone-rooting")
        .send({
          growId: "grow_1",
          daysSinceCut: 16,
          humidity: 60,
          temperature: 68,
          lightIntensity: 320,
          stemCondition: "black slime",
          leafCondition: "wilt"
        })
    );

    expect(stress.status).toBe(201);
    expect(stress.body.outputs).toMatchObject({
      riskLevel: "high",
      keeperImpact: "negative_until_retested",
      tags: expect.arrayContaining(["stress-test", "stability-watch"])
    });
    expect(clone.status).toBe(201);
    expect(clone.body.outputs.riskLevel).toBe("high");
    expect(clone.body.outputs.likelyBottlenecks).toEqual(
      expect.arrayContaining([
        "Humidity may be too low for fresh cuts.",
        "Light intensity may be too strong for unrooted cuts."
      ])
    );
  });

  test("runs run comparison and auto grow calendar tools", async () => {
    mockGrow.exists.mockResolvedValue(true);
    mockToolRun.create.mockImplementation((payload) => ({
      _id: RUN_ID,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const comparison = await authed(
      request(app)
        .post("/api/tools/run-comparison")
        .send({
          growId: "grow_1",
          runs: [
            { name: "Run 1", yieldAmount: 14, qualityScore: 7, issueCount: 4, days: 120 },
            { name: "Run 2", yieldAmount: 18, qualityScore: 8, issueCount: 1, days: 112 }
          ]
        })
    );
    const calendar = await authed(
      request(app)
        .post("/api/tools/auto-grow-calendar")
        .send({
          growId: "grow_1",
          plantCount: 4,
          startDate: "2026-07-01",
          vegLengthWeeks: 4,
          expectedFlowerDays: 63
        })
    );

    expect(comparison.status).toBe(201);
    expect(comparison.body.outputs.bestRun).toMatchObject({ name: "Run 2" });
    expect(comparison.body.outputs.differences.yieldSpread).toBe(4);
    expect(calendar.status).toBe(201);
    expect(calendar.body.outputs.stageTimeline).toMatchObject({
      startDate: "2026-07-01",
      flipDate: "2026-07-29",
      expectedHarvestStart: "2026-09-23"
    });
    expect(calendar.body.outputs.taskSchedule).toHaveLength(5);
  });

  test("runs tissue culture and living soil batch tools", async () => {
    mockGrow.exists.mockResolvedValue(true);
    mockToolRun.create.mockImplementation((payload) => ({
      _id: RUN_ID,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const tc = await authed(
      request(app)
        .post("/api/tools/tissue-culture")
        .send({
          growId: "grow_1",
          projectName: "TC mother backup",
          batchNumber: "TC-001",
          vessels: 20,
          contaminatedVessels: 5,
          rootedVessels: 6,
          acclimatedPlants: 3,
          mediaRecipe: "starter",
          SOPVersion: "SOP-1"
        })
    );
    const batch = await authed(
      request(app)
        .post("/api/tools/living-soil-batch")
        .send({
          growId: "grow_1",
          recipeId: "living-soil-base",
          batchVolume: 100,
          bagSize: 2,
          ingredientCosts: [
            { name: "Compost", quantity: 35, unit: "gal", cost: 70 },
            { name: "Aeration", quantity: 35, unit: "gal", cost: 50 }
          ],
          laborCost: 100,
          packagingCost: 40,
          shrinkagePercent: 4,
          targetMarginPercent: 40
        })
    );

    expect(tc.status).toBe(201);
    expect(tc.body.outputs).toMatchObject({
      projectStatus: "active",
      contaminationRate: 25,
      rootingRate: 30
    });
    expect(tc.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Contamination rate is elevated. Review sterilization, explant prep, media handling, and vessel sealing notes."
      ])
    );
    expect(batch.status).toBe(201);
    expect(batch.body.outputs).toMatchObject({
      bagCount: 48,
      totalBatchCost: 260,
      costPerBag: 5.42
    });
    expect(batch.body.outputs.ingredientPullSheet).toHaveLength(2);
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
