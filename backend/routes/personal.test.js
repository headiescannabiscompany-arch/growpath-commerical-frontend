const request = require("supertest");
const express = require("express");
const liveTestPacks = require("../../tests/fixtures/growpath-live-test-packs.json");
const externalSourceSmoke = require("../../tests/fixtures/external-source-smoke.json");

const TEST_USER = "507f191e810c19729de860aa";
const GROW_ID = "507f1f77bcf86cd799439011";
const PLANT_ID = "507f1f77bcf86cd799439012";
const LOG_ID = "507f1f77bcf86cd799439013";
const TASK_ID = "507f1f77bcf86cd799439014";
const TOOL_RUN_ID = "507f1f77bcf86cd799439015";
const DIAGNOSIS_ID = "507f1f77bcf86cd799439016";
const TELEMETRY_SOURCE_ID = "507f1f77bcf86cd799439017";
const HARVEST_BATCH_ID = "507f1f77bcf86cd799439026";

const mockGrow = {
  exists: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn()
};

const mockGrowLog = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn()
};

const mockPlant = {
  find: jest.fn(),
  create: jest.fn()
};

const mockTask = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn()
};

const mockToolRun = {
  find: jest.fn(),
  exists: jest.fn(),
  updateOne: jest.fn()
};

const mockDiagnosis = {
  find: jest.fn(),
  exists: jest.fn(),
  updateOne: jest.fn()
};

const mockDiagnosisFeedback = {
  find: jest.fn()
};

const mockHarvestBatch = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn()
};

const mockAutomationEvent = {
  find: jest.fn()
};

const mockCropProfile = {
  exists: jest.fn()
};

const mockPlantGrowthProfile = {
  find: jest.fn(),
  findOneAndUpdate: jest.fn()
};

const mockTelemetrySource = {
  find: jest.fn()
};

const mockTelemetryPoint = {
  find: jest.fn()
};

jest.mock("../models/Grow", () => mockGrow);
jest.mock("../models/GrowLog", () => mockGrowLog);
jest.mock("../models/Plant", () => mockPlant);
jest.mock("../models/Task", () => mockTask);
jest.mock("../models/ToolRun", () => mockToolRun);
jest.mock("../models/Diagnosis", () => mockDiagnosis);
jest.mock("../models/DiagnosisFeedback", () => mockDiagnosisFeedback);
jest.mock("../models/HarvestBatch", () => mockHarvestBatch);
jest.mock("../models/AutomationEvent", () => mockAutomationEvent);
jest.mock("../models/CropProfile", () => mockCropProfile);
jest.mock("../models/PlantGrowthProfile", () => mockPlantGrowthProfile);
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
  app.use("/api/personal", require("./personal"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || "error" });
  });
  return app;
}

function leanChain(items) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
}

function leanOne(item) {
  return {
    lean: jest.fn().mockResolvedValue(item),
    select: jest.fn().mockReturnThis()
  };
}

function doc(row) {
  return {
    ...row,
    save: jest.fn().mockResolvedValue(null),
    toObject: () => row
  };
}

function livePack(accountType) {
  const pack = liveTestPacks.packs.find((item) => item.accountType === accountType);
  if (!pack) throw new Error(`Missing ${accountType} live test pack`);
  return pack;
}

