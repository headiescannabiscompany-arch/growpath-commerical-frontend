const request = require("supertest");
const express = require("express");

const TEST_USER = "507f191e810c19729de860aa";
const GROW_ID = "507f1f77bcf86cd799439011";

const mockGrow = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn()
};

jest.mock("../models/Grow", () => mockGrow);

function createApp(ctx = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = TEST_USER;
    req.user = { _id: TEST_USER };
    req.ctx = {
      userId: TEST_USER,
      entitlements: { plan: "pro", maxGrows: 999 },
      ...ctx
    };
    next();
  });
  app.use("/api/grows", require("./grows.personal"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || "error" });
  });
  return app;
}

function leanChain(items) {
  return {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
}

function doc(row) {
  return {
    ...row,
    save: jest.fn().mockResolvedValue(null),
    toObject() {
      const { save, toObject, ...value } = this;
      return value;
    }
  };
}

describe("Personal grows route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGrow.countDocuments.mockResolvedValue(0);
  });

  test("lists current user's personal grows", async () => {
    const rows = [{ _id: GROW_ID, userId: TEST_USER, name: "Flower Tent" }];
    const chain = leanChain(rows);
    mockGrow.find.mockReturnValue(chain);

    const res = await request(createApp()).get("/api/grows");

    expect(res.status).toBe(200);
    expect(res.body.grows).toEqual(rows);
    expect(mockGrow.find).toHaveBeenCalledWith({
      $or: [{ user: TEST_USER }, { userId: TEST_USER }],
      deletedAt: null
    });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test("creates a grow within the authenticated user's entitlement limit", async () => {
    mockGrow.create.mockResolvedValue(
      doc({
        _id: GROW_ID,
        user: TEST_USER,
        userId: TEST_USER,
        name: "Flower Tent",
        title: "Flower Tent",
        photos: []
      })
    );

    const res = await request(createApp())
      .post("/api/grows")
      .send({ name: "Flower Tent", stage: "flower", cultivar: "Test cultivar" });

    expect(res.status).toBe(201);
    expect(res.body.grow).toMatchObject({
      _id: GROW_ID,
      userId: TEST_USER,
      name: "Flower Tent"
    });
    expect(mockGrow.countDocuments).toHaveBeenCalledWith({
      $or: [{ user: TEST_USER }, { userId: TEST_USER }],
      deletedAt: null
    });
    expect(mockGrow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: TEST_USER,
        userId: TEST_USER,
        title: "Flower Tent",
        name: "Flower Tent",
        stage: "flower",
        strain: "Test cultivar",
        cultivar: "Test cultivar"
      })
    );
  });

  test("blocks grow creation when entitlement limit is reached", async () => {
    mockGrow.countDocuments.mockResolvedValue(1);

    const res = await request(createApp({ entitlements: { plan: "free", maxGrows: 1 } }))
      .post("/api/grows")
      .send({ name: "Second Grow" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("LIMIT_REACHED");
    expect(mockGrow.create).not.toHaveBeenCalled();
  });

  test("adds grow photos without duplicating existing URLs", async () => {
    const grow = doc({
      _id: GROW_ID,
      userId: TEST_USER,
      name: "Flower Tent",
      photo: "https://example.test/a.jpg",
      photoUrl: "https://example.test/a.jpg",
      photos: ["https://example.test/a.jpg"]
    });
    mockGrow.findOne.mockResolvedValue(grow);

    const res = await request(createApp())
      .patch(`/api/grows/${GROW_ID}/photos`)
      .send({
        photos: ["https://example.test/a.jpg", "https://example.test/b.jpg"]
      });

    expect(res.status).toBe(200);
    expect(res.body.grow.photos).toEqual([
      "https://example.test/a.jpg",
      "https://example.test/b.jpg"
    ]);
    expect(mockGrow.findOne).toHaveBeenCalledWith({
      $or: [{ growId: GROW_ID }, { _id: GROW_ID }],
      $and: [{ $or: [{ user: TEST_USER }, { userId: TEST_USER }] }],
      deletedAt: null
    });
    expect(grow.save).toHaveBeenCalled();
  });
});
