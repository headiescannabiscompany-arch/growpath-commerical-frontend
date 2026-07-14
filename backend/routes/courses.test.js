const request = require("supertest");
const express = require("express");

const TEST_USER = "user-course-1";

let rows = [];

function makeDoc(row) {
  return {
    ...row,
    toObject: () => row
  };
}

function getPath(row, path) {
  return String(path)
    .split(".")
    .reduce((current, key) => (current ? current[key] : undefined), row);
}

function matches(row, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((sub) => matches(row, sub));
    if (expected && typeof expected === "object" && Array.isArray(expected.$in)) {
      return expected.$in.includes(getPath(row, key));
    }
    return getPath(row, key) === expected;
  });
}

function chain(items) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
}

function one(item) {
  return {
    lean: jest.fn().mockResolvedValue(item)
  };
}

function applyPatch(row, patch) {
  const next = { ...row, payload: { ...(row.payload || {}) } };
  for (const [key, value] of Object.entries(patch || {})) {
    if (key === "$set") {
      for (const [setKey, setValue] of Object.entries(value || {})) {
        if (setKey.startsWith("payload.")) next.payload[setKey.slice(8)] = setValue;
        else next[setKey] = setValue;
      }
    } else if (key.startsWith("payload.")) {
      next.payload[key.slice(8)] = value;
    } else {
      next[key] = value;
    }
  }
  return next;
}

