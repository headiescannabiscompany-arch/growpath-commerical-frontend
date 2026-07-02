const request = require("supertest");
const express = require("express");

const mockNotification = {
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn()
};

jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = { id: "user_test_123" };
  next();
});

jest.mock("../models/Notification", () => mockNotification);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/notifications", require("./notifications"));
  return app;
}

function mockFindLean(items) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
  mockNotification.find.mockReturnValue(chain);
  return chain;
}

describe("Notifications Router (notifications.js)", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test("lists notifications for the authenticated user", async () => {
    const items = [{ _id: "notif_1", title: "New post", read: false }];
    const chain = mockFindLean(items);

    const res = await request(app).get("/api/notifications");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, items });
    expect(mockNotification.find).toHaveBeenCalledWith({ user: "user_test_123" });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  test("marks one notification read when it belongs to the authenticated user", async () => {
    const lean = jest.fn().mockResolvedValue({ _id: "notif_1", read: true });
    mockNotification.findOneAndUpdate.mockReturnValue({ lean });

    const res = await request(app).post("/api/notifications/read/notif_1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockNotification.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "notif_1", user: "user_test_123" },
      { $set: { read: true } },
      { new: true }
    );
  });

  test("returns 404 when marking a missing notification read", async () => {
    mockNotification.findOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const res = await request(app).post("/api/notifications/read/missing");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Notification not found" });
  });

  test("marks all unread notifications read for the authenticated user", async () => {
    mockNotification.updateMany.mockResolvedValue({ modifiedCount: 2 });

    const res = await request(app).post("/api/notifications/read-all");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockNotification.updateMany).toHaveBeenCalledWith(
      { user: "user_test_123", read: false },
      { $set: { read: true } }
    );
  });

  test("returns 500 when notification listing fails", async () => {
    mockNotification.find.mockImplementation(() => {
      throw new Error("db down");
    });

    const res = await request(app).get("/api/notifications");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Failed to load notifications" });
  });
});
