"use strict";

const express = require("express");

const CommercialRecord = require("../models/CommercialRecord");

const router = express.Router();

function getUserId(req) {
  return String(
    req.userId ||
      req.ctx?.userId ||
      req.user?.id ||
      req.user?._id ||
      req.headers["x-test-user-id"] ||
      ""
  );
}

function requireUser(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" }
    });
    return "";
  }
  return userId;
}

function cleanString(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dto(row) {
  const value = row?.toObject ? row.toObject() : row;
  if (!value) return null;
  return {
    id: String(value._id || value.id || ""),
    _id: value._id,
    userId: value.userId,
    recordType: value.recordType,
    name: value.name || value.payload?.name || undefined,
    title: value.title || value.payload?.title || value.name || undefined,
    slug: value.slug || value.payload?.slug || undefined,
    status: value.status || value.payload?.status || undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(value.payload || {})
  };
}

function baseQuery(userId) {
  return { userId, recordType: "course", deletedAt: null };
}

function publicQuery() {
  return {
    recordType: "course",
    deletedAt: null,
    status: { $in: ["published", "active", "public"] }
  };
}

function coursePayload(body) {
  const payload = { ...(body || {}) };
  delete payload.id;
  delete payload._id;
  payload.title = cleanString(payload.title || payload.name || "Untitled course");
  payload.name = cleanString(payload.name || payload.title);
  payload.slug = cleanString(payload.slug || slugify(payload.title));
  payload.status = cleanString(
    payload.status || (payload.isPublished ? "published" : "draft")
  );
  payload.priceCents = Number.isFinite(Number(payload.priceCents))
    ? Number(payload.priceCents)
    : 0;
  payload.lessons = Array.isArray(payload.lessons) ? payload.lessons : [];
  return payload;
}

function normalizeLesson(body, fallback = {}) {
  return {
    ...fallback,
    id: fallback.id || `lesson-${Date.now()}`,
    title: cleanString(body?.title || fallback.title || "Untitled lesson"),
    body: cleanString(body?.body || body?.content || fallback.body || ""),
    videoUrl: cleanString(body?.videoUrl || fallback.videoUrl || ""),
    order: Number(body?.order || fallback.order || 1),
    status: body?.status || fallback.status || "draft"
  };
}

async function findOwnedCourseByLesson(userId, lessonId) {
  const rows = await CommercialRecord.find(baseQuery(userId))
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  return (rows || []).find((row) =>
    (row.payload?.lessons || []).some((lesson) => String(lesson.id) === String(lessonId))
  );
}

async function updateCourseLessons(userId, courseId, lessons) {
  return CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId), _id: courseId },
    { "payload.lessons": lessons },
    { new: true }
  ).lean();
}

async function listPublicCourses(req) {
  const q = cleanString(req.query.q || req.query.search || "").toLowerCase();
  const category = cleanString(req.query.category || req.params?.category || "");
  const rows = await CommercialRecord.find(publicQuery())
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit || 100), 250))
    .lean();
  return (rows || []).map(dto).filter((course) => {
    if (q) {
      const haystack = [
        course.title,
        course.name,
        course.description,
        course.summary,
        ...(Array.isArray(course.tags) ? course.tags : [])
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (category) {
      const courseCategory = cleanString(course.category || "").toLowerCase();
      if (courseCategory !== category.toLowerCase()) return false;
    }
    return true;
  });
}

async function createCourseRecord(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = coursePayload(req.body || {});
  const created = await CommercialRecord.create({
    userId,
    commercialAccountId: req.body?.commercialAccountId || null,
    recordType: "course",
    name: payload.name,
    title: payload.title,
    slug: payload.slug,
    status: payload.status,
    payload
  });
  res.status(201).json(dto(created));
}

async function listPublicCourseRecords(req, res) {
  const rows = await CommercialRecord.find(publicQuery())
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit || 100), 250))
    .lean();
  res.json({
    success: true,
    courses: (rows || []).map(dto),
    items: (rows || []).map(dto)
  });
}

router.get("/", listPublicCourseRecords);

router.post("/", createCourseRecord);

router.get("/list", listPublicCourseRecords);

router.get("/search", async (req, res) => {
  const courses = await listPublicCourses(req);
  res.json({ success: true, courses, items: courses });
});

router.get("/filter", async (req, res) => {
  const courses = await listPublicCourses(req);
  res.json({ success: true, courses, items: courses });
});

router.get("/categories", async (_req, res) => {
  const rows = await CommercialRecord.find(publicQuery()).limit(500).lean();
  const categories = Array.from(
    new Set((rows || []).map((row) => cleanString(row.payload?.category)).filter(Boolean))
  );
  res.json({ success: true, categories });
});

router.get("/category/:category", async (req, res) => {
  const courses = await listPublicCourses(req);
  res.json({ success: true, courses, items: courses });
});

