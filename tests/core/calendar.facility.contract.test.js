"use strict";

const request = require("supertest");
const createApp = require("../../app");
const { connectTestDb, resetDb, seedFacility } = require("../helpers/testDb");

function testHeaders({ userId, facilityId, facilityRole }) {
  return {
    "x-test-user-id": userId,
    "x-test-facility-id": facilityId,
    "x-test-facility-role": facilityRole
  };
}

describe("Calendar Facility Contract", () => {
  let app;

  beforeAll(async () => {
    app = createApp();
    await connectTestDb();
  });

  beforeEach(resetDb);

  const facilityId = "fac_123";
  const base = `/api/facility/${facilityId}/calendar`;

  test("STAFF can list calendar events (shape: { calendarEvents: [] })", async () => {
    await seedFacility({
      facilityId,
      members: [{ userId: "u1", role: "STAFF" }],
      calendarEvents: [
        {
          type: "HARVEST_WINDOW",
          title: "Harvest Window (Ideal)",
          date: new Date("2026-02-10T12:00:00.000Z"),
          growId: "grow_1",
          metadata: { source: "ai" }
        }
      ]
    });

    const res = await request(app)
      .get(`${base}?growId=grow_1&type=HARVEST_WINDOW`)
      .set(testHeaders({ userId: "u1", facilityId, facilityRole: "STAFF" }));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("calendarEvents");
    expect(Array.isArray(res.body.calendarEvents)).toBe(true);
    expect(res.body.calendarEvents.length).toBe(1);

    const ev = res.body.calendarEvents[0];
    expect(typeof ev.id).toBe("string");
    expect(ev.facilityId).toBe(facilityId);
    expect(ev.growId).toBe("grow_1");
    expect(ev.type).toBe("HARVEST_WINDOW");
    expect(ev.title).toBeTruthy();
    expect(typeof ev.date).toBe("string"); // ISO
  });

  test("Filters by growId", async () => {
    await seedFacility({
      facilityId,
      members: [{ userId: "u1", role: "STAFF" }],
      calendarEvents: [
        {
          type: "HARVEST_WINDOW",
          title: "A",
          date: new Date("2026-02-10Z"),
          growId: "grow_1"
        },
        {
          type: "HARVEST_WINDOW",
          title: "B",
          date: new Date("2026-02-11Z"),
          growId: "grow_2"
        }
      ]
    });

    const res = await request(app)
      .get(`${base}?growId=grow_1`)
      .set(testHeaders({ userId: "u1", facilityId, facilityRole: "STAFF" }));

    expect(res.status).toBe(200);
    expect(res.body.calendarEvents.length).toBe(1);
    expect(res.body.calendarEvents[0].growId).toBe("grow_1");
  });

  test("Filters by type", async () => {
    await seedFacility({
      facilityId,
      members: [{ userId: "u1", role: "STAFF" }],
      calendarEvents: [
        {
          type: "HARVEST_WINDOW",
          title: "Harvest",
          date: new Date("2026-02-10Z"),
          growId: "grow_1"
        },
        {
          type: "TOPDRESS",
          title: "Topdress",
          date: new Date("2026-02-09Z"),
          growId: "grow_1"
        }
      ]
    });

    const res = await request(app)
      .get(`${base}?type=TOPDRESS`)
      .set(testHeaders({ userId: "u1", facilityId, facilityRole: "STAFF" }));

    expect(res.status).toBe(200);
    expect(res.body.calendarEvents.length).toBe(1);
    expect(res.body.calendarEvents[0].type).toBe("TOPDRESS");
  });

  test("Sorts ascending by date", async () => {
    await seedFacility({
      facilityId,
      members: [{ userId: "u1", role: "STAFF" }],
      calendarEvents: [
        {
          type: "HARVEST_WINDOW",
          title: "Later",
          date: new Date("2026-02-12Z"),
          growId: "grow_1"
        },
        {
          type: "HARVEST_WINDOW",
          title: "Sooner",
          date: new Date("2026-02-10Z"),
          growId: "grow_1"
        }
      ]
    });

    const res = await request(app)
      .get(`${base}?growId=grow_1&type=HARVEST_WINDOW`)
      .set(testHeaders({ userId: "u1", facilityId, facilityRole: "STAFF" }));

    expect(res.status).toBe(200);
    const dates = res.body.calendarEvents.map((e) => e.date);
    expect(dates[0] <= dates[1]).toBe(true);
  });

  test("Respects limit cap at 200", async () => {
    const many = [];
    for (let i = 0; i < 250; i++) {
      many.push({
        type: "HARVEST_WINDOW",
        title: `E${i}`,
        date: new Date(Date.UTC(2026, 1, 1, 0, 0, i)),
        growId: "grow_1"
      });
    }

    await seedFacility({
      facilityId,
      members: [{ userId: "u1", role: "STAFF" }],
      calendarEvents: many
    });

    const res = await request(app)
      .get(`${base}?growId=grow_1&limit=999`)
      .set(testHeaders({ userId: "u1", facilityId, facilityRole: "STAFF" }));

    expect(res.status).toBe(200);
    expect(res.body.calendarEvents.length).toBe(200);
  });

  test("Filters by from/to date range", async () => {
    await seedFacility({
      facilityId,
      members: [{ userId: "u1", role: "STAFF" }],
      calendarEvents: [
        {
          type: "HARVEST_WINDOW",
          title: "A",
          date: new Date("2026-02-01T00:00:00Z"),
          growId: "grow_1"
        },
        {
          type: "HARVEST_WINDOW",
          title: "B",
          date: new Date("2026-02-10T00:00:00Z"),
          growId: "grow_1"
        },
        {
          type: "HARVEST_WINDOW",
          title: "C",
          date: new Date("2026-02-20T00:00:00Z"),
          growId: "grow_1"
        }
      ]
    });

    const res = await request(app)
      .get(`${base}?growId=grow_1&from=2026-02-05T00:00:00Z&to=2026-02-15T00:00:00Z`)
      .set(testHeaders({ userId: "u1", facilityId, facilityRole: "STAFF" }));

    expect(res.status).toBe(200);
    expect(res.body.calendarEvents.length).toBe(1);
    expect(res.body.calendarEvents[0].title).toBe("B");
  });

  test("Soft delete honored (deletedAt: null only)", async () => {
    await seedFacility({
      facilityId,
      members: [{ userId: "u1", role: "STAFF" }],
      calendarEvents: [
        {
          type: "HARVEST_WINDOW",
          title: "Alive",
          date: new Date("2026-02-10Z"),
          growId: "grow_1",
          deletedAt: null
        },
        {
          type: "HARVEST_WINDOW",
          title: "Dead",
          date: new Date("2026-02-11Z"),
          growId: "grow_1",
          deletedAt: new Date()
        }
      ]
    });

    const res = await request(app)
      .get(`${base}?growId=grow_1&type=HARVEST_WINDOW`)
      .set(testHeaders({ userId: "u1", facilityId, facilityRole: "STAFF" }));

    expect(res.status).toBe(200);
    expect(res.body.calendarEvents.length).toBe(1);
    expect(res.body.calendarEvents[0].title).toBe("Alive");
  });
});
