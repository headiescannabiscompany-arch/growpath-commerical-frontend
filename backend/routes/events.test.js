const request = require("supertest");
const express = require("express");

const mockLogEvent = jest.fn();

jest.mock("../middleware/authOptional", () => (req, res, next) => {
  req.user = { id: "user_test_123" };
  next();
});

jest.mock("../utils/logEvent", () => ({
  logEvent: (...args) => mockLogEvent(...args)
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/events", require("./events"));
  return app;
}

describe("Events Router (events.js)", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test("accepts canonical eventType payloads and logs analytics", async () => {
    mockLogEvent.mockResolvedValueOnce();

    const res = await request(app)
      .post("/api/events")
      .send({
        eventType: "view_feed",
        meta: { feed: "commercial" },
        source: "web",
        ts: "2026-07-01T12:00:00.000Z"
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: "user_test_123" } }),
      "view_feed",
      { feed: "commercial" },
      { source: "web", ts: "2026-07-01T12:00:00.000Z" }
    );
  });

  test("accepts legacy type payloads", async () => {
    mockLogEvent.mockResolvedValueOnce();

    const res = await request(app).post("/api/events").send({ type: "USER_LOGIN" });

    expect(res.status).toBe(200);
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "USER_LOGIN",
      {},
      expect.objectContaining({ source: "app" })
    );
  });

  test("rejects missing or unknown event types", async () => {
    const missing = await request(app).post("/api/events").send({});
    const unknown = await request(app).post("/api/events").send({ eventType: "unknown" });

    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe("VALIDATION_ERROR");
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  test("does not fail product flows when analytics logging fails", async () => {
    mockLogEvent.mockRejectedValueOnce(new Error("analytics down"));

    const res = await request(app).post("/api/events").send({ eventType: "hit_paywall" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
