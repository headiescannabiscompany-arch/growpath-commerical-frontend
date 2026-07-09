const request = require("supertest");
const express = require("express");

const TEST_USER = "507f191e810c19729de860aa";
const CROP_ID = "507f1f77bcf86cd799439021";
const ORGANISM_ID = "507f1f77bcf86cd799439022";
const ALERT_ID = "507f1f77bcf86cd799439023";
const GROWTH_ID = "507f1f77bcf86cd799439024";
const PLANT_ID = "507f1f77bcf86cd799439025";

const mockCropProfile = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn()
};

const mockOrganismProfile = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn()
};

const mockPlantGrowthProfile = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn()
};

const mockPlantTaxon = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn()
};

const mockRegionalAlert = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn()
};

jest.mock("../models/CropProfile", () => mockCropProfile);
jest.mock("../models/OrganismProfile", () => mockOrganismProfile);
jest.mock("../models/PlantGrowthProfile", () => mockPlantGrowthProfile);
jest.mock("../models/PlantTaxon", () => mockPlantTaxon);
jest.mock("../models/RegionalAlert", () => mockRegionalAlert);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = TEST_USER;
    req.user = { _id: TEST_USER };
    req.ctx = { userId: TEST_USER };
    next();
  });
  app.use("/api/crop-knowledge", require("./cropKnowledge"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || "error" });
  });
  return app;
}

function leanChain(items) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
}

function leanOne(item) {
  return {
    lean: jest.fn().mockResolvedValue(item)
  };
}

