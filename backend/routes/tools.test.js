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

const mockProductIngredient = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn()
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
jest.mock("../models/ProductIngredient", () => mockProductIngredient);
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
    const items = [
      { _id: RUN_ID, growId: "grow_1", toolType: "vpd", inputs: {}, outputs: {} }
    ];
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
      request(app).post(`/api/tools/runs/${RUN_ID}/save-log`).send({ title: "Saved VPD" })
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
      request(app).post("/api/tools/ph-ec-check").send({
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
      canonicalDriftDirection: "input_to_runoff_up",
      retestTaskSuggestion: expect.objectContaining({ title: "Retest pH / EC" })
    });
    expect(res.body.outputs.riskCodes).toEqual(
      expect.arrayContaining(["salt_buildup", "lockout_risk", "low_buffering"])
    );
    expect(res.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Runoff EC is materially higher than input EC.",
        "Runoff EC is above the selected target range.",
        "Runoff pH is outside the selected target range.",
        "RO water has low buffering. Calcium/magnesium and alkalinity context matter.",
        "Do not recommend exact pH Up/Down dosing unless product concentration and water volume are known."
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

  test("runs PPFD/DLI planner with stage-aware light stress warnings", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app).post("/api/tools/ppfd-dli").send({
        growId: "grow_1",
        stage: "clone",
        targetDli: 22,
        photoperiodHours: 18,
        measuredPpfd: 420,
        leafResponse: "taco and bleaching"
      })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      stage: "clone",
      photoperiodHours: 18,
      targetDli: 22,
      requiredPpfd: expect.any(Number),
      measuredDli: expect.any(Number),
      status: expect.any(String),
      tasksToCreate: [
        expect.objectContaining({
          title: "Check light stress response",
          priority: "high"
        })
      ]
    });
    expect(res.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Seedlings/clones may be under too much light for stable rooting and early growth.",
        "Leaf posture or bleaching symptoms suggest light stress; compare against VPD, temperature, and root-zone status before increasing intensity."
      ])
    );
  });

  test("runs NPK recipe with elemental conversion, water baseline, and compatibility warnings", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app)
        .post("/api/tools/npk-recipe")
        .send({
          growId: "grow_1",
          batchVolume: 5,
          batchUnit: "gal",
          stage: "flower",
          medium: "coco",
          measuredEC: 3.2,
          measuredPH: 7.1,
          isConcentrate: true,
          waterBaseline: {
            Ca: 20,
            Mg: 5,
            sourceEC: 0.2,
            sourcePH: 7.4,
            alkalinityPpm: 120
          },
          products: [
            {
              name: "Calcium Base",
              amount: 10,
              unit: "g",
              N: 15,
              Ca: 19,
              sourceType: "manufacturer",
              chemistryKey: "water_soluble_nitrate"
            },
            {
              name: "PK Boost",
              amount: 10,
              unit: "g",
              P: 10,
              K: 20,
              sourceType: "user_entered",
              chemistryKey: "soluble_phosphate"
            }
          ]
        })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      batchGallons: 5,
      productCount: 2,
      totals: expect.objectContaining({
        Pppm: expect.any(Number),
        Kppm: expect.any(Number),
        Cappm: expect.any(Number)
      }),
      waterBaseline: expect.objectContaining({
        totals: expect.objectContaining({
          Cappm: 20,
          Mgppm: 5
        })
      }),
      measured: { ec: 3.2, ph: 7.1 },
      sourceConfidence: expect.objectContaining({
        overall: expect.any(String)
      })
    });
    expect(res.body.outputs.totals.Pppm).toBeCloseTo(23.1, 1);
    expect(res.body.outputs.totals.Kppm).toBeCloseTo(87.7, 1);
    expect(res.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Measured EC is high. Confirm cultivar/stage tolerance before applying.",
        "Measured feed pH is outside a common fertigation target range. Verify medium-specific targets before feeding."
      ])
    );
    expect(res.body.outputs.mixingOrder.length).toBeGreaterThan(0);
    expect(res.body.outputs.availabilityEstimate).toHaveProperty("windows");
    expect(res.body.outputs.releaseTimeline).toBeTruthy();
  });

  test("runs watering planner with dryback pressure and recovery warnings", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app).post("/api/tools/watering").send({
        growId: "grow_1",
        potVolume: 5,
        potUnit: "gal",
        medium: "coco",
        stage: "flower",
        drybackTargetPercent: 20,
        actualDrybackPercent: 34,
        runoffTargetPercent: 10,
        actualRunoffPercent: 1,
        vpdKpa: 1.7,
        recoveryTimeHours: 30,
        leafResponse: "wilt and stalled"
      })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      medium: "coco",
      stage: "flower",
      wateringIntent: "generative",
      pressureLevel: "high",
      recoveryStatus: "poor_recovery",
      drybackTargetPercent: 20,
      actualDrybackPercent: 34,
      actualRunoffPercent: 1,
      vpdKpa: 1.7,
      tasksToCreate: [
        expect.objectContaining({
          title: "Check plant recovery after watering",
          priority: "high"
        })
      ]
    });
    expect(res.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Actual dryback exceeded the target by a meaningful margin.",
        "Dryback is high enough to treat as steering pressure, not routine watering.",
        "Very low runoff in coco/salt-style systems can increase salt buildup risk.",
        "High VPD can speed dryback and increase irrigation demand.",
        "Recovery longer than 24 hours suggests the previous dryback or irrigation pressure was too high.",
        "Leaf response suggests this watering/dryback pattern may be causing stress damage."
      ])
    );
  });

  test("reviews environment readings for dew point, VPD, and light risk", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app).post("/api/tools/environment-review").send({
        growId: "grow_1",
        stage: "late_flower",
        tempDayC: 22,
        tempNightC: 12,
        humidity: 78,
        vpd: 0.55,
        dli: 48,
        lightHours: 14
      })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      stage: "late_flower",
      riskLevel: "high",
      dewPointC: expect.any(Number),
      dewPointSpreadC: expect.any(Number),
      tasksToCreate: [
        expect.objectContaining({
          title: "Inspect environment risk zones",
          priority: "high"
        })
      ]
    });
    expect(res.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "High humidity in flower increases mold and bud rot risk.",
        "Dew point spread is tight; inspect dense canopy and flower surfaces.",
        "Low VPD can reduce transpiration and contribute to calcium-transport symptoms.",
        "Very high DLI late flower can add heat/light pressure and reduce finish quality if plants are not tolerating it.",
        "Large day/night temperature swings can complicate VPD, color, uptake, and condensation risk.",
        "Flowering photoperiod appears long; verify crop type, genetics, and light schedule."
      ])
    );
  });

  test("reviews feeding schedules for stage, medium, pH, and EC risk", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app)
        .post("/api/tools/feeding-schedule-review")
        .send({
          growId: "grow_1",
          productName: "Bloom Line",
          growMedium: "coco",
          stage: "late_flower",
          weeks: 10,
          inputEC: 2.8,
          runoffEC: 4.1,
          inputPH: 7.0,
          runoffPH: 6.3,
          waterSource: "well",
          schedule: [
            {
              week: 9,
              stage: "late flower",
              amount: "heavy grow nitrogen feed"
            }
          ]
        })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      productName: "Bloom Line",
      medium: "coco",
      stage: "late_flower",
      rowCount: 1,
      riskLevel: "high",
      tasksToCreate: [
        expect.objectContaining({
          title: "Review feeding schedule before applying",
          priority: "high"
        }),
        expect.objectContaining({
          title: "Log input EC/pH and runoff after next feed"
        })
      ]
    });
    expect(res.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Late flower/ripening schedules should avoid heavy late nitrogen or high EC unless intentionally justified.",
        "Coco/hydro-style feeding should track runoff or root-zone EC trends, not just input schedule.",
        "Input EC is high for many cultivars/stages. Confirm tolerance before applying.",
        "Runoff EC is materially higher than input EC; review buildup before increasing feed.",
        "Input pH is outside a common fertigation target range. Verify medium-specific targets.",
        "Runoff pH drift is large enough to trend before changing feed strength.",
        "City/well water may contain alkalinity or minerals that change pH/EC interpretation."
      ])
    );
  });

  test("runs topdress planner with late flower warning", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app).post("/api/tools/topdress-plan").send({
        growId: "grow_1",
        plantCount: 4,
        soilVolumePerPlant: 10,
        soilVolumeUnit: "gallons",
        stage: "late_flower",
        productName: "Craft Blend",
        doseRate: 2,
        doseUnit: "tbsp_per_gallon",
        releaseClass: "slow",
        daysUntilHarvest: 14,
        plannedApplyDate: "2026-07-03T12:00:00.000Z"
      })
    );

    expect(res.status).toBe(201);
    expect(res.body.outputs).toMatchObject({
      amountPerPlant: 20,
      totalAmount: 80,
      amountUnit: "tbsp",
      releaseClass: "slow",
      purposeFit: "review_before_apply",
      releaseWindowDays: expect.objectContaining({ min: 30, max: 120 }),
      taskToCreate: expect.objectContaining({ title: "Topdress Craft Blend" })
    });
    expect(res.body.outputs.warnings[0]).toMatch(/Late flower topdressing/);
    expect(res.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Expected release may start too late for the likely harvest window."
      ])
    );
    expect(res.body.outputs.followUpTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Water in topdress" }),
        expect.objectContaining({ title: "Check plant response after topdress" })
      ])
    );
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
          desiredStage: "late_flower",
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
      guaranteedAnalysis: expect.objectContaining({
        N: 1.5,
        P2O5: 1.5,
        K2O: 1.5
      }),
      elementalBreakdown: expect.objectContaining({
        P: 0.65,
        K: 1.25,
        Ca: 10
      }),
      deliveryCurve: expect.objectContaining({
        longTermBackgroundCount: 1
      }),
      stageFit: "review_before_use",
      dosePerCubicFoot: 74.81
    });
    expect(res.body.outputs.releaseTimeline.medium[0]).toMatchObject({
      name: "Meal A",
      role: "mid-window support"
    });
    expect(res.body.outputs.stageTimingWarnings).toEqual(
      expect.arrayContaining([
        "Slow release ingredients may not affect the current late-flower window."
      ])
    );
  });

  test("runs dry/cure guard without treating temperatures above 68F as automatic failure", async () => {
    mockToolRun.create.mockImplementation(async (payload) => ({
      _id: RUN_ID,
      ...payload,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const res = await authed(
      request(app).post("/api/tools/dry-cure-guard").send({
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
          intendedUse: "seedling",
          stage: "seedling",
          basePercent: 33,
          compostPercent: 33,
          aerationPercent: 34,
          amendments: [
            {
              name: "Fast N meal",
              doseRate: 0.5,
              releaseClass: "fast",
              sourceConfidence: "low"
            },
            { name: "Gypsum", doseRate: 0.25, releaseClass: "slow" }
          ]
        })
    );
    const comparison = await authed(
      request(app).post("/api/tools/nutrient-source-comparison").send({
        growId: "grow_1",
        nutrient: "calcium",
        intent: "long_term_soil",
        stage: "late flower",
        medium: "coco"
      })
    );

    expect(soil.status).toBe(201);
    expect(soil.body.outputs).toMatchObject({
      totalGallons: 30,
      totalCubicFeet: 4.01,
      intendedUse: "seedling",
      purposeFit: "review_before_use",
      recipe: expect.objectContaining({ recipeType: "soil_mix" })
    });
    expect(soil.body.outputs.releaseTimeline.fast[0]).toMatchObject({
      name: "Fast N meal",
      role: "near-term support"
    });
    expect(soil.body.outputs.stageTimingWarnings).toEqual(
      expect.arrayContaining([
        "This mix may be too hot for seedlings or fresh clones because fast-release inputs were entered."
      ])
    );
    expect(soil.body.outputs.sourceConfidenceWarnings).toEqual(
      expect.arrayContaining([
        "Compost/castings nutrient contribution is estimated unless a lab or label analysis is entered.",
        "One or more amendment/mineral inputs have low source confidence."
      ])
    );
    expect(soil.body.outputs.compatibilityWarnings).toEqual(
      expect.arrayContaining([
        "Gypsum supplies calcium/sulfur support but is not pH down."
      ])
    );
    expect(comparison.status).toBe(201);
    expect(comparison.body.outputs).toMatchObject({
      nutrient: "calcium",
      desiredSpeed: "long_term_soil_building",
      bestChoiceByIntent: "calcitic lime",
      slowSources: expect.arrayContaining(["oyster shell"]),
      bestUseCase:
        "Use slow sources as soil-building/background nutrition, not urgent rescue."
    });
    expect(comparison.body.outputs.intentQuestions[0]).toMatch(
      /current calcium transport issue/
    );
    expect(comparison.body.outputs.timingWarnings).toEqual(
      expect.arrayContaining([
        "Long-term soil-building sources may release too slowly for late flower or finish correction.",
        "Slow organic/mineral sources may not behave predictably in coco/hydro compared with biologically active soil."
      ])
    );
    expect(comparison.body.outputs.pHEffectWarnings).toEqual(
      expect.arrayContaining([
        "Gypsum supplies calcium/sulfur support without being pH down."
      ])
    );
  });

  test("runs stress testing and clone rooting tools", async () => {
    mockGrow.exists.mockResolvedValue(true);
    mockToolRun.create.mockImplementation((payload) => ({
      _id: RUN_ID,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const stress = await authed(
      request(app).post("/api/tools/stress-test").send({
        growId: "grow_1",
        plantId: "plant_1",
        stressType: "heat",
        severity: 8,
        recoveryDays: 3,
        hoursToRecover: 72,
        damageScore: 7,
        vigorScore: 6,
        stabilitySignals: "intersex watch",
        notes: "quality drop after heat"
      })
    );
    const clone = await authed(
      request(app).post("/api/tools/clone-rooting").send({
        growId: "grow_1",
        daysSinceCut: 16,
        cloneCount: 10,
        rootedCount: 1,
        failedCount: 3,
        motherPlantHealth: "stressed",
        humidity: 60,
        temperature: 68,
        lightIntensity: 320,
        stemCondition: "black slime",
        leafCondition: "wilt",
        mediumStatus: "too wet",
        rootingStatus: "no visible roots"
      })
    );

    expect(stress.status).toBe(201);
    expect(stress.body.outputs).toMatchObject({
      riskLevel: "high",
      keeperImpact: "negative_until_retested",
      recoveryStatus: "poor_recovery",
      selectionSignals: expect.objectContaining({
        cropSteeringCandidate: false,
        rejectOrRetest: true
      }),
      phenoImpact: "retest_before_keeper_decision",
      tags: expect.arrayContaining([
        "stress-test",
        "stability-watch",
        "recovery_poor",
        "quality_loss_under_stress"
      ])
    });
    expect(stress.body.outputs.tasksToCreate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Recheck stress recovery" }),
        expect.objectContaining({ title: "Photograph same plant after stress test" })
      ])
    );
    expect(clone.status).toBe(201);
    expect(clone.body.outputs).toMatchObject({
      riskLevel: "high",
      rootingProgress: "delayed",
      clonePerformanceSummary: expect.objectContaining({
        cloneCount: 10,
        rootedCount: 1,
        rootingPercent: 10
      })
    });
    expect(clone.body.outputs.likelyBottlenecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "mother_health" }),
        expect.objectContaining({ issue: "Humidity may be too low for fresh clones" }),
        expect.objectContaining({ issue: "Light may be too strong for fresh clones" }),
        expect.objectContaining({ category: "medium" }),
        expect.objectContaining({ issue: "Delayed rooting" })
      ])
    );
    expect(clone.body.outputs.tags).toEqual(
      expect.arrayContaining([
        "mother_health_issue",
        "low_humidity",
        "overwet_medium",
        "delayed_rooting"
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
            {
              name: "Run 1",
              cultivar: "Sour Diesel",
              yieldAmount: 14,
              qualityScore: 7,
              issueCount: 4,
              days: 120,
              averageVpd: 1.1
            },
            {
              name: "Run 2",
              cultivar: "Sour Diesel",
              yieldAmount: 18,
              qualityScore: 8,
              issueCount: 1,
              days: 112,
              averageVpd: 1.3,
              averageDli: 40
            }
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
          expectedFlowerDays: 63,
          plants: [
            {
              plantId: "plant_1",
              cultivar: "Sour Diesel",
              expectedFlowerDaysMin: 63,
              expectedFlowerDaysMax: 70
            },
            {
              plantId: "plant_2",
              cultivar: "Haze Hybrid",
              expectedFlowerDaysMin: 70,
              expectedFlowerDaysMax: 77
            }
          ]
        })
    );

    expect(comparison.status).toBe(201);
    expect(comparison.body.outputs.bestRun).toMatchObject({ name: "Run 2" });
    expect(comparison.body.outputs.differences.yieldSpread).toBe(4);
    expect(comparison.body.outputs.structuredSummary).toMatchObject({
      summaryStats: expect.objectContaining({
        yieldDifference: 4,
        issueCountDifference: 3
      }),
      sameCultivar: true
    });
    expect(comparison.body.outputs.keyDifferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "yield" }),
        expect.objectContaining({ category: "issues" })
      ])
    );
    expect(comparison.body.outputs.likelyDrivers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ driver: "Higher yield run" }),
        expect.objectContaining({ driver: "Lower issue pressure" })
      ])
    );
    expect(comparison.body.outputs.missingData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "taskCompletionRate" }),
        expect.objectContaining({ field: "dryDays" })
      ])
    );
    expect(calendar.status).toBe(201);
    expect(calendar.body.outputs.stageTimeline).toMatchObject({
      startDate: "2026-07-01",
      flipDate: "2026-07-29",
      expectedHarvestStart: "2026-09-23"
    });
    expect(calendar.body.outputs.taskSchedule).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Pre-flip review" }),
        expect.objectContaining({ title: "Flower day 1" }),
        expect.objectContaining({ title: "Harvest readiness check" }),
        expect.objectContaining({ title: "Dry room setup" })
      ])
    );
    expect(calendar.body.outputs.plantSpecificHarvestWindows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cultivar: "Sour Diesel",
          start: "2026-09-23",
          end: "2026-10-14"
        }),
        expect.objectContaining({
          cultivar: "Haze Hybrid",
          start: "2026-09-30",
          end: "2026-10-21"
        })
      ])
    );
    expect(calendar.body.outputs.reminders).toEqual(
      expect.arrayContaining([
        "Flower time is a range. Breeder timing is a reference, not a command."
      ])
    );
  });

  test("runs tissue culture and soil nutrient batch tools", async () => {
    mockGrow.exists.mockResolvedValue(true);
    mockToolRun.create.mockImplementation((payload) => ({
      _id: RUN_ID,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const tc = await authed(
      request(app).post("/api/tools/tissue-culture").send({
        growId: "grow_1",
        projectName: "TC mother backup",
        batchNumber: "TC-001",
        cropType: "cannabis",
        vessels: 20,
        contaminatedVessels: 5,
        fungusVessels: 1,
        browningVessels: 2,
        stalledVessels: 1,
        rootedVessels: 6,
        acclimatedPlants: 3,
        stage: "initiation",
        productionPhase: "production",
        transferCycle: 11,
        maxProductionTransfers: 12,
        technicianOwner: "Ailda",
        motherBlockStartDate: "2026-01-01",
        productionEndDate: "2026-06-01",
        mediaType: "best fit box",
        vesselType: "glass jar",
        explantType: "node",
        explantSize: "small",
        symptoms: "fuzzy mold, browning near explant",
        mediaRecipe: "starter",
        SOPVersion: "SOP-1",
        mediaCost: 40,
        vesselSupplyCost: 30,
        laborCost: 50
      })
    );
    const batch = await authed(
      request(app)
        .post("/api/tools/soil-nutrient-batch")
        .send({
          growId: "grow_1",
          recipeId: "living-soil-base",
          purpose: "seedling",
          stage: "seedling",
          batchVolume: 100,
          bagSize: 2,
          ingredients: [
            {
              name: "Compost",
              quantity: 35,
              unit: "gal",
              cost: 70,
              N: 1,
              P2O5: 1,
              K2O: 1,
              releaseClass: "slow",
              sourceConfidence: "low",
              category: "compost"
            },
            {
              name: "Fast N meal",
              quantity: 35,
              unit: "gal",
              cost: 50,
              N: 8,
              P2O5: 0,
              K2O: 0,
              releaseClass: "fast",
              sourceConfidence: "medium"
            }
          ],
          laborCost: 100,
          packagingCost: 40,
          shrinkagePercent: 4,
          targetMarginPercent: 40
        })
    );

    expect(tc.status).toBe(201);
    expect(tc.body.outputs).toMatchObject({
      projectStatus: "at_risk",
      contaminationRate: 25,
      fungusRate: 5,
      rootingRate: 30,
      targetBands: expect.objectContaining({
        fungusTargetPercent: 2,
        fungusDangerPercent: 4.5,
        overallTargetPercent: 10
      }),
      productionControls: expect.objectContaining({
        productionPhase: "production",
        transferCycle: 11,
        maxProductionTransfers: 12,
        transfersRemaining: 1,
        technicianOwner: "Ailda",
        mediaType: "best fit box",
        vesselType: "glass jar",
        explantSizeTradeoff: expect.stringContaining("Larger explants")
      }),
      acclimationGuidance: expect.objectContaining({
        greenhouseTransition: expect.stringContaining("Remove media")
      }),
      vesselStatus: expect.objectContaining({
        contaminatedVessels: 5,
        fungusVessels: 1,
        browningVessels: 2,
        stalledVessels: 1
      }),
      successMetrics: expect.objectContaining({
        totalExplantsStarted: 20,
        contaminatedExplants: 5,
        fungusExplants: 1,
        oxidizedExplants: 2
      }),
      costTracking: expect.objectContaining({
        totalProjectCost: 120,
        costPerVessel: 6,
        costPerCleanVessel: 8,
        costPerAcclimatedPlant: 40
      }),
      explantPreset: expect.objectContaining({
        explantType: "node",
        warning: expect.stringContaining("Cannabis TC response varies")
      }),
      diagnosisRecord: expect.objectContaining({
        tags: expect.arrayContaining(["contamination", "oxidation"]),
        taskSuggestions: expect.arrayContaining([
          expect.objectContaining({ title: "Isolate or cull contaminated TC vessels" }),
          expect.objectContaining({ title: "Review TC browning and oxidation pattern" })
        ])
      }),
      complianceRecord: expect.objectContaining({
        batchNumber: "TC-001",
        mediaRecipe: "starter",
        mediaCost: 40,
        vesselSupplyCost: 30,
        laborCost: 50,
        stage: "initiation",
        productionPhase: "production",
        transferCycle: 11,
        maxProductionTransfers: 12,
        technicianOwner: "Ailda"
      })
    });
    expect(tc.body.outputs.diagnosisRecord.likelyFailureModes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "Likely contamination",
          counterEvidence: expect.arrayContaining([
            "15 vessel(s) are not marked contaminated"
          ]),
          taskSuggestions: expect.arrayContaining([
            expect.objectContaining({
              title: "Audit TC sterilization and media handling notes"
            })
          ])
        }),
        expect.objectContaining({
          issue: "Possible browning or oxidation",
          counterEvidence: expect.arrayContaining([
            "18 vessel(s) are not marked browning"
          ])
        })
      ])
    );
    expect(tc.body.outputs.generatedCalendar).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Review TC batch issue notes" }),
        expect.objectContaining({ title: "Refresh production line from mother block" }),
        expect.objectContaining({ title: "Check for early contamination" })
      ])
    );
    expect(tc.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Contamination rate is elevated. Review sterilization, explant prep, media handling, and vessel sealing notes.",
        "Fungus pressure is above the production danger band. Isolate affected vessels and review room/tool hygiene immediately.",
        "Overall contamination is above the commercial target band. Audit transfer technique, media lots, vessel handling, and room workflow.",
        "This production line is nearing its transfer-cycle limit. Plan a mother-block refresh before the next production turn."
      ])
    );
    expect(batch.status).toBe(201);
    expect(batch.body.outputs).toMatchObject({
      bagCount: 48,
      totalBatchCost: 260,
      costPerBag: 5.42,
      purpose: "seedling",
      purposeFit: "review_before_use",
      guaranteedAnalysisEstimate: {
        N: 4.5,
        P2O5: 0.5,
        K2O: 0.5
      }
    });
    expect(batch.body.outputs.releaseTimeline.fast[0]).toMatchObject({
      name: "Fast N meal",
      role: "near-term support"
    });
    expect(batch.body.outputs.releaseTimeline.slow[0]).toMatchObject({
      name: "Compost",
      role: "long-term soil building"
    });
    expect(batch.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "This batch may be too hot for seedlings or fresh clones. Reduce fast-release fertility or use a gentler starter mix.",
        "Compost/castings nutrient contribution is estimated and should not be treated as exact guaranteed analysis."
      ])
    );
    expect(batch.body.outputs.ingredientPullSheet).toHaveLength(2);
  });

  test("runs IPM scout and species crop identification tools", async () => {
    mockGrow.exists.mockResolvedValue(true);
    mockToolRun.create.mockImplementation((payload) => ({
      _id: RUN_ID,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const ipm = await authed(
      request(app).post("/api/tools/ipm-scout").send({
        growId: "grow_1",
        plantId: "plant_1",
        pestSeen: "mites",
        leafDamage: "stippling",
        undersideInspection: "webbing under leaf",
        stickyTrapCount: 12,
        notes: "mites, webbing"
      })
    );
    const cropId = await authed(
      request(app).post("/api/tools/species-crop-id").send({
        growId: "grow_1",
        userEnteredName: "Cannabis",
        scientificName: "Cannabis sativa",
        cultivar: "Blue Dream",
        commonNames: "Cannabis, hemp",
        identificationNotes: "serrated leaves, photoperiod",
        userConfirmed: false
      })
    );

    expect(ipm.status).toBe(201);
    expect(ipm.body.outputs).toMatchObject({
      suspectedIssue: "pest_pressure",
      suspectedOrganism: "mites possible",
      severity: "medium",
      primaryAnswer: expect.objectContaining({
        source: "growpathai_ipm_scout",
        suspectedIssue: "pest_pressure",
        suspectedOrganism: "mites possible"
      }),
      gptVerification: expect.objectContaining({
        provider: "gpt",
        status: "pending_gpt_review",
        requiredForTreatmentDecision: true,
        documentationTarget: "ToolRun.outputs.gptVerification"
      }),
      documentation: expect.objectContaining({
        savedAs: "ToolRun",
        includeBothAnswers: true
      })
    });
    expect(ipm.body.outputs.gptVerification.prompt).toMatch(/IPM verification assistant/);
    expect(ipm.body.outputs.verificationDisplay).toHaveLength(2);
    expect(ipm.body.toolRun.outputs.gptVerification).toMatchObject({
      provider: "gpt",
      status: "pending_gpt_review"
    });
    expect(ipm.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Verify IPM findings with magnification/photos and GPT second review before treatment decisions."
      ])
    );
    expect(ipm.body.outputs.taskSuggestions[0]).toMatchObject({
      title: "Repeat IPM scout"
    });
    expect(cropId.status).toBe(201);
    expect(cropId.body.outputs).toMatchObject({
      likelyCrop: "Cannabis",
      scientificName: "Cannabis sativa",
      commonNames: ["Cannabis", "hemp"],
      cultivarOrStrain: "Blue Dream",
      confirmationRequired: true,
      userConfirmationRequired: true,
      recommendationContext: expect.stringContaining("Confirm Cannabis identity")
    });
    expect(cropId.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Confirm crop identity before relying on crop-specific recommendations."
      ])
    );
  });

  test("identifies a cannabis flower draft without requiring a grow", async () => {
    mockToolRun.create.mockImplementation((payload) => ({
      _id: RUN_ID,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const cropId = await authed(
      request(app)
        .post("/api/tools/species-crop-id")
        .send({
          userEnteredName: "Cannabis",
          scientificName: "Cannabis sativa",
          commonNames: "Cannabis",
          identificationNotes:
            "Dense flower with visible pistils, resinous sugar leaves, and trichome coverage.",
          userConfirmed: false,
          imageAnalysis: {
            requested: true,
            performed: true,
            photoCount: 1,
            provider: "openai",
            providerLabel: "OpenAI vision crop identity",
            confidence: "high",
            quality: "usable",
            identifyingVisualTraits:
              "Visible bracts, pistils, sugar leaves, and dense inflorescence structure."
          }
        })
    );

    expect(cropId.status).toBe(201);
    expect(mockGrow.exists).not.toHaveBeenCalled();
    expect(cropId.body.outputs).toMatchObject({
      likelyCrop: "Cannabis",
      scientificName: "Cannabis sativa",
      confidence: "high",
      userConfirmationRequired: true,
      imageAnalysis: {
        requested: true,
        performed: true,
        photoCount: 1,
        provider: "openai",
        providerLabel: "OpenAI vision crop identity",
        confidence: "high",
        quality: "usable"
      },
      cropProfileSuggestion: {
        source: "ai_vision_draft"
      }
    });
    expect(cropId.body.toolRun.growId).toBeNull();
  });

  test("runs genetics inventory and harvest readiness tools", async () => {
    mockGrow.exists.mockResolvedValue(true);
    mockToolRun.create.mockImplementation((payload) => ({
      _id: RUN_ID,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const genetics = await authed(
      request(app).post("/api/tools/genetics-inventory").send({
        growId: "grow_1",
        cultivar: "Keeper Kush",
        breeder: "House line",
        parentage: "(A x B) x C",
        seedType: "regular",
        materialType: "mother",
        feedingResponse: "heavy feeder",
        stressNotes: "heat tolerant, roots fast",
        flowerTime: 63,
        aromaFlavorNotes: "gas, citrus"
      })
    );
    const harvest = await authed(
      request(app).post("/api/tools/harvest-readiness").send({
        growId: "grow_1",
        plantId: "plant_1",
        flowerDay: 61,
        breederFlowerTime: 63,
        cloudyPercent: 70,
        amberPercent: 7,
        clearPercent: 10,
        pistilStatus: "mostly_receded",
        budSwellStatus: "fully_swollen",
        sampleLocation: "mixed_bud_sites",
        aromaIntensity: "strong",
        userGoal: "balanced"
      })
    );
    const harvestWithoutTrichomes = await authed(
      request(app).post("/api/tools/harvest-readiness").send({
        growId: "grow_1",
        flowerDay: 61,
        breederFlowerTime: 63,
        cloudyPercent: "",
        amberPercent: "",
        clearPercent: "",
        pistilStatus: "mostly_receded",
        budSwellStatus: "fully_swollen",
        sampleLocation: "mixed_bud_sites"
      })
    );

    expect(genetics.status).toBe(201);
    expect(genetics.body.outputs).toMatchObject({
      cultivar: "Keeper Kush",
      breeder: "House line",
      feedingResponse: "heavy feeder",
      materialType: "mother",
      geneticsInventoryItem: expect.objectContaining({
        cultivar: "Keeper Kush",
        materialType: "mother",
        tags: expect.arrayContaining([
          "heavy_feeder",
          "stress_resistant",
          "roots_fast",
          "notable_aroma"
        ])
      }),
      observedTraits: expect.objectContaining({
        feedingResponse: "heavy feeder",
        rootingBehavior: "roots_fast"
      })
    });
    expect(genetics.body.outputs.parentageWarnings).toEqual(
      expect.arrayContaining([
        "Parentage grouping is present; preserve the exact text because (A x B) x C is not the same as A x (B x C)."
      ])
    );
    expect(genetics.body.outputs.keeperSignals).toEqual(
      expect.arrayContaining(["63 day flower estimate", "2 stress notes"])
    );
    expect(harvest.status).toBe(201);
    expect(harvestWithoutTrichomes.status).toBe(201);
    expect(harvestWithoutTrichomes.body.outputs).toMatchObject({
      readinessStatus: "early",
      trichomeObservation: {
        clearPercent: null,
        cloudyPercent: null,
        amberPercent: null,
        sampleLocation: "mixed_bud_sites",
        evidenceStatus: "missing"
      }
    });
    expect(harvestWithoutTrichomes.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Trichome percentages are missing")
      ])
    );
    expect(harvest.body.outputs).toMatchObject({
      readinessStatus: "ready_soon",
      harvestTask: expect.objectContaining({ title: "Recheck harvest readiness" }),
      trichomeObservation: expect.objectContaining({
        cloudyPercent: 70,
        amberPercent: 7,
        sampleLocation: "mixed_bud_sites"
      }),
      wholePlantMaturity: expect.objectContaining({
        pistilStatus: "mostly_receded",
        budSwellStatus: "fully_swollen"
      }),
      userGoalInterpretation: expect.stringMatching(/Balanced goal/)
    });
    expect(harvest.body.outputs.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factor: "pistils" }),
        expect.objectContaining({ factor: "bud_swell" }),
        expect.objectContaining({ factor: "user_goal" })
      ])
    );
    expect(harvest.body.outputs.tasksToCreate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Check trichomes again" }),
        expect.objectContaining({ title: "Prepare dry room" })
      ])
    );
    expect(harvest.body.outputs.estimatedWindow).toMatchObject({
      startDay: 61,
      targetDay: 63,
      endDay: 77,
      confidence: expect.any(String)
    });
    expect(harvest.body.outputs.breederTimelineInterpretation).toMatch(/day 77/);
    expect(harvest.body.outputs.recommendations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Cloudy-dominant/),
        expect.stringMatching(/structurally finished/),
        expect.stringMatching(/Dying and receding hairs/),
        expect.stringMatching(/breeder day 63/i)
      ])
    );
  });

  test("runs inventory, crop steering project, and pheno hunt tools", async () => {
    mockGrow.exists.mockResolvedValue(true);
    mockToolRun.create.mockImplementation((payload) => ({
      _id: RUN_ID,
      toObject: () => ({ _id: RUN_ID, ...payload })
    }));

    const inventory = await authed(
      request(app).post("/api/tools/personal-inventory").send({
        growId: "grow_1",
        name: "Kelp meal",
        category: "amendment",
        quantity: 1,
        unit: "lb",
        reorderAt: 2,
        cost: 12,
        recipeUseRate: 0.25
      })
    );
    const steering = await authed(
      request(app).post("/api/tools/crop-steering-project").send({
        growId: "grow_1",
        steeringIntent: "generative",
        stage: "mid flower",
        drybackPercent: 42,
        inputEC: 1.6,
        runoffEC: 3.1,
        recoveryHours: 30,
        plantResponse: "leaf edge stress"
      })
    );
    const pheno = await authed(
      request(app)
        .post("/api/tools/pheno-hunt")
        .send({
          growId: "grow_1",
          projectName: "F2 keeper search",
          plants: [
            {
              label: "P1",
              vigor: 9,
              aroma: 9,
              resin: 9,
              stressResistance: 8,
              yieldScore: 8,
              sexWeek: 4,
              cloneRootingDays: 9,
              recoveryHours: 8
            },
            {
              label: "P2",
              vigor: 4,
              aroma: 4,
              resin: 5,
              stressResistance: 4,
              yieldScore: 4,
              notes: "herm under stress"
            }
          ]
        })
    );

    expect(inventory.status).toBe(201);
    expect(inventory.body.outputs.lowStockWarnings).toEqual(
      expect.arrayContaining(["Kelp meal is at or below reorder threshold."])
    );
    expect(inventory.body.outputs.reorderSuggestions[0]).toMatchObject({
      title: "Reorder Kelp meal"
    });
    expect(inventory.body.outputs.recipeAvailability).toBe(4);
    expect(inventory.body.outputs.costPerUse).toBe(3);
    expect(steering.status).toBe(201);
    expect(steering.body.outputs).toMatchObject({
      steeringIntent: "generative",
      pressureLevel: "excessive",
      plantResponse: "negative",
      recoveryStatus: "poor_recovery",
      steeringOutcome: "exceeded_useful_steering",
      phenoImpact: "dryback_sensitive"
    });
    expect(steering.body.outputs.warnings).toEqual(
      expect.arrayContaining([
        "Dryback is high. Watch stress response before pushing generative pressure further.",
        "Runoff EC is materially higher than input EC."
      ])
    );
    expect(pheno.status).toBe(201);
    expect(pheno.body.outputs.comparisonMatrix[0]).toMatchObject({
      label: "P1",
      keeperDecision: "keeper_candidate",
      keeperCategory: expect.any(String),
      sexExpression: expect.objectContaining({
        vegWeekSexObserved: 4,
        earlySexSignal: true
      }),
      clonePerformance: expect.objectContaining({
        daysToRoot: 9
      })
    });
    expect(pheno.body.outputs.comparisonMatrix[0].tags).toEqual(
      expect.arrayContaining(["early_sex", "roots_fast", "recovery_strong"])
    );
    expect(pheno.body.outputs.keeperRecommendations[0]).toMatchObject({ label: "P1" });
    expect(pheno.body.outputs.retestRecommendations[0]).toMatchObject({
      label: "P2",
      keeperDecision: "retest_or_reject_stability"
    });
    expect(pheno.body.outputs.phenoTags.P2).toEqual(
      expect.arrayContaining(["stability_concern"])
    );
  });

  test("updates and archives an owned ToolRun", async () => {
    const run = {
      _id: RUN_ID,
      user: "object-user",
      growId: "grow_1",
      plantId: "plant_1",
      toolName: "ipm_scout",
      toolType: "ipm_scout",
      inputs: { pestSeen: "mites" },
      outputs: { severity: "medium" },
      recommendations: [],
      warnings: [],
      linkedTaskIds: [],
      save: jest.fn().mockResolvedValue(null)
    };
    mockToolRun.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);

    const updated = await authed(
      request(app)
        .patch(`/api/tools/runs/${RUN_ID}`)
        .send({
          summary: "Updated scout note",
          outputs: { severity: "high" },
          warnings: ["Pressure increased"]
        })
    );
    const archived = await authed(request(app).delete(`/api/tools/runs/${RUN_ID}`));

    expect(updated.status).toBe(200);
    expect(run.summary).toBe("Updated scout note");
    expect(run.outputs).toEqual({ severity: "high" });
    expect(run.save).toHaveBeenCalledTimes(2);
    expect(archived.status).toBe(200);
    expect(archived.body.archived).toBe(true);
    expect(run.status).toBe("archived");
    expect(run.archivedAt).toBeInstanceOf(Date);
  });

  test("reads, updates, and archives product ingredients for the authenticated user", async () => {
    const item = {
      _id: "ingredient_1",
      name: "Kelp meal",
      releaseSpeed: "medium",
      releaseWindow: "days_7_21",
      supplier: "Local supply",
      cost: 18,
      documentUrl: "https://example.test/coa.pdf",
      photoUrl: "https://example.test/label.jpg",
      applicationNotes: "Topdress and water in.",
      micronutrientNotes: "Contains trace minerals.",
      archivedAt: null
    };
    mockProductIngredient.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(item)
    });
    const sourceRecords = [
      {
        sourceName: "Manufacturer label",
        sourceType: "manufacturer_label",
        url: "https://example.test/label",
        commercialUseAllowed: true,
        trainingUseAllowed: false,
        confidence: "medium"
      }
    ];
    mockProductIngredient.findOneAndUpdate
      .mockResolvedValueOnce({
        _id: "ingredient_1",
        name: "Kelp meal",
        favorite: true,
        releaseSpeed: "slow",
        releaseWindow: "days_45_90",
        supplier: "Trusted supplier",
        cost: 42,
        documentUrl: "https://example.test/updated-coa.pdf",
        photoUrl: "https://example.test/updated-label.jpg",
        applicationNotes: "Better for established plants.",
        micronutrientNotes: "Adds calcium and trace minerals.",
        sourceRecords
      })
      .mockResolvedValueOnce({
        _id: "ingredient_1",
        name: "Kelp meal",
        archivedAt: new Date()
      });

    const loaded = await authed(request(app).get("/api/tools/ingredients/ingredient_1"));
    const updated = await authed(
      request(app).patch("/api/tools/ingredients/ingredient_1").send({
        favorite: true,
        releaseSpeed: "slow",
        releaseWindow: "days_45_90",
        supplier: "Trusted supplier",
        cost: 42,
        documentUrl: "https://example.test/updated-coa.pdf",
        photoUrl: "https://example.test/updated-label.jpg",
        applicationNotes: "Better for established plants.",
        micronutrientNotes: "Adds calcium and trace minerals.",
        sourceRecords
      })
    );
    const archived = await authed(
      request(app).delete("/api/tools/ingredients/ingredient_1")
    );

    expect(loaded.status).toBe(200);
    expect(loaded.body.item).toMatchObject({
      name: "Kelp meal",
      releaseSpeed: "medium",
      releaseWindow: "days_7_21",
      supplier: "Local supply",
      cost: 18,
      documentUrl: "https://example.test/coa.pdf",
      photoUrl: "https://example.test/label.jpg",
      applicationNotes: "Topdress and water in.",
      micronutrientNotes: "Contains trace minerals."
    });
    expect(updated.status).toBe(200);
    expect(updated.body.updated).toMatchObject({
      favorite: true,
      releaseSpeed: "slow",
      releaseWindow: "days_45_90",
      supplier: "Trusted supplier",
      cost: 42,
      documentUrl: "https://example.test/updated-coa.pdf",
      photoUrl: "https://example.test/updated-label.jpg",
      applicationNotes: "Better for established plants.",
      micronutrientNotes: "Adds calcium and trace minerals.",
      sourceRecords: [expect.objectContaining({ sourceName: "Manufacturer label" })]
    });
    expect(archived.status).toBe(200);
    expect(archived.body.archived).toBe(true);
    expect(mockProductIngredient.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "ingredient_1", user: expect.any(Object) },
      {
        favorite: true,
        releaseSpeed: "slow",
        releaseWindow: "days_45_90",
        supplier: "Trusted supplier",
        cost: 42,
        documentUrl: "https://example.test/updated-coa.pdf",
        photoUrl: "https://example.test/updated-label.jpg",
        applicationNotes: "Better for established plants.",
        micronutrientNotes: "Adds calcium and trace minerals.",
        sourceRecords
      },
      { new: true, runValidators: true }
    );
    expect(mockProductIngredient.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "ingredient_1", user: expect.any(Object), archivedAt: null },
      { archivedAt: expect.any(Date) },
      { new: true }
    );
  });

  test("updates and archives nutrient recipes for the authenticated user", async () => {
    const recipe = {
      _id: RECIPE_ID,
      user: "object-user",
      growId: "grow_1",
      name: "Veg Feed",
      description: "",
      version: 1,
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
      active: true,
      toObject: function toObject() {
        return {
          growId: this.growId,
          name: this.name,
          stage: this.stage,
          medium: this.medium,
          batchVolume: this.batchVolume,
          batchUnit: this.batchUnit,
          products: this.products,
          releaseEnvironment: this.releaseEnvironment,
          waterBaseline: this.waterBaseline,
          measuredEC: this.measuredEC,
          measuredPH: this.measuredPH,
          notes: this.notes
        };
      },
      save: jest.fn().mockResolvedValue(null)
    };
    const sourceRecords = [
      {
        sourceName: "Lab feed chart",
        sourceType: "user_entered",
        confidence: "medium"
      }
    ];
    mockNutrientRecipeModel.findOne
      .mockResolvedValueOnce(recipe)
      .mockResolvedValueOnce(recipe);

    const updated = await authed(
      request(app)
        .patch(`/api/tools/recipes/${RECIPE_ID}`)
        .send({ name: "Veg Feed Updated", measuredEC: 1.4, sourceRecords })
    );
    const archived = await authed(request(app).delete(`/api/tools/recipes/${RECIPE_ID}`));

    expect(updated.status).toBe(200);
    expect(recipe.name).toBe("Veg Feed Updated");
    expect(recipe.measuredEC).toBe(1.4);
    expect(recipe.sourceRecords).toEqual(sourceRecords);
    expect(recipe.calculation).toBeTruthy();
    expect(archived.status).toBe(200);
    expect(archived.body.archived).toBe(true);
    expect(recipe.active).toBe(false);
    expect(recipe.archivedAt).toBeInstanceOf(Date);
    expect(recipe.save).toHaveBeenCalledTimes(2);
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
          products: [{ name: "Base", amount: 10, unit: "ml", N: 3, P2O5: 1, K2O: 2 }],
          sourceRecords: [
            {
              sourceName: "Manufacturer label",
              sourceType: "manufacturer_label",
              confidence: "medium"
            }
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
        products: [{ name: "Base", amount: 10, unit: "ml", N: 3, P2O5: 1, K2O: 2 }],
        sourceRecords: [
          expect.objectContaining({
            sourceName: "Manufacturer label",
            sourceType: "manufacturer_label"
          })
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

  test("clones a recipe using authenticated ownership", async () => {
    const source = {
      _id: RECIPE_ID,
      user: "object-user",
      growId: "grow_1",
      name: "Veg Feed",
      description: "Baseline veg feed",
      version: 2,
      stage: "veg",
      medium: "soil",
      batchVolume: 5,
      batchUnit: "gal",
      products: [{ name: "Base", amount: 10, unit: "ml", N: 3, P2O5: 1, K2O: 2 }],
      releaseEnvironment: { soilTempC: 22 },
      waterBaseline: { sourceEC: 0.2 },
      measuredEC: 1.2,
      measuredPH: 6.4,
      sourceConfidence: { overall: "medium" },
      sourceRecords: [
        { sourceName: "Manufacturer label", sourceType: "manufacturer_label" }
      ],
      mixingOrder: ["Base"],
      calculation: { totals: { Nppm: 20 } },
      notes: "Keep pH stable."
    };
    mockNutrientRecipeModel.findOne.mockResolvedValue(source);

    const res = await authed(
      request(app)
        .post(`/api/tools/recipes/${RECIPE_ID}/clone`)
        .send({ name: "Veg Feed copy" })
    );

    expect(res.status).toBe(201);
    expect(mockNutrientRecipeModel.findOne).toHaveBeenCalledWith({
      _id: RECIPE_ID,
      user: expect.any(Object)
    });
    expect(res.body.recipe).toMatchObject({
      name: "Veg Feed copy",
      clonedFromRecipeId: RECIPE_ID,
      version: 1,
      sourceRecords: [expect.objectContaining({ sourceName: "Manufacturer label" })]
    });
  });

  test("records nutrient recipe use as a linked ToolRun and feeding history event", async () => {
    const recipe = {
      _id: RECIPE_ID,
      user: "object-user",
      growId: "grow_1",
      name: "Veg Feed",
      description: "",
      version: 3,
      stage: "veg",
      medium: "soil",
      batchVolume: 5,
      batchUnit: "gal",
      products: [{ name: "Base", amount: 10, unit: "ml", N: 3, P2O5: 1, K2O: 2 }],
      releaseEnvironment: {},
      waterBaseline: {},
      measuredEC: null,
      measuredPH: null,
      sourceRecords: [],
      notes: "",
      active: true,
      useCount: 2,
      toObject: function toObject() {
        return {
          growId: this.growId,
          name: this.name,
          version: this.version,
          stage: this.stage,
          medium: this.medium,
          batchVolume: this.batchVolume,
          batchUnit: this.batchUnit,
          products: this.products,
          releaseEnvironment: this.releaseEnvironment,
          waterBaseline: this.waterBaseline,
          measuredEC: this.measuredEC,
          measuredPH: this.measuredPH,
          sourceRecords: this.sourceRecords,
          notes: this.notes
        };
      },
      save: jest.fn().mockResolvedValue(null)
    };
    mockNutrientRecipeModel.findOne.mockResolvedValue(recipe);
    mockToolRun.create.mockImplementation(async (payload) => {
      const row = {
        _id: RUN_ID,
        ...payload,
        save: jest.fn().mockResolvedValue(null)
      };
      row.toObject = () => ({ ...row });
      return row;
    });
    mockGrowLog.create.mockResolvedValue({ _id: "log_recipe_use_1", type: "FEEDING" });

    const res = await authed(
      request(app)
        .post(`/api/tools/recipes/${RECIPE_ID}/use`)
        .send({ measuredEC: 1.4, measuredPH: 6.4, saveLog: true })
    );

    expect(res.status).toBe(201);
    expect(mockToolRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow_1",
        toolName: "npk_recipe",
        toolType: "npk_recipe",
        linkedRecipeId: RECIPE_ID,
        inputs: expect.objectContaining({
          measuredEC: 1.4,
          measuredPH: 6.4,
          products: [expect.objectContaining({ name: "Base" })]
        })
      })
    );
    expect(mockGrowLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: `personal:${TEST_USER}`,
        userId: TEST_USER,
        growId: "grow_1",
        title: "Feeding: Veg Feed",
        type: "FEEDING",
        tags: ["feeding", "nutrient-recipe"],
        linkedToolRunId: RUN_ID,
        notes: expect.stringContaining("Applied recipe: Veg Feed v3")
      })
    );
    expect(recipe.useCount).toBe(3);
    expect(recipe.lastUsedAt).toBeInstanceOf(Date);
    expect(recipe.save).toHaveBeenCalled();
    expect(res.body.toolRun).toMatchObject({
      id: RUN_ID,
      linkedRecipeId: RECIPE_ID,
      linkedLogId: "log_recipe_use_1"
    });
    expect(res.body.log).toMatchObject({ _id: "log_recipe_use_1" });
  });
});