router.get("/subcategories/:category", async (req, res) => {
  const rows = await CommercialRecord.find(publicQuery()).limit(500).lean();
  const subcategories = Array.from(
    new Set(
      (rows || [])
        .filter(
          (row) =>
            cleanString(row.payload?.category).toLowerCase() ===
            cleanString(req.params.category).toLowerCase()
        )
        .map((row) => cleanString(row.payload?.subcategory))
        .filter(Boolean)
    )
  );
  res.json({ success: true, subcategories });
});

router.get("/trending-tags", async (_req, res) => {
  const rows = await CommercialRecord.find(publicQuery()).limit(500).lean();
  const tags = Array.from(
    new Set((rows || []).flatMap((row) => row.payload?.tags || []).filter(Boolean))
  ).slice(0, 25);
  res.json({ success: true, tags });
});

router.get("/recommended", async (req, res) => {
  const courses = await listPublicCourses(req);
  res.json({ success: true, courses: courses.slice(0, 12), items: courses.slice(0, 12) });
});

router.get("/admin/pending", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const status = cleanString(req.query.status || "review");
  const rows = await CommercialRecord.find({
    recordType: "course",
    deletedAt: null,
    status: { $in: [status, "pending_review", "submitted"] }
  })
    .sort({ updatedAt: -1 })
    .limit(250)
    .lean();
  res.json({
    success: true,
    courses: (rows || []).map(dto),
    items: (rows || []).map(dto)
  });
});

router.put("/lesson/:lessonId", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const courseRow = await findOwnedCourseByLesson(userId, req.params.lessonId);
  if (!courseRow)
    return res.status(404).json({ success: false, message: "Lesson not found" });
  const course = dto(courseRow);
  const lessons = (course.lessons || []).map((lesson) =>
    String(lesson.id) === String(req.params.lessonId)
      ? normalizeLesson(req.body || {}, lesson)
      : lesson
  );
  const updated = await updateCourseLessons(userId, course.id, lessons);
  const lesson = lessons.find((item) => String(item.id) === String(req.params.lessonId));
  res.json({ success: true, lesson, course: dto(updated) });
});

router.delete("/lesson/:lessonId", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const courseRow = await findOwnedCourseByLesson(userId, req.params.lessonId);
  if (!courseRow)
    return res.status(404).json({ success: false, message: "Lesson not found" });
  const course = dto(courseRow);
  const lessons = (course.lessons || []).filter(
    (lesson) => String(lesson.id) !== String(req.params.lessonId)
  );
  const updated = await updateCourseLessons(userId, course.id, lessons);
  res.json({ success: true, deleted: true, course: dto(updated) });
});

router.post("/lesson/:lessonId/complete", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = {
    courseId: cleanString(req.body?.courseId || ""),
    lessonId: cleanString(req.params.lessonId),
    completedAt: new Date().toISOString()
  };
  const created = await CommercialRecord.create({
    userId,
    recordType: "lessonProgress",
    name: payload.lessonId,
    title: payload.lessonId,
    status: "complete",
    payload
  });
  res.status(201).json({ success: true, progress: dto(created), completed: true });
});

router.post("/lessons/:lessonId/view", async (req, res) => {
  const userId = getUserId(req) || "anonymous";
  const created = await CommercialRecord.create({
    userId,
    recordType: "courseEvent",
    name: "lesson_view",
    title: "lesson_view",
    status: "active",
    payload: { eventType: "lesson_view", lessonId: req.params.lessonId }
  });
  res.status(201).json({ success: true, event: dto(created) });
});

router.post("/lessons/:lessonId/watch", async (req, res) => {
  const userId = getUserId(req) || "anonymous";
  const created = await CommercialRecord.create({
    userId,
    recordType: "courseEvent",
    name: "lesson_watch",
    title: "lesson_watch",
    status: "active",
    payload: {
      eventType: "lesson_watch",
      lessonId: req.params.lessonId,
      seconds: Number(req.body?.seconds || 0)
    }
  });
  res.status(201).json({ success: true, event: dto(created) });
});

router.post("/lessons/:lessonId/dropoff", async (req, res) => {
  const userId = getUserId(req) || "anonymous";
  const created = await CommercialRecord.create({
    userId,
    recordType: "courseEvent",
    name: "lesson_dropoff",
    title: "lesson_dropoff",
    status: "active",
    payload: {
      eventType: "lesson_dropoff",
      lessonId: req.params.lessonId,
      seconds: Number(req.body?.seconds || 0)
    }
  });
  res.status(201).json({ success: true, event: dto(created) });
});

router.get("/mine", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const rows = await CommercialRecord.find(baseQuery(userId))
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit || 100), 250))
    .lean();
  res.json({
    success: true,
    courses: (rows || []).map(dto),
    items: (rows || []).map(dto)
  });
});

router.post("/create", createCourseRecord);

router.get("/:id", async (req, res) => {
  const userId = getUserId(req);
  const query = {
    recordType: "course",
    deletedAt: null,
    _id: req.params.id,
    ...(userId ? { $or: [{ userId }, publicQuery()] } : publicQuery())
  };
  const course = dto(await CommercialRecord.findOne(query).lean());
  if (!course)
    return res.status(404).json({ success: false, message: "Course not found" });
  res.json(course);
});

