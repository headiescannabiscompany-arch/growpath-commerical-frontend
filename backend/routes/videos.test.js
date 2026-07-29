const express = require("express");
const request = require("supertest");

let videos = [];
let courses = [];
let users = new Map();

function valuesAtPath(value, parts) {
  if (!parts.length) return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => valuesAtPath(item, parts));
  }
  if (!value || typeof value !== "object") return [undefined];
  return valuesAtPath(value[parts[0]], parts.slice(1));
}

function matchExpected(values, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if (Array.isArray(expected.$in)) {
      return values.some((value) => expected.$in.includes(value));
    }
    if (expected.$regex !== undefined) {
      const pattern =
        expected.$regex instanceof RegExp
          ? expected.$regex
          : new RegExp(expected.$regex, expected.$options || "");
      return values.some((value) => pattern.test(String(value || "")));
    }
  }
  return values.some((value) => value === expected);
}

function matches(row, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === "$and") return expected.every((condition) => matches(row, condition));
    if (key === "$or") return expected.some((condition) => matches(row, condition));
    return matchExpected(valuesAtPath(row, key.split(".")), expected);
  });
}

function makeDoc(row) {
  return { ...row, toObject: () => row };
}

function chain(rows) {
  let result = [...rows];
  return {
    sort(sort) {
      const entries = Object.entries(sort || {});
      result.sort((left, right) => {
        for (const [path, direction] of entries) {
          const leftValue = valuesAtPath(left, path.split("."))[0] || 0;
          const rightValue = valuesAtPath(right, path.split("."))[0] || 0;
          if (leftValue === rightValue) continue;
          return leftValue > rightValue ? -Number(direction) : Number(direction);
        }
        return 0;
      });
      return this;
    },
    limit(value) {
      result = result.slice(0, Number(value));
      return this;
    },
    lean: jest.fn(async () => result)
  };
}

function one(value) {
  return { lean: jest.fn(async () => value || null) };
}

const mockVideo = {
  find: jest.fn((query) => chain(videos.filter((video) => matches(video, query)))),
  findOne: jest.fn((query) => one(videos.find((video) => matches(video, query)) || null)),
  create: jest.fn(async (data) => {
    const now = new Date().toISOString();
    const row = {
      _id: `video-${videos.length + 1}`,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      storageReleasedAt: null,
      metrics: { viewCount: 0, engagementCount: 0 },
      ...data
    };
    videos.push(row);
    return makeDoc(row);
  }),
  findOneAndUpdate: jest.fn((query, patch) => {
    const index = videos.findIndex((video) => matches(video, query));
    if (index < 0) return one(null);
    const increments = patch.$inc || {};
    const assignments = { ...patch };
    delete assignments.$inc;
    videos[index] = {
      ...videos[index],
      ...assignments,
      metrics: {
        ...(videos[index].metrics || {}),
        viewCount:
          Number(videos[index].metrics?.viewCount || 0) +
          Number(increments["metrics.viewCount"] || 0),
        engagementCount: Number(videos[index].metrics?.engagementCount || 0)
      },
      updatedAt: new Date().toISOString()
    };
    return one(videos[index]);
  })
};

const mockCommercialRecord = {
  findOne: jest.fn((query) =>
    one(courses.find((course) => matches(course, query)) || null)
  )
};

const mockUser = {
  findById: jest.fn((id) => one(users.get(String(id)) || null))
};

jest.mock("../models/Video", () => mockVideo);
jest.mock("../models/CommercialRecord", () => mockCommercialRecord);
jest.mock("../models/User", () => mockUser);

function mediaSource(url = "/uploads/video.mp4") {
  return {
    sourceType: url.startsWith("/uploads/") ? "growpath_upload" : "other_url",
    originalUrl: url,
    canonicalUrl: url,
    title: "Library video",
    availabilityStatus: "available",
    lastCheckedAt: "2026-07-25T12:00:00.000Z",
    creatorRightsConfirmed: true,
    captionsStatus: "provided",
    transcriptStatus: "unknown",
    textSummary: "A complete viewer-readable summary.",
    allowEmbed: false
  };
}

