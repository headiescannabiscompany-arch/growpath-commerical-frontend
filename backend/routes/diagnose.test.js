const request = require("supertest");
const express = require("express");

const TEST_USER = "507f191e810c19729de860aa";
const GROW_ID = "507f1f77bcf86cd799439011";
const DIAGNOSIS_ID = "507f1f77bcf86cd799439016";

const mockGrow = {
  exists: jest.fn()
};

const mockDiagnosis = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn()
};

const mockDiagnosisFeedback = {
  create: jest.fn()
};

jest.mock("../models/Grow", () => mockGrow);
jest.mock("../models/Diagnosis", () => mockDiagnosis);
jest.mock("../models/DiagnosisFeedback", () => mockDiagnosisFeedback);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = TEST_USER;
    req.user = { _id: TEST_USER };
    req.ctx = { userId: TEST_USER };
    next();
  });
  app.use("/api/diagnose", require("./diagnose"));
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
    save: jest.fn().mockResolvedValue(null),
    toObject: () => row
  };
}

describe("diagnose backend routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGrow.exists.mockResolvedValue(true);
    app = createApp();
  });

  test("creates cautious ETGU diagnosis records for owned grows", async () => {
    mockDiagnosis.create.mockImplementation(async (payload) =>
      doc({
        _id: DIAGNOSIS_ID,
        ...payload
      })
    );

    const res = await request(app)
      .post("/api/diagnose/analyze")
      .send({
        growId: GROW_ID,
        plantId: "plant-1",
        notes: "Lower leaves yellow, runoff EC is high, roots stayed wet.",
        cropCommonName: "Tomato",
        scientificName: "Solanum lycopersicum",
        pattern: {
          location: "lower old leaves",
          progression: "spreading slowly",
          notes: "yellowing"
        },
        rootZone: { moisture: "too wet", concern: "slow dryback" },
        environment: { temp: "24", tempUnit: "C", rh: "60", vpd: "1.2" },
        numbers: { runoffEC: "3.1", feedPH: "6.2" }
      });

    expect(res.status).toBe(201);
    expect(mockGrow.exists).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: [{ $or: [{ user: TEST_USER }, { userId: TEST_USER }] }]
      })
    );
    expect(mockDiagnosis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: GROW_ID,
        plantId: "plant-1",
        issueSummary: expect.stringMatching(/^Possible /),
        diagnosisClass: expect.stringContaining("triage"),
        providerName: "growpathai",
        providerModel: "deterministic-etgu-v1",
        aiResult: expect.objectContaining({
          evidenceObserved: expect.arrayContaining([
            expect.stringContaining("yellowing"),
            "Reported symptom progression: spreading slowly."
          ]),
          counterEvidence: expect.arrayContaining([
            expect.stringContaining("No lab test")
          ]),
          missingData: expect.arrayContaining([expect.stringContaining("pH/EC")]),
          suggestedActions: expect.arrayContaining([expect.stringContaining("pH")])
        })
      })
    );
    expect(res.body.diagnosis).toMatchObject({
      id: DIAGNOSIS_ID,
      issueSummary: expect.stringMatching(/^Possible /),
      confidenceLevel: "medium",
      evidenceObserved: expect.any(Array),
      missingData: expect.any(Array),
      suggestedActions: expect.any(Array),
      followUpQuestion: expect.any(String)
    });
    expect(res.body.diagnosis.patternSummary).toContain("progression: spreading slowly");
    expect(res.body.diagnosis.environmentSummary).toBe(
      "temp: 24 °C; rh: 60%; vpd: 1.2 kPa"
    );
  });

  test("escalates rapidly spreading symptoms for urgent review", async () => {
    mockDiagnosis.create.mockImplementation(async (payload) =>
      doc({
        _id: DIAGNOSIS_ID,
        ...payload
      })
    );

    const res = await request(app)
      .post("/api/diagnose/analyze")
      .send({
        notes: "Yellow spotting is spreading",
        pattern: {
          location: "whole plant",
          progression: "spreading quickly"
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.diagnosis).toMatchObject({
      severity: 4,
      urgency: "urgent",
      tags: expect.arrayContaining(["urgent_review"])
    });
  });

  test("stores attached photo evidence without claiming the text engine inspected it", async () => {
    mockDiagnosis.create.mockImplementation(async (payload) =>
      doc({
        _id: DIAGNOSIS_ID,
        ...payload
      })
    );

    const res = await request(app)
      .post("/api/diagnose")
      .send({
        growId: GROW_ID,
        notes: "Yellow spotting on lower leaves",
        photoUrls: ["/uploads/leaf-top.jpg", "/uploads/leaf-bottom.jpg"]
      });

    expect(res.status).toBe(201);
    expect(mockDiagnosis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: ["/uploads/leaf-top.jpg", "/uploads/leaf-bottom.jpg"],
        aiResult: expect.objectContaining({
          imageAnalysis: {
            requested: true,
            performed: false,
            photoCount: 2,
            reason: "The deterministic diagnosis provider is text-only."
          },
          missingData: expect.arrayContaining([
            expect.stringContaining("Visual review of the attached photos")
          ])
        })
      })
    );
  });

  test("rejects diagnosis writes for grows outside the authenticated user", async () => {
    mockGrow.exists.mockResolvedValue(false);

    const res = await request(app)
      .post("/api/diagnose/analyze")
      .send({ growId: GROW_ID, notes: "yellow leaves" });

    expect(res.status).toBe(404);
    expect(mockDiagnosis.create).not.toHaveBeenCalled();
  });

  test("lists and reads only diagnoses owned by the authenticated user", async () => {
    mockDiagnosis.find.mockReturnValue(
      chain([
        {
          _id: DIAGNOSIS_ID,
          user: TEST_USER,
          growId: GROW_ID,
          issueSummary: "Possible root-zone issue",
          aiResult: { evidenceObserved: ["wet roots"] }
        }
      ])
    );
    mockDiagnosis.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: DIAGNOSIS_ID,
        user: TEST_USER,
        issueSummary: "Possible root-zone issue",
        aiResult: { evidenceObserved: ["wet roots"] }
      })
    });

    const list = await request(app).get(`/api/diagnose/history?growId=${GROW_ID}`);
    const detail = await request(app).get(`/api/diagnose/${DIAGNOSIS_ID}`);

    expect(list.status).toBe(200);
    expect(mockDiagnosis.find).toHaveBeenCalledWith(
      expect.objectContaining({ growId: GROW_ID })
    );
    expect(detail.status).toBe(200);
    expect(mockDiagnosis.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: DIAGNOSIS_ID })
    );
  });

  test("records diagnosis feedback against owned diagnoses", async () => {
    const diagnosis = doc({
      _id: DIAGNOSIS_ID,
      growId: GROW_ID,
      plantId: "plant-1",
      issueSummary: "Possible root-zone issue",
      diagnosisClass: "root_zone_or_irrigation_triage",
      providerName: "growpathai",
      providerModel: "deterministic-etgu-v1",
      feedbackCount: 0
    });
    mockDiagnosis.findOne.mockResolvedValue(diagnosis);
    mockDiagnosisFeedback.create.mockResolvedValue({
      _id: "feedback-1",
      verdict: "helpful",
      symptomChange: "improved",
      notes: "Recovered after dryback."
    });

    const res = await request(app).post(`/api/diagnose/${DIAGNOSIS_ID}/feedback`).send({
      verdict: "helpful",
      symptomChange: "improved",
      notes: "Recovered after dryback."
    });

    expect(res.status).toBe(201);
    expect(mockDiagnosisFeedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: GROW_ID,
        plantId: "plant-1",
        verdict: "helpful",
        symptomChange: "improved"
      })
    );
    expect(diagnosis.feedbackCount).toBe(1);
    expect(diagnosis.save).toHaveBeenCalled();
  });

  test("returns deterministic provider readiness", async () => {
    const res = await request(app).get("/api/diagnose/provider-status");

    expect(res.status).toBe(200);
    expect(res.body.provider).toMatchObject({
      providerName: "growpathai",
      providerModel: "deterministic-etgu-v1",
      configured: true,
      imageSupport: false
    });
  });
});