describe("crop knowledge routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test("lists and creates crop profiles with source provenance intact", async () => {
    const sourceRecords = [
      {
        sourceName: "Extension profile",
        sourceType: "extension",
        trainingUseAllowed: false,
        commercialUseAllowed: false,
        confidence: "medium"
      }
    ];
    mockCropProfile.find.mockReturnValue(
      leanChain([{ _id: CROP_ID, displayName: "Blueberry", sourceRecords }])
    );
    mockCropProfile.create.mockResolvedValue({
      _id: CROP_ID,
      displayName: "Olive",
      cropKey: "olive",
      curationStatus: "needs_license_review",
      sourceRecords
    });

    const listed = await request(app).get(
      "/api/crop-knowledge/crop-profiles?q=blueberry&limit=5"
    );
    const created = await request(app).post("/api/crop-knowledge/crop-profiles").send({
      displayName: "Olive",
      scientificName: "Olea europaea",
      sourceRecords
    });

    expect(listed.status).toBe(200);
    expect(listed.body.items[0]).toMatchObject({
      id: CROP_ID,
      displayName: "Blueberry",
      sourceRecords: [expect.objectContaining({ sourceName: "Extension profile" })]
    });
    expect(created.status).toBe(201);
    expect(mockCropProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Olive",
        cropKey: "olive",
        curationStatus: "needs_license_review",
        submittedBy: expect.any(Object),
        sourceRecords
      })
    );
  });

  test("updates and archives organism profiles", async () => {
    mockOrganismProfile.findOne.mockReturnValue(
      leanOne({ _id: ORGANISM_ID, scientificName: "Lycorma delicatula" })
    );
    mockOrganismProfile.findOneAndUpdate
      .mockResolvedValueOnce({
        _id: ORGANISM_ID,
        scientificName: "Lycorma delicatula",
        organismType: "invasive",
        pesticideDosingAllowed: false
      })
      .mockResolvedValueOnce({
        _id: ORGANISM_ID,
        scientificName: "Lycorma delicatula",
        archivedAt: new Date()
      });

    const loaded = await request(app).get(`/api/crop-knowledge/organisms/${ORGANISM_ID}`);
    const updated = await request(app)
      .patch(`/api/crop-knowledge/organisms/${ORGANISM_ID}`)
      .send({ organismType: "invasive", pesticideDosingAllowed: false });
    const archived = await request(app).delete(
      `/api/crop-knowledge/organisms/${ORGANISM_ID}`
    );

    expect(loaded.status).toBe(200);
    expect(updated.status).toBe(200);
    expect(updated.body.item).toMatchObject({
      organismType: "invasive",
      pesticideDosingAllowed: false
    });
    expect(archived.status).toBe(200);
    expect(archived.body.archived).toBe(true);
  });

  test("seeds starter crop profiles as license-review drafts", async () => {
    mockCropProfile.findOneAndUpdate.mockImplementation(async (filter, update) => ({
      _id: CROP_ID,
      cropKey: filter.cropKey,
      displayName: update.$set.displayName,
      curationStatus: update.$set.curationStatus
    }));

    const res = await request(app).post("/api/crop-knowledge/crop-profiles/starter-seed");

    expect(res.status).toBe(201);
    expect(res.body.count).toBe(4);
    expect(res.body.curationStatus).toBe("needs_license_review");
    expect(mockCropProfile.findOneAndUpdate).toHaveBeenCalledWith(
      { cropKey: "cannabis" },
      expect.objectContaining({
        $set: expect.objectContaining({
          displayName: "Cannabis",
          curationStatus: "needs_license_review",
          submittedBy: expect.any(Object)
        }),
        $setOnInsert: { sourceRecords: [] }
      }),
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });

  test("creates, lists, and archives regional alerts", async () => {
    mockRegionalAlert.find.mockReturnValue(
      leanChain([{ _id: ALERT_ID, organismId: ORGANISM_ID, region: "US-PA" }])
    );
    mockRegionalAlert.create.mockResolvedValue({
      _id: ALERT_ID,
      organismId: ORGANISM_ID,
      region: "US-PA",
      status: "watchlist"
    });
    mockRegionalAlert.findOneAndUpdate.mockResolvedValue({
      _id: ALERT_ID,
      organismId: ORGANISM_ID,
      region: "US-PA",
      archivedAt: new Date()
    });

    const created = await request(app)
      .post("/api/crop-knowledge/regional-alerts")
      .send({ organismId: ORGANISM_ID, region: "US-PA", status: "watchlist" });
    const listed = await request(app).get(
      `/api/crop-knowledge/regional-alerts?organismId=${ORGANISM_ID}&region=US-PA`
    );
    const archived = await request(app).delete(
      `/api/crop-knowledge/regional-alerts/${ALERT_ID}`
    );

    expect(created.status).toBe(201);
    expect(mockRegionalAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organismId: expect.any(Object),
        region: "US-PA",
        status: "watchlist",
        submittedBy: expect.any(Object)
      })
    );
    expect(listed.status).toBe(200);
    expect(listed.body.items[0]).toMatchObject({ region: "US-PA" });
    expect(archived.body.archived).toBe(true);
  });

  test("upserts, updates, and archives user-owned plant growth profiles", async () => {
    mockPlantGrowthProfile.findOneAndUpdate
      .mockResolvedValueOnce({
        _id: GROWTH_ID,
        user: TEST_USER,
        plantId: PLANT_ID,
        cultivarName: "Cherry tomato",
        confirmationStatus: "user_confirmed"
      })
      .mockResolvedValueOnce({
        _id: GROWTH_ID,
        user: TEST_USER,
        plantId: PLANT_ID,
        cultivarName: "Cherry tomato selected"
      })
      .mockResolvedValueOnce({
        _id: GROWTH_ID,
        user: TEST_USER,
        plantId: PLANT_ID,
        archivedAt: new Date()
      });

    const created = await request(app)
      .post("/api/crop-knowledge/plant-growth-profiles")
      .send({
        plantId: PLANT_ID,
        cultivarName: "Cherry tomato",
        phenoLabel: "P1",
        keeperStatus: "keeper",
        keeperReason: "Strong vigor, resin, and stress response.",
        cloneStatus: "rooted",
        motherStatus: "candidate",
        phenoScores: [
          {
            scoredAt: "2026-07-09T00:00:00.000Z",
            stage: "flower",
            vigor: 8,
            resin: 9,
            stressTolerance: 8
          }
        ],
        stageScorecards: [
          {
            stage: "veg",
            vigor: 8,
            morphology: 7,
            stressResponse: 8,
            notes: "Did not falter under dryback stress."
          }
        ],
        confirmationStatus: "user_confirmed"
      });
    const updated = await request(app)
      .patch(`/api/crop-knowledge/plant-growth-profiles/${GROWTH_ID}`)
      .send({ cultivarName: "Cherry tomato selected" });
    const archived = await request(app).delete(
      `/api/crop-knowledge/plant-growth-profiles/${GROWTH_ID}`
    );

    expect(created.status).toBe(201);
    expect(created.body.item).toMatchObject({ cultivarName: "Cherry tomato" });
    expect(updated.body.item).toMatchObject({
      cultivarName: "Cherry tomato selected"
    });
    expect(archived.body.archived).toBe(true);
    expect(mockPlantGrowthProfile.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.any(Object), plantId: expect.any(Object) }),
      expect.objectContaining({
        user: expect.any(Object),
        archivedAt: null,
        phenoLabel: "P1",
        keeperStatus: "keeper",
        keeperReason: "Strong vigor, resin, and stress response.",
        cloneStatus: "rooted",
        motherStatus: "candidate",
        phenoScores: [
          expect.objectContaining({
            stage: "flower",
            vigor: 8,
            resin: 9,
            stressTolerance: 8
          })
        ],
        stageScorecards: [
          expect.objectContaining({
            stage: "veg",
            vigor: 8,
            morphology: 7,
            stressResponse: 8
          })
        ]
      }),
      expect.objectContaining({ upsert: true })
    );
  });
});