describe("Personal grow workspace routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGrow.exists.mockResolvedValue(true);
    mockToolRun.exists.mockResolvedValue(true);
    mockDiagnosis.exists.mockResolvedValue(true);
    mockToolRun.updateOne.mockResolvedValue({});
    mockDiagnosis.updateOne.mockResolvedValue({});
    mockPlantGrowthProfile.find.mockReturnValue(leanChain([]));
    app = createApp();
  });

  test("creates grow-scoped logs, normalizes photo metadata, and links source records", async () => {
    const createdLog = doc({
      _id: LOG_ID,
      facilityId: `personal:${TEST_USER}`,
      userId: TEST_USER,
      growId: GROW_ID,
      plantId: PLANT_ID,
      title: "Fed plant",
      notes: "Top dressed and watered in.",
      note: "Top dressed and watered in.",
      tags: ["feeding"],
      photos: ["https://example.test/photo.jpg"],
      photoMetadata: [
        {
          url: "https://example.test/photo.jpg",
          consentForAI: true
        }
      ],
      linkedToolRunId: TOOL_RUN_ID,
      linkedDiagnosisId: DIAGNOSIS_ID
    });
    mockGrowLog.create.mockResolvedValue(createdLog);

    const res = await request(app)
      .post("/api/personal/logs")
      .send({
        growId: GROW_ID,
        plantId: PLANT_ID,
        title: "Fed plant",
        notes: "Top dressed and watered in.",
        tags: ["feeding"],
        photos: ["https://example.test/photo.jpg"],
        photoMetadata: [{ consentForAI: true }],
        toolRunId: TOOL_RUN_ID,
        diagnosisId: DIAGNOSIS_ID
      });

    expect(res.status).toBe(201);
    expect(res.body.log).toMatchObject({
      id: LOG_ID,
      growId: GROW_ID,
      plantId: PLANT_ID,
      toolRunId: TOOL_RUN_ID,
      diagnosisId: DIAGNOSIS_ID
    });
    expect(mockGrowLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: `personal:${TEST_USER}`,
        userId: TEST_USER,
        growId: GROW_ID,
        plantId: PLANT_ID,
        linkedToolRunId: TOOL_RUN_ID,
        linkedDiagnosisId: DIAGNOSIS_ID,
        photoMetadata: [
          expect.objectContaining({
            userId: TEST_USER,
            growId: GROW_ID,
            plantId: PLANT_ID,
            url: "https://example.test/photo.jpg",
            consentForAI: true
          })
        ]
      })
    );
    expect(createdLog.save).toHaveBeenCalled();
    expect(mockToolRun.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: TOOL_RUN_ID }),
      { linkedLogId: LOG_ID }
    );
    expect(mockDiagnosis.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: DIAGNOSIS_ID }),
      { linkedLogId: LOG_ID }
    );
  });

  test("runs Bruce Banner live pack through personal log photo metadata workflow", async () => {
    const pack = livePack("personal");
    const harvestWeek = pack.weeklyLogs.find((log) => log.stage === "harvest");
    const photos = harvestWeek.photos.slice(0, 2).map((photo) => photo.photoSourceLink);
    const photoMetadata = harvestWeek.photos.slice(0, 2).map((photo, index) => ({
      url: photo.photoSourceLink,
      sourceLink: harvestWeek.sourceLink,
      photoSourceLink: photo.photoSourceLink,
      stage: harvestWeek.stage,
      sourceProvider: pack.source.provider,
      rightsMode: pack.source.rightsMode,
      consentForAI: index === 0,
      consentForTraining: false
    }));
    const createdLog = doc({
      _id: LOG_ID,
      facilityId: `personal:${TEST_USER}`,
      userId: TEST_USER,
      growId: GROW_ID,
      plantId: PLANT_ID,
      title: "Bruce Banner harvest quality notes",
      notes: "236 g dry. Taste notes: diesel, earthy, mint.",
      note: "236 g dry. Taste notes: diesel, earthy, mint.",
      tags: ["harvest", "yield", "smoke_report"],
      photos,
      photoMetadata,
      linkedToolRunId: null,
      linkedDiagnosisId: null
    });
    mockGrowLog.create.mockResolvedValue(createdLog);

    const res = await request(app)
      .post("/api/personal/logs")
      .send({
        growId: GROW_ID,
        plantId: PLANT_ID,
        title: "Bruce Banner harvest quality notes",
        notes: "236 g dry. Taste notes: diesel, earthy, mint.",
        tags: ["harvest", "yield", "smoke_report"],
        photos,
        photoMetadata
      });

    expect(res.status).toBe(201);
    expect(mockGrowLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_USER,
        growId: GROW_ID,
        plantId: PLANT_ID,
        photos,
        tags: ["harvest", "yield", "smoke_report"],
        photoMetadata: [
          expect.objectContaining({
            userId: TEST_USER,
            growId: GROW_ID,
            plantId: PLANT_ID,
            url: photos[0],
            sourceLink: harvestWeek.sourceLink,
            photoSourceLink: photos[0],
            stage: "harvest",
            sourceProvider: pack.source.provider,
            rightsMode: pack.source.rightsMode,
            consentForAI: true,
            consentForTraining: false
          }),
          expect.objectContaining({
            userId: TEST_USER,
            growId: GROW_ID,
            plantId: PLANT_ID,
            url: photos[1],
            photoSourceLink: photos[1],
            consentForAI: false,
            consentForTraining: false
          })
        ]
      })
    );
    expect(res.body.log.photos).toEqual(photos);
    expect(res.body.log.photoMetadata).toHaveLength(2);
    expect(res.body.log.photoMetadata[0]).not.toHaveProperty("uploadedAssetUri");
    expect(res.body.log.photoMetadata[0]).not.toHaveProperty("localFilePath");
  });

  test("preserves user-provided GrowDiaries profile source metadata without rehosting", async () => {
    const source = externalSourceSmoke.sources.find(
      (item) => item.id === "headies-growdiaries-profile"
    );
    const photoMetadata = [
      {
        url: source.sourceUrl,
        sourceLink: source.sourceLink,
        photoSourceLink: source.sourceLink,
        sourceProvider: source.provider,
        sourceType: source.sourceType,
        rightsMode: source.rightsMode,
        consentForAI: false,
        consentForTraining: false,
        note: "Profile-level source smoke; no diary facts extracted."
      }
    ];
    const createdLog = doc({
      _id: LOG_ID,
      facilityId: `personal:${TEST_USER}`,
      userId: TEST_USER,
      growId: GROW_ID,
      plantId: PLANT_ID,
      title: "GrowDiaries profile source smoke",
      notes: "External profile link saved for future diary-backed testing.",
      note: "External profile link saved for future diary-backed testing.",
      tags: ["external_source", "growdiaries"],
      photos: [source.sourceUrl],
      photoMetadata,
      linkedToolRunId: null,
      linkedDiagnosisId: null
    });
    mockGrowLog.create.mockResolvedValue(createdLog);

    const res = await request(app)
      .post("/api/personal/logs")
      .send({
        growId: GROW_ID,
        plantId: PLANT_ID,
        title: "GrowDiaries profile source smoke",
        notes: "External profile link saved for future diary-backed testing.",
        tags: ["external_source", "growdiaries"],
        photos: [source.sourceUrl],
        photoMetadata
      });

    expect(res.status).toBe(201);
    expect(mockGrowLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: [source.sourceUrl],
        photoMetadata: [
          expect.objectContaining({
            userId: TEST_USER,
            growId: GROW_ID,
            plantId: PLANT_ID,
            url: source.sourceUrl,
            sourceLink: source.sourceLink,
            photoSourceLink: source.sourceLink,
            sourceProvider: "GrowDiaries",
            sourceType: "grower_profile",
            rightsMode: "external_link_only",
            consentForAI: false,
            consentForTraining: false
          })
        ]
      })
    );
    expect(res.body.log.photoMetadata[0]).not.toHaveProperty("uploadedAssetUri");
    expect(res.body.log.photoMetadata[0]).not.toHaveProperty("localFilePath");
  });

  test("lists, reads, updates, and soft-deletes grow logs for the current user", async () => {
    const existingLog = {
      _id: LOG_ID,
      userId: TEST_USER,
      growId: GROW_ID,
      title: "Original",
      notes: "Before",
      linkedToolRunId: TOOL_RUN_ID,
      linkedDiagnosisId: DIAGNOSIS_ID,
      deletedAt: null
    };
    const updatedLog = doc({
      ...existingLog,
      title: "Updated",
      notes: "After",
      note: "After",
      linkedToolRunId: null,
      linkedDiagnosisId: null
    });
    const deletedLog = doc(updatedLog.toObject());

    mockGrowLog.find.mockReturnValue(leanChain([existingLog]));
    mockGrowLog.findOne
      .mockResolvedValueOnce(doc(existingLog))
      .mockReturnValueOnce(leanOne(existingLog));
    mockGrowLog.findOneAndUpdate
      .mockResolvedValueOnce(updatedLog)
      .mockResolvedValueOnce(deletedLog);

    const list = await request(app).get(`/api/personal/logs?growId=${GROW_ID}`);
    const detail = await request(app).get(`/api/personal/logs/${LOG_ID}`);
    const patch = await request(app)
      .patch(`/api/personal/logs/${LOG_ID}`)
      .send({ title: "Updated", notes: "After", toolRunId: null, diagnosisId: null });
    const del = await request(app).delete(`/api/personal/logs/${LOG_ID}`);

    expect(list.status).toBe(200);
    expect(list.body.logs).toHaveLength(1);
    expect(detail.status).toBe(200);
    expect(detail.body.log.id).toBe(LOG_ID);
    expect(patch.status).toBe(200);
    expect(patch.body.log.title).toBe("Updated");
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);
    expect(mockGrowLog.find).toHaveBeenCalledWith({
      userId: TEST_USER,
      growId: GROW_ID,
      deletedAt: null
    });
    expect(mockGrowLog.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: LOG_ID, userId: TEST_USER, deletedAt: null },
      expect.objectContaining({ title: "Updated", note: "After", notes: "After" }),
      { new: true }
    );
    expect(mockGrowLog.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: LOG_ID, userId: TEST_USER, deletedAt: null },
      expect.objectContaining({ deletedAt: expect.any(Date), isActive: false }),
      { new: true }
    );
  });

  test("creates, lists, updates, and archives harvest batches with dry/cure records", async () => {
    const dryCureRecords = [
      {
        recordedAt: "2026-07-09T12:00:00.000Z",
        stage: "drying",
        tempF: 66,
        rh: 60,
        aromaNotes: "loud citrus",
        qualityNotes: "slow clean dry",
        linkedToolRunId: TOOL_RUN_ID
      }
    ];
    const existingBatch = {
      _id: HARVEST_BATCH_ID,
      facilityId: `personal:${TEST_USER}`,
      userId: TEST_USER,
      growId: GROW_ID,
      plantIds: [PLANT_ID],
      name: "Flower harvest A",
      batchCode: "FH-A",
      status: "drying",
      harvestedAt: "2026-07-08T12:00:00.000Z",
      wetWeight: 450,
      weightUnit: "g",
      dryCureRecords,
      linkedToolRunIds: [TOOL_RUN_ID],
      deletedAt: null
    };
    const createdBatch = doc(existingBatch);
    const updatedBatch = doc({
      ...existingBatch,
      status: "curing",
      dryWeight: 112,
      qualityNotes: "Clean dry, ready for cure."
    });
    const deletedBatch = doc({
      ...existingBatch,
      status: "archived",
      deletedAt: new Date()
    });

    mockHarvestBatch.create.mockResolvedValue(createdBatch);
    mockHarvestBatch.find.mockReturnValue(leanChain([existingBatch]));
    mockHarvestBatch.findOne.mockResolvedValue(doc(existingBatch));
    mockHarvestBatch.findOneAndUpdate
      .mockResolvedValueOnce(updatedBatch)
      .mockResolvedValueOnce(deletedBatch);

    const created = await request(app)
      .post("/api/personal/harvest-batches")
      .send({
        growId: GROW_ID,
        plantIds: [PLANT_ID],
        name: "Flower harvest A",
        batchCode: "FH-A",
        status: "drying",
        harvestedAt: "2026-07-08T12:00:00.000Z",
        wetWeight: 450,
        weightUnit: "g",
        dryCureRecords,
        linkedToolRunIds: [TOOL_RUN_ID]
      });
    const listed = await request(app).get(
      `/api/personal/harvest-batches?growId=${GROW_ID}`
    );
    const detail = await request(app).get(
      `/api/personal/harvest-batches/${HARVEST_BATCH_ID}`
    );
    const updated = await request(app)
      .patch(`/api/personal/harvest-batches/${HARVEST_BATCH_ID}`)
      .send({
        status: "curing",
        dryWeight: 112,
        qualityNotes: "Clean dry, ready for cure."
      });
    const archived = await request(app).delete(
      `/api/personal/harvest-batches/${HARVEST_BATCH_ID}`
    );

    expect(created.status).toBe(201);
    expect(created.body.harvestBatch).toMatchObject({
      id: HARVEST_BATCH_ID,
      growId: GROW_ID,
      status: "drying",
      dryCureRecords: [expect.objectContaining({ stage: "drying", rh: 60 })]
    });
    expect(listed.status).toBe(200);
    expect(listed.body.harvestBatches).toHaveLength(1);
    expect(detail.body.harvestBatch.id).toBe(HARVEST_BATCH_ID);
    expect(updated.body.harvestBatch).toMatchObject({
      status: "curing",
      dryWeight: 112
    });
    expect(archived.body.archived).toBe(true);
    expect(mockHarvestBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: `personal:${TEST_USER}`,
        userId: TEST_USER,
        growId: GROW_ID,
        plantIds: [PLANT_ID],
        name: "Flower harvest A",
        wetWeight: 450,
        dryCureRecords
      })
    );
  });

  test("creates grow-scoped source-linked tasks and links them back to ToolRuns", async () => {
    const createdTask = doc({
      _id: TASK_ID,
      facilityId: `personal:${TEST_USER}`,
      createdByUserId: TEST_USER,
      assignedToUserId: TEST_USER,
      growId: GROW_ID,
      plantId: PLANT_ID,
      title: "Retest pH / EC",
      notes: "Check runoff tomorrow.",
      priority: "high",
      status: "OPEN",
      sourceType: "tool_run",
      sourceObjectId: TOOL_RUN_ID,
      sourceToolRunId: TOOL_RUN_ID
    });
    mockTask.create.mockResolvedValue(createdTask);

    const res = await request(app).post("/api/personal/tasks").send({
      growId: GROW_ID,
      plantId: PLANT_ID,
      title: "Retest pH / EC",
      description: "Check runoff tomorrow.",
      priority: "high",
      sourceToolRunId: TOOL_RUN_ID
    });

    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({
      id: TASK_ID,
      growId: GROW_ID,
      plantId: PLANT_ID,
      sourceType: "tool_run",
      sourceObjectId: TOOL_RUN_ID,
      sourceToolRunId: TOOL_RUN_ID
    });
    expect(mockTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: `personal:${TEST_USER}`,
        createdByUserId: TEST_USER,
        assignedToUserId: TEST_USER,
        growId: GROW_ID,
        plantId: PLANT_ID,
        sourceType: "tool_run",
        sourceObjectId: TOOL_RUN_ID,
        sourceToolRunId: TOOL_RUN_ID
      })
    );
    expect(mockToolRun.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: TOOL_RUN_ID }),
      {
        $set: { linkedTaskId: TASK_ID },
        $addToSet: { linkedTaskIds: TASK_ID }
      }
    );
  });

  test("lists, reads, updates, and soft-deletes grow tasks for the current user", async () => {
    const existingTask = {
      _id: TASK_ID,
      createdByUserId: TEST_USER,
      facilityId: `personal:${TEST_USER}`,
      growId: GROW_ID,
      title: "Water",
      notes: "Before",
      status: "OPEN",
      sourceToolRunId: TOOL_RUN_ID,
      deletedAt: null
    };
    const updatedTask = doc({
      ...existingTask,
      title: "Water and inspect",
      notes: "After",
      status: "DONE"
    });
    const deletedTask = doc(updatedTask.toObject());

    mockTask.find.mockReturnValue(leanChain([existingTask]));
    mockTask.findOne
      .mockResolvedValueOnce(doc(existingTask))
      .mockReturnValueOnce(leanOne(existingTask));
    mockTask.findOneAndUpdate
      .mockResolvedValueOnce(updatedTask)
      .mockResolvedValueOnce(deletedTask);

    const list = await request(app).get(`/api/personal/tasks?growId=${GROW_ID}`);
    const detail = await request(app).get(`/api/personal/tasks/${TASK_ID}`);
    const patch = await request(app)
      .patch(`/api/personal/tasks/${TASK_ID}`)
      .send({ title: "Water and inspect", notes: "After", completed: true });
    const del = await request(app).delete(`/api/personal/tasks/${TASK_ID}`);

    expect(list.status).toBe(200);
    expect(list.body.tasks).toHaveLength(1);
    expect(detail.status).toBe(200);
    expect(detail.body.task.id).toBe(TASK_ID);
    expect(patch.status).toBe(200);
    expect(patch.body.task.completed).toBe(true);
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);
    expect(mockTask.find).toHaveBeenCalledWith({
      createdByUserId: TEST_USER,
      facilityId: `personal:${TEST_USER}`,
      growId: GROW_ID,
      deletedAt: null
    });
    expect(mockTask.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: TASK_ID,
        createdByUserId: TEST_USER,
        facilityId: `personal:${TEST_USER}`,
        deletedAt: null
      },
      expect.objectContaining({
        title: "Water and inspect",
        notes: "After",
        status: "DONE"
      }),
      { new: true }
    );
    expect(mockTask.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: TASK_ID,
        createdByUserId: TEST_USER,
        facilityId: `personal:${TEST_USER}`,
        deletedAt: null
      },
      expect.objectContaining({ deletedAt: expect.any(Date), isActive: false }),
      { new: true }
    );
  });

  test("returns a merged grow timeline across plants, logs, photos, tasks, tools, diagnoses, automation, and telemetry", async () => {
    mockGrow.findOne.mockReturnValue(
      leanOne({
        _id: GROW_ID,
        userId: TEST_USER,
        growId: GROW_ID,
        name: "Flower Tent",
        stage: "flower",
        createdAt: "2026-06-01T12:00:00.000Z"
      })
    );
    mockPlant.find.mockReturnValue(
      leanChain([
        {
          _id: PLANT_ID,
          userId: TEST_USER,
          growId: GROW_ID,
          name: "Plant A",
          cultivar: "Test cultivar",
          stage: "flower",
          createdAt: "2026-06-02T12:00:00.000Z"
        }
      ])
    );
    mockGrowLog.find.mockReturnValue(
      leanChain([
        {
          _id: LOG_ID,
          userId: TEST_USER,
          growId: GROW_ID,
          plantId: PLANT_ID,
          title: "Fed plant",
          notes: "Topdress applied.",
          tags: ["feeding"],
          photos: ["https://example.test/photo.jpg"],
          photoMetadata: [{ createdAt: "2026-06-03T12:00:00.000Z" }],
          linkedToolRunId: TOOL_RUN_ID,
          date: "2026-06-03T12:00:00.000Z",
          createdAt: "2026-06-03T12:00:00.000Z"
        }
      ])
    );
    mockTask.find.mockReturnValue(
      leanChain([
        {
          _id: TASK_ID,
          createdByUserId: TEST_USER,
          growId: GROW_ID,
          title: "Retest runoff",
          notes: "Check EC.",
          status: "DONE",
          priority: "high",
          sourceType: "tool_run",
          sourceObjectId: TOOL_RUN_ID,
          sourceToolRunId: TOOL_RUN_ID,
          createdAt: "2026-06-04T12:00:00.000Z",
          updatedAt: "2026-06-05T12:00:00.000Z"
        }
      ])
    );
    mockToolRun.find.mockReturnValue(
      leanChain([
        {
          _id: TOOL_RUN_ID,
          userId: TEST_USER,
          growId: GROW_ID,
          toolName: "pH / EC Range Check",
          warnings: ["Runoff EC is high."],
          recommendations: ["Retest tomorrow."],
          linkedLogId: LOG_ID,
          linkedTaskId: TASK_ID,
          createdAt: "2026-06-04T12:00:00.000Z"
        }
      ])
    );
    mockDiagnosis.find.mockReturnValue(
      leanChain([
        {
          _id: DIAGNOSIS_ID,
          userId: TEST_USER,
          growId: GROW_ID,
          issueSummary: "Possible salt buildup",
          tags: ["ec"],
          severity: "watch",
          linkedLogId: LOG_ID,
          linkedTaskIds: [TASK_ID],
          createdAt: "2026-06-04T13:00:00.000Z"
        }
      ])
    );
    mockDiagnosisFeedback.find.mockReturnValue(
      leanChain([
        {
          _id: "507f1f77bcf86cd799439018",
          userId: TEST_USER,
          growId: GROW_ID,
          verdict: "helpful",
          symptomChange: "better",
          notes: "Improved after flush.",
          createdAt: "2026-06-06T12:00:00.000Z"
        }
      ])
    );
    mockHarvestBatch.find.mockReturnValue(
      leanChain([
        {
          _id: HARVEST_BATCH_ID,
          userId: TEST_USER,
          facilityId: `personal:${TEST_USER}`,
          growId: GROW_ID,
          plantIds: [PLANT_ID],
          name: "Flower harvest A",
          batchCode: "FH-A",
          status: "drying",
          harvestedAt: "2026-06-06T13:00:00.000Z",
          wetWeight: 450,
          weightUnit: "g",
          dryCureRecords: [
            {
              recordedAt: "2026-06-07T12:00:00.000Z",
              stage: "drying",
              tempF: 66,
              rh: 60,
              qualityNotes: "Clean slow dry"
            }
          ],
          linkedToolRunIds: [TOOL_RUN_ID],
          createdAt: "2026-06-06T13:00:00.000Z"
        }
      ])
    );
    mockAutomationEvent.find.mockReturnValue(
      leanChain([
        {
          _id: "507f1f77bcf86cd799439019",
          userId: TEST_USER,
          growId: GROW_ID,
          source: "sensor",
          eventType: "high_humidity",
          processed: true,
          createdAt: "2026-06-07T12:00:00.000Z"
        }
      ])
    );
    mockTelemetrySource.find.mockReturnValue(
      leanChain([
        {
          _id: TELEMETRY_SOURCE_ID,
          ownerUserId: TEST_USER,
          growId: GROW_ID,
          name: "Tent sensor",
          type: "climate"
        }
      ])
    );
    mockTelemetryPoint.find.mockReturnValue(
      leanChain([
        {
          _id: "507f1f77bcf86cd799439020",
          sourceId: TELEMETRY_SOURCE_ID,
          airTempC: 24,
          rh: 60,
          dewPointC: 15.8,
          ts: "2026-06-08T12:00:00.000Z"
        }
      ])
    );

    const res = await request(app).get(`/api/personal/grows/${GROW_ID}/timeline`);

    expect(res.status).toBe(200);
    const types = res.body.timeline.map((event) => event.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "grow_created",
        "plant_added",
        "feeding_event",
        "photo_added",
        "task_completed",
        "tool_run_created",
        "diagnosis_created",
        "diagnosis_feedback",
        "harvest_batch_created",
        "automation_event",
        "environment_reading"
      ])
    );
    const harvestEvent = res.body.timeline.find(
      (event) => event.type === "harvest_batch_created"
    );
    expect(harvestEvent).toMatchObject({
      title: "Flower harvest A",
      payload: expect.objectContaining({
        batchCode: "FH-A",
        dryCureRecords: [expect.objectContaining({ stage: "drying", rh: 60 })],
        linkedToolRunIds: [TOOL_RUN_ID]
      })
    });
    expect(res.body.timeline[0].timestamp).toBe("2026-06-08T12:00:00.000Z");
  });
});