router.put("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = coursePayload(req.body || {});
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId), _id: req.params.id },
    {
      name: payload.name,
      title: payload.title,
      slug: payload.slug,
      status: payload.status,
      $set: Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [`payload.${k}`, v])
      )
    },
    { new: true }
  ).lean();
  if (!updated)
    return res.status(404).json({ success: false, message: "Course not found" });
  res.json(dto(updated));
});

router.post("/:id/lesson", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const course = dto(
    await CommercialRecord.findOne({ ...baseQuery(userId), _id: req.params.id }).lean()
  );
  if (!course)
    return res.status(404).json({ success: false, message: "Course not found" });
  const lesson = normalizeLesson(req.body || {}, {
    order: (course.lessons || []).length + 1
  });
  const lessons = [...(Array.isArray(course.lessons) ? course.lessons : []), lesson];
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId), _id: req.params.id },
    { "payload.lessons": lessons },
    { new: true }
  ).lean();
  res.status(201).json({ lesson, course: dto(updated) });
});

router.post("/:id/enroll", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const course = dto(
    await CommercialRecord.findOne({
      recordType: "course",
      deletedAt: null,
      _id: req.params.id,
      $or: [{ userId }, publicQuery()]
    }).lean()
  );
  if (!course)
    return res.status(404).json({ success: false, message: "Course not found" });
  const created = await CommercialRecord.create({
    userId,
    recordType: "courseEnrollment",
    name: course.title || course.name,
    title: course.title || course.name,
    status: "active",
    payload: { courseId: req.params.id, enrolledAt: new Date().toISOString() }
  });
  res.status(201).json({ success: true, enrollment: dto(created), enrolled: true });
});

router.get("/:id/enrollment-status", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const enrollment = dto(
    await CommercialRecord.findOne({
      userId,
      recordType: "courseEnrollment",
      deletedAt: null,
      "payload.courseId": req.params.id
    }).lean()
  );
  res.json({ success: true, enrolled: Boolean(enrollment), enrollment });
});

router.post("/:id/review", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = {
    courseId: req.params.id,
    rating: Number(req.body?.rating || 0),
    text: cleanString(req.body?.text || req.body?.body || ""),
    createdAt: new Date().toISOString()
  };
  const created = await CommercialRecord.create({
    userId,
    recordType: "courseReview",
    name: req.params.id,
    title: req.params.id,
    status: "published",
    payload
  });
  res.status(201).json({ success: true, review: dto(created) });
});

router.get("/:id/reviews", async (req, res) => {
  const rows = await CommercialRecord.find({
    recordType: "courseReview",
    deletedAt: null,
    "payload.courseId": req.params.id,
    status: { $in: ["published", "active"] }
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ success: true, reviews: (rows || []).map(dto) });
});

router.delete("/:id/review", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const updated = await CommercialRecord.findOneAndUpdate(
    {
      userId,
      recordType: "courseReview",
      deletedAt: null,
      "payload.courseId": req.params.id
    },
    { deletedAt: new Date(), status: "archived", "payload.status": "archived" },
    { new: true }
  ).lean();
  if (!updated)
    return res.status(404).json({ success: false, message: "Review not found" });
  res.json({ success: true, deleted: true });
});

router.get("/:id/recommendations", async (req, res) => {
  const courses = await listPublicCourses(req);
  const filtered = courses.filter(
    (course) => String(course.id) !== String(req.params.id)
  );
  res.json({ success: true, courses: filtered.slice(0, 6), items: filtered.slice(0, 6) });
});

router.put("/:id/submit-for-review", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId), _id: req.params.id },
    { status: "pending_review", "payload.status": "pending_review" },
    { new: true }
  ).lean();
  if (!updated)
    return res.status(404).json({ success: false, message: "Course not found" });
  res.json(dto(updated));
});

router.put("/:id/approve", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const updated = await CommercialRecord.findOneAndUpdate(
    { recordType: "course", deletedAt: null, _id: req.params.id },
    { status: "published", "payload.status": "published", "payload.isPublished": true },
    { new: true }
  ).lean();
  if (!updated)
    return res.status(404).json({ success: false, message: "Course not found" });
  res.json(dto(updated));
});

router.put("/:id/reject", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const updated = await CommercialRecord.findOneAndUpdate(
    { recordType: "course", deletedAt: null, _id: req.params.id },
    {
      status: "rejected",
      "payload.status": "rejected",
      "payload.rejectionReason": cleanString(req.body?.reason || "")
    },
    { new: true }
  ).lean();
  if (!updated)
    return res.status(404).json({ success: false, message: "Course not found" });
  res.json(dto(updated));
});

router.put("/:id/publish", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId), _id: req.params.id },
    { status: "published", "payload.status": "published", "payload.isPublished": true },
    { new: true }
  ).lean();
  if (!updated)
    return res.status(404).json({ success: false, message: "Course not found" });
  res.json(dto(updated));
});

module.exports = router;