const mockCommercialRecord = {
  find: jest.fn((query) => chain(rows.filter((row) => matches(row, query)))),
  findOne: jest.fn((query) => one(rows.find((row) => matches(row, query)) || null)),
  create: jest.fn(async (data) => {
    const row = {
      _id: `course-${rows.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      ...data
    };
    rows.unshift(row);
    return makeDoc(row);
  }),
  findOneAndUpdate: jest.fn((query, patch, options = {}) => {
    const index = rows.findIndex((row) => matches(row, query));
    if (index < 0 && options.upsert) {
      const inserted = applyPatch(
        {
          _id: `course-${rows.length + 1}`,
          userId: query.userId,
          recordType: query.recordType,
          deletedAt: null,
          payload: {}
        },
        patch
      );
      rows.unshift(inserted);
      return one(inserted);
    }
    if (index < 0) return one(null);
    rows[index] = applyPatch(rows[index], patch);
    return one(rows[index]);
  })
};

jest.mock("../models/CommercialRecord", () => mockCommercialRecord);

function createApp(withUser = true) {
  const app = express();
  app.use(express.json());
  if (withUser) {
    app.use((req, _res, next) => {
      req.userId = TEST_USER;
      req.user = { _id: TEST_USER, id: TEST_USER };
      next();
    });
  }
  app.use("/api/courses", require("./courses"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || "error" });
  });
  return app;
}

describe("generic courses backend routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rows = [];
  });

  test("free/personal/commercial users can create a draft course", async () => {
    const app = createApp();
    const res = await request(app).post("/api/courses/create").send({
      title: "Using Veg Mix",
      summary: "Course for all users",
      priceCents: 0,
      workspace: "personal"
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Using Veg Mix",
      status: "draft",
      userId: TEST_USER,
      priceCents: 0
    });
  });

  test("generic course create and list aliases match frontend wrappers", async () => {
    const app = createApp();
    const created = await request(app).post("/api/courses").send({
      title: "Universal Creator Course",
      summary: "Works for any signed-in user",
      status: "published"
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      title: "Universal Creator Course",
      status: "published",
      userId: TEST_USER
    });

    const listed = await request(createApp(false)).get("/api/courses/list");
    expect(listed.status).toBe(200);
    expect(listed.body.courses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Universal Creator Course" })
      ])
    );
  });

  test("authenticated free users can create paid course drafts", async () => {
    const app = createApp();
    const res = await request(app).post("/api/courses/create").send({
      title: "Paid Seedling Course",
      summary: "Paid course draft for a free creator account",
      priceCents: 1900,
      workspace: "personal"
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Paid Seedling Course",
      status: "draft",
      userId: TEST_USER,
      priceCents: 1900,
      workspace: "personal"
    });
  });

  test("course owner can add lessons and publish", async () => {
    const app = createApp();
    const created = await request(app)
      .post("/api/courses/create")
      .send({ title: "Soil Basics" });

    const lesson = await request(app)
      .post(`/api/courses/${created.body.id}/lesson`)
      .send({ title: "Start here", body: "Lesson body" });
    expect(lesson.status).toBe(201);
    expect(lesson.body.lesson).toMatchObject({ title: "Start here" });

    const published = await request(app).put(`/api/courses/${created.body.id}/publish`);
    expect(published.status).toBe(200);
    expect(published.body.status).toBe("published");
    expect(published.body.isPublished).toBe(true);
  });

  test("course owner can update and delete lessons by lesson route", async () => {
    const app = createApp();
    const created = await request(app)
      .post("/api/courses/create")
      .send({ title: "Clone Room" });
    const added = await request(app)
      .post(`/api/courses/${created.body.id}/lesson`)
      .send({ title: "Old title", body: "Draft" });

    const updated = await request(app)
      .put(`/api/courses/lesson/${added.body.lesson.id}`)
      .send({ title: "New title", body: "Better lesson" });
    expect(updated.status).toBe(200);
    expect(updated.body.lesson).toMatchObject({
      id: added.body.lesson.id,
      title: "New title",
      body: "Better lesson"
    });

    const deleted = await request(app).delete(
      `/api/courses/lesson/${added.body.lesson.id}`
    );
    expect(deleted.status).toBe(200);
    expect(deleted.body.deleted).toBe(true);
    expect(deleted.body.course.lessons).toEqual([]);
  });

  test("users can enroll, check status, complete lessons, and review courses", async () => {
    const app = createApp();
    const created = await request(app)
      .post("/api/courses/create")
      .send({ title: "Public Soil Course", status: "published" });
    const added = await request(app)
      .post(`/api/courses/${created.body.id}/lesson`)
      .send({ title: "Watch this" });

    const enrollment = await request(app).post(`/api/courses/${created.body.id}/enroll`);
    expect(enrollment.status).toBe(201);
    expect(enrollment.body.enrolled).toBe(true);

    const status = await request(app).get(
      `/api/courses/${created.body.id}/enrollment-status`
    );
    expect(status.status).toBe(200);
    expect(status.body.enrolled).toBe(true);

    const complete = await request(app)
      .post(`/api/courses/lesson/${added.body.lesson.id}/complete`)
      .send({ courseId: created.body.id });
    expect(complete.status).toBe(201);
    expect(complete.body.completed).toBe(true);

    const review = await request(app)
      .post(`/api/courses/${created.body.id}/review`)
      .send({ rating: 5, text: "Useful." });
    expect(review.status).toBe(201);
    expect(review.body.review).toMatchObject({ rating: 5, text: "Useful." });

    const reviews = await request(app).get(`/api/courses/${created.body.id}/reviews`);
    expect(reviews.status).toBe(200);
    expect(reviews.body.reviews).toHaveLength(1);
  });

  test("enrolled learners can RSVP and receive course lives in their calendar feed", async () => {
    const app = createApp();
    const created = await request(app).post("/api/courses/create").send({
      title: "Live Grow Class",
      status: "published",
      liveSessions: [
        {
          id: "live-1",
          title: "Canopy Q&A",
          scheduledStart: "2026-08-01T19:00:00-04:00",
          timezone: "America/New_York",
          twitchChannel: "growpath",
          meetingUrl: "https://www.twitch.tv/growpath"
        }
      ]
    });
    await request(app).post(`/api/courses/${created.body.id}/enroll`);

    const rsvp = await request(app)
      .post(`/api/courses/${created.body.id}/lives/live-1/rsvp`)
      .send({ reminderPlan: { label: "1 hour before", channels: ["in_app"] } });
    expect(rsvp.status).toBe(201);
    expect(rsvp.body).toMatchObject({ success: true, rsvped: true });

    const status = await request(app).get(`/api/courses/${created.body.id}/live-rsvps`);
    expect(status.body.sessionIds).toEqual(["live-1"]);

    const calendar = await request(app).get("/api/courses/mine/live-events");
    expect(calendar.body.liveEvents).toEqual([
      expect.objectContaining({
        sessionId: "live-1",
        courseId: created.body.id,
        title: "Canopy Q&A",
        rsvped: true
      })
    ]);
  });

  test("public course list only returns published courses", async () => {
    rows.push(
      {
        _id: "published-course",
        userId: "other",
        recordType: "course",
        title: "Published",
        status: "published",
        payload: { title: "Published", status: "published" },
        deletedAt: null
      },
      {
        _id: "draft-course",
        userId: "other",
        recordType: "course",
        title: "Draft",
        status: "draft",
        payload: { title: "Draft", status: "draft" },
        deletedAt: null
      }
    );

    const res = await request(createApp(false)).get("/api/courses");
    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);
    expect(res.body.courses[0].title).toBe("Published");
  });

  test("search, categories, and recommended courses use public published courses", async () => {
    rows.push(
      {
        _id: "soil-course",
        userId: "other",
        recordType: "course",
        title: "Soil Course",
        status: "published",
        payload: {
          title: "Soil Course",
          status: "published",
          category: "soil",
          subcategory: "living soil",
          tags: ["soil", "biology"]
        },
        deletedAt: null
      },
      {
        _id: "clone-course",
        userId: "other",
        recordType: "course",
        title: "Clone Course",
        status: "published",
        payload: {
          title: "Clone Course",
          status: "published",
          category: "propagation",
          tags: ["clones"]
        },
        deletedAt: null
      }
    );

    const search = await request(createApp(false)).get("/api/courses/search?q=soil");
    expect(search.status).toBe(200);
    expect(search.body.courses).toHaveLength(1);
    expect(search.body.courses[0].title).toBe("Soil Course");

    const categories = await request(createApp(false)).get("/api/courses/categories");
    expect(categories.body.categories).toEqual(
      expect.arrayContaining(["soil", "propagation"])
    );

    const recommended = await request(createApp(false)).get("/api/courses/recommended");
    expect(recommended.body.courses).toHaveLength(2);
  });
});