function createApp({
  userId = "user-1",
  plan = "free",
  mode = "personal",
  facilityId = "",
  facilityRole = ""
} = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (userId) {
      req.userId = userId;
      req.user = {
        id: userId,
        _id: userId,
        displayName: `Member ${userId}`,
        plan
      };
      req.ctx = {
        userId,
        plan,
        mode,
        facilityId: facilityId || undefined,
        facilityRole: facilityRole || undefined
      };
    }
    next();
  });
  app.use("/api/videos", require("./videos"));
  return app;
}

describe("shared video routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    videos = [];
    courses = [];
    users = new Map();
  });

  test("creates a Personal video and returns real plan usage", async () => {
    const app = createApp();
    const created = await request(app)
      .post("/api/videos")
      .send({
        title: "Propagation basics",
        description: "A public introduction.",
        status: "draft",
        visibility: "public",
        mediaSource: mediaSource(),
        storageBytes: 25 * 1024 * 1024
      });

    expect(created.status).toBe(201);
    expect(created.body.video).toMatchObject({
      title: "Propagation basics",
      workspaceType: "personal",
      storageBytes: 25 * 1024 * 1024
    });
    expect(created.body.quota).toMatchObject({
      limitBytes: 500 * 1024 * 1024,
      usedBytes: 25 * 1024 * 1024
    });
  });

  test("returns public and followed videos without leaking private or cannabis results", async () => {
    users.set("viewer-1", {
      _id: "viewer-1",
      following: ["followed-1"],
      growInterests: ["tomatoes"]
    });
    const base = {
      description: "",
      status: "published",
      workspaceType: "personal",
      workspaceId: "owner",
      uploaderUserId: "owner",
      mediaSource: mediaSource("https://example.com/video"),
      deletedAt: null,
      publishedAt: "2026-07-25T12:00:00.000Z"
    };
    videos = [
      {
        ...base,
        _id: "public-1",
        ownerUserId: "public-owner",
        ownerDisplayName: "Public owner",
        title: "Public tomatoes",
        visibility: "public",
        cannabisSpecific: false
      },
      {
        ...base,
        _id: "followed-1-video",
        ownerUserId: "followed-1",
        ownerDisplayName: "Followed owner",
        title: "Followers greenhouse",
        visibility: "followers",
        cannabisSpecific: false
      },
      {
        ...base,
        _id: "private-1",
        ownerUserId: "private-owner",
        title: "Private video",
        visibility: "private",
        cannabisSpecific: false
      },
      {
        ...base,
        _id: "cannabis-1",
        ownerUserId: "cannabis-owner",
        title: "Cannabis harvest",
        visibility: "public",
        cannabisSpecific: true
      }
    ];

    const response = await request(createApp({ userId: "viewer-1" })).get(
      "/api/videos/discover"
    );

    expect(response.status).toBe(200);
    expect(response.body.videos.map((video) => video.id)).toEqual(
      expect.arrayContaining(["public-1", "followed-1-video"])
    );
    expect(response.body.videos.map((video) => video.id)).not.toEqual(
      expect.arrayContaining(["private-1", "cannabis-1"])
    );

    const followingResponse = await request(createApp({ userId: "viewer-1" })).get(
      "/api/videos/discover?followingOnly=true"
    );

    expect(followingResponse.status).toBe(200);
    expect(followingResponse.body.videos.map((video) => video.id)).toEqual([
      "followed-1-video"
    ]);

    const viewed = await request(createApp({ userId: "viewer-1" })).get(
      "/api/videos/public-1"
    );
    expect(viewed.status).toBe(200);
    expect(videos.find((video) => video._id === "public-1").metrics.viewCount).toBe(1);
  });

  test("allows Facility staff to upload drafts but not publish them", async () => {
    const app = createApp({
      userId: "staff-1",
      plan: "facility",
      mode: "facility",
      facilityId: "facility-1",
      facilityRole: "STAFF"
    });
    const draft = await request(app).post("/api/videos").send({
      title: "Room training",
      status: "draft",
      visibility: "facility_internal",
      workspaceType: "facility",
      workspaceId: "facility-1",
      mediaSource: mediaSource()
    });
    const published = await request(app).post("/api/videos").send({
      title: "Published room training",
      status: "published",
      visibility: "facility_internal",
      workspaceType: "facility",
      workspaceId: "facility-1",
      mediaSource: mediaSource()
    });

    expect(draft.status).toBe(201);
    expect(published.status).toBe(403);
    expect(published.body.error.code).toBe("VIDEO_PUBLISH_DENIED");
  });

  test("limits Facility staff edits to drafts they uploaded", async () => {
    const sharedDraft = {
      _id: "manager-draft",
      ownerUserId: "manager-1",
      uploaderUserId: "manager-1",
      ownerDisplayName: "Facility manager",
      workspaceType: "facility",
      workspaceId: "facility-1",
      title: "Manager draft",
      status: "draft",
      visibility: "facility_internal",
      mediaSource: mediaSource(),
      deletedAt: null
    };
    const staffDraft = {
      ...sharedDraft,
      _id: "staff-draft",
      ownerUserId: "staff-1",
      uploaderUserId: "staff-1",
      title: "Staff draft"
    };
    videos = [sharedDraft, staffDraft];
    const app = createApp({
      userId: "staff-1",
      plan: "facility",
      mode: "facility",
      facilityId: "facility-1",
      facilityRole: "STAFF"
    });

    const denied = await request(app)
      .patch("/api/videos/manager-draft")
      .send({ title: "Changed by staff" });
    const updated = await request(app)
      .patch("/api/videos/staff-draft")
      .send({ title: "Updated staff draft" });

    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("VIDEO_UPDATE_DENIED");
    expect(updated.status).toBe(200);
    expect(updated.body.video.title).toBe("Updated staff draft");
  });

  test("shows Facility drafts only to their uploader or reviewers", async () => {
    const base = {
      ownerUserId: "staff-1",
      uploaderUserId: "staff-1",
      ownerDisplayName: "Facility staff",
      workspaceType: "facility",
      workspaceId: "facility-1",
      mediaSource: mediaSource(),
      deletedAt: null
    };
    videos = [
      {
        ...base,
        _id: "staff-draft",
        title: "Staff draft",
        status: "draft",
        visibility: "facility_internal"
      },
      {
        ...base,
        _id: "published-training",
        title: "Published training",
        status: "published",
        visibility: "facility_internal"
      }
    ];

    const viewerApp = createApp({
      userId: "viewer-1",
      plan: "facility",
      mode: "facility",
      facilityId: "facility-1",
      facilityRole: "VIEWER"
    });
    const managerApp = createApp({
      userId: "manager-1",
      plan: "facility",
      mode: "facility",
      facilityId: "facility-1",
      facilityRole: "MANAGER"
    });

    const viewerLibrary = await request(viewerApp).get(
      "/api/videos?workspaceType=facility&workspaceId=facility-1"
    );
    const viewerDraft = await request(viewerApp).get("/api/videos/staff-draft");
    const managerDraft = await request(managerApp).get("/api/videos/staff-draft");

    expect(viewerLibrary.status).toBe(200);
    expect(viewerLibrary.body.videos.map((video) => video.id)).toEqual([
      "published-training"
    ]);
    expect(viewerDraft.status).toBe(404);
    expect(managerDraft.status).toBe(200);
    expect(managerDraft.body.video.id).toBe("staff-draft");
  });

  test("blocks removal while a course still references the video", async () => {
    videos = [
      {
        _id: "video-1",
        ownerUserId: "user-1",
        uploaderUserId: "user-1",
        workspaceType: "personal",
        workspaceId: "user-1",
        title: "Reusable course video",
        status: "draft",
        visibility: "course_only",
        mediaSource: mediaSource(),
        deletedAt: null
      }
    ];
    courses = [
      {
        _id: "course-1",
        userId: "user-1",
        deletedAt: null,
        payload: { lessons: [{ id: "lesson-1", videoAssetId: "video-1" }] }
      }
    ];

    const response = await request(createApp()).delete("/api/videos/video-1");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("VIDEO_IN_USE");
  });

  test("does not let another account block removal with a copied video ID", async () => {
    videos = [
      {
        _id: "video-1",
        ownerUserId: "user-1",
        uploaderUserId: "user-1",
        workspaceType: "personal",
        workspaceId: "user-1",
        title: "Owner video",
        status: "draft",
        visibility: "course_only",
        mediaSource: mediaSource("https://example.com/video"),
        deletedAt: null
      }
    ];
    courses = [
      {
        _id: "unrelated-course",
        userId: "another-user",
        deletedAt: null,
        payload: { lessons: [{ id: "lesson-1", videoAssetId: "video-1" }] }
      }
    ];

    const response = await request(createApp()).delete("/api/videos/video-1");

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(true);
  });
});
