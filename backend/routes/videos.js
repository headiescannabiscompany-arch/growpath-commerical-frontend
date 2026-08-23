"use strict";

const express = require("express");

const CommercialRecord = require("../models/CommercialRecord");
const User = require("../models/User");
const Video = require("../models/Video");
const {
  normalizeLessonMedia,
  lessonMediaPublishBlockers
} = require("../services/lessonMedia");
const { videoStoragePolicy } = require("../services/videoPolicy");

const router = express.Router();
const WORKSPACES = new Set(["personal", "commercial", "facility"]);
const VISIBILITIES = new Set([
  "public",
  "followers",
  "unlisted",
  "private",
  "course_only",
  "facility_internal"
]);
const STATUSES = new Set(["draft", "published", "archived"]);
const FACILITY_UPLOAD_ROLES = new Set(["OWNER", "MANAGER", "STAFF"]);
const FACILITY_PUBLISH_ROLES = new Set(["OWNER", "MANAGER"]);

function cleanString(value) {
  return String(value || "").trim();
}

function cleanList(value, max = 25) {
  const list = Array.isArray(value) ? value : cleanString(value).split(",");
  return Array.from(
    new Set(
      list
        .map(cleanString)
        .filter(Boolean)
        .map((item) => item.slice(0, 80))
    )
  ).slice(0, max);
}

function getUserId(req) {
  return cleanString(
    req.userId ||
      req.ctx?.userId ||
      req.user?.id ||
      req.user?._id ||
      req.headers["x-test-user-id"]
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

function normalizedWorkspace(value) {
  const workspace = cleanString(value).toLowerCase();
  return WORKSPACES.has(workspace) ? workspace : "personal";
}

function facilityRole(req) {
  return cleanString(req.ctx?.facilityRole || req.user?.facilityRole).toUpperCase();
}

function activeFacilityId(req) {
  return cleanString(req.ctx?.facilityId || req.user?.facilityId);
}

function commercialWorkspaceId(req, userId) {
  return cleanString(
    req.ctx?.commercialAccountId ||
      req.user?.commercialAccountId ||
      req.user?.businessId ||
      userId
  );
}

function workspaceScope(req, requestedWorkspace, requestedWorkspaceId) {
  const userId = getUserId(req);
  const workspaceType = normalizedWorkspace(
    requestedWorkspace || req.ctx?.mode || req.user?.mode
  );
  if (workspaceType === "facility") {
    const facilityId = activeFacilityId(req);
    if (!facilityId || (requestedWorkspaceId && facilityId !== requestedWorkspaceId)) {
      return { error: "The selected Facility does not match this video workspace." };
    }
    return { workspaceType, workspaceId: facilityId, userId };
  }
  if (workspaceType === "commercial") {
    const workspaceId = commercialWorkspaceId(req, userId);
    if (requestedWorkspaceId && workspaceId !== requestedWorkspaceId) {
      return { error: "The selected Commercial workspace is not available." };
    }
    return { workspaceType, workspaceId, userId };
  }
  return { workspaceType: "personal", workspaceId: userId, userId };
}

function canWriteWorkspace(req, scope, action = "upload") {
  if (scope.workspaceType !== "facility") return true;
  const allowed = action === "publish" ? FACILITY_PUBLISH_ROLES : FACILITY_UPLOAD_ROLES;
  return allowed.has(facilityRole(req));
}

function cleanStatus(value, fallback = "draft") {
  const normalized = cleanString(value).toLowerCase();
  return STATUSES.has(normalized) ? normalized : fallback;
}

function cleanVisibility(value, fallback = "private") {
  const normalized = cleanString(value).toLowerCase();
  return VISIBILITIES.has(normalized) ? normalized : fallback;
}

function ownerName(req) {
  return cleanString(
    req.user?.displayName ||
      req.user?.name ||
      req.user?.businessName ||
      req.user?.companyName ||
      req.user?.email
  );
}

function planFromRequest(req) {
  return cleanString(
    req.ctx?.facilityPlan ||
      req.ctx?.plan ||
      req.entitlements?.plan ||
      req.user?.plan ||
      "free"
  ).toLowerCase();
}

function firstPartyMedia(mediaSource) {
  return mediaSource?.sourceType === "growpath_upload";
}

function videoDto(row, { owner = false } = {}) {
  const value = row?.toObject ? row.toObject() : row;
  if (!value) return null;
  const mediaSource = value.mediaSource || {};
  const payload = {
    id: cleanString(value._id || value.id),
    title: value.title,
    description: value.description || "",
    status: value.status,
    visibility: value.visibility,
    workspaceType: value.workspaceType,
    owner: {
      id: value.ownerUserId,
      displayName: value.ownerDisplayName || "GrowPath member",
      workspaceType: value.workspaceType
    },
    mediaSource,
    thumbnailUrl: value.thumbnailUrl || mediaSource.thumbnailUrl || "",
    durationSeconds: Number(value.durationSeconds || 0),
    tags: value.tags || [],
    growInterests: value.growInterests || [],
    cannabisSpecific: Boolean(value.cannabisSpecific),
    metrics: value.metrics || { viewCount: 0, engagementCount: 0 },
    publishedAt: value.publishedAt || null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
  if (!owner) return payload;
  return {
    ...payload,
    workspaceId: value.workspaceId,
    uploaderUserId: value.uploaderUserId,
    storageBytes: Number(value.storageBytes || 0),
    mimeType: value.mimeType || "",
    transcriptText: value.transcriptText || "",
    captionsText: value.captionsText || "",
    storageDeletionStatus: value.storageDeletionStatus || "not_applicable"
  };
}

function videoPublishBlockers(video) {
  const blockers = [];
  if (!cleanString(video?.title)) blockers.push("Add a video title.");
  const mediaBlockers = lessonMediaPublishBlockers(
    {
      title: cleanString(video?.title) || "Video",
      mediaSource: video?.mediaSource
    },
    0
  ).map((message) => message.replace(/^Video:\s*/i, ""));
  blockers.push(...mediaBlockers);
  if (video?.visibility === "private" || video?.visibility === "course_only") {
    blockers.push(
      "Choose public, followers-only, unlisted, or Facility-internal visibility."
    );
  }
  return blockers;
}

function escapeRegex(value) {
  return cleanString(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cannabisEligible(req, user) {
  if (req.ctx?.cannabisEligible === true || req.user?.cannabisEligible === true)
    return true;
  const interests = [
    ...(Array.isArray(req.ctx?.growInterests) ? req.ctx.growInterests : []),
    ...(Array.isArray(req.user?.growInterests) ? req.user.growInterests : []),
    ...(Array.isArray(user?.growInterests) ? user.growInterests : []),
    req.ctx?.accountPurpose,
    req.user?.accountPurpose
  ]
    .map((value) => cleanString(value).toLowerCase())
    .filter(Boolean);
  return interests.some((value) => /\b(cannabis|hemp)\b/.test(value));
}

async function viewerContext(req) {
  const userId = getUserId(req);
  if (!userId) {
    return { userId: "", followingIds: new Set(), cannabisEligible: false };
  }
  let user = req.user || null;
  if (typeof User.findById === "function") {
    try {
      const query = User.findById(userId);
      user = query?.lean ? await query.lean() : await query;
    } catch (_error) {
      user = req.user || null;
    }
  }
  const following = [
    ...(Array.isArray(req.ctx?.followingUserIds) ? req.ctx.followingUserIds : []),
    ...(Array.isArray(req.user?.following) ? req.user.following : []),
    ...(Array.isArray(user?.following) ? user.following : [])
  ];
  return {
    userId,
    followingIds: new Set(following.map(cleanString).filter(Boolean)),
    cannabisEligible: cannabisEligible(req, user)
  };
}

function discoveryAccessQuery(viewer) {
  const visibility = [{ visibility: "public" }];
  if (viewer.followingIds.size) {
    visibility.push({
      visibility: "followers",
      ownerUserId: { $in: Array.from(viewer.followingIds) }
    });
  }
  if (viewer.userId) {
    visibility.push({ ownerUserId: viewer.userId, visibility: "followers" });
  }
  return visibility;
}

async function storageUsage(scope) {
  const rows = await Video.find({
    workspaceType: scope.workspaceType,
    workspaceId: scope.workspaceId,
    "mediaSource.sourceType": "growpath_upload",
    storageReleasedAt: null
  }).lean();
  return rows.reduce((sum, row) => sum + Math.max(0, Number(row.storageBytes || 0)), 0);
}

async function quotaFor(req, scope) {
  const policy = videoStoragePolicy(planFromRequest(req));
  const usedBytes = await storageUsage(scope);
  return {
    ...policy,
    usedBytes,
    remainingBytes: Math.max(0, policy.limitBytes - usedBytes)
  };
}

async function normalizeVideoInput(req, res, fallback = {}) {
  const body = req.body || {};
  const normalized = normalizeLessonMedia(body.mediaSource || {}, {
    legacyUrl: body.videoUrl || fallback.mediaSource?.canonicalUrl || "",
    fallback: fallback.mediaSource || {}
  });
  if (normalized.errors.length || !normalized.mediaSource) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_VIDEO_SOURCE",
        message: normalized.errors.join(" ") || "A valid video source is required.",
        details: normalized.errors
      }
    });
    return null;
  }
  const status = cleanStatus(body.status, fallback.status || "draft");
  const visibility = cleanVisibility(
    body.visibility,
    fallback.visibility || (status === "published" ? "public" : "private")
  );
  const candidate = {
    ...fallback,
    title: cleanString(body.title ?? fallback.title).slice(0, 180),
    description: cleanString(body.description ?? fallback.description).slice(0, 5000),
    status,
    visibility,
    mediaSource: normalized.mediaSource,
    thumbnailUrl: cleanString(
      body.thumbnailUrl ?? normalized.mediaSource.thumbnailUrl ?? fallback.thumbnailUrl
    ),
    durationSeconds: Math.max(
      0,
      Number(body.durationSeconds ?? fallback.durationSeconds ?? 0) || 0
    ),
    storageBytes: firstPartyMedia(normalized.mediaSource)
      ? Math.max(0, Number(body.storageBytes ?? fallback.storageBytes ?? 0) || 0)
      : 0,
    mimeType: cleanString(body.mimeType ?? fallback.mimeType).slice(0, 120),
    tags: cleanList(body.tags ?? fallback.tags),
    growInterests: cleanList(body.growInterests ?? fallback.growInterests),
    cannabisSpecific: Boolean(body.cannabisSpecific ?? fallback.cannabisSpecific),
    transcriptText: cleanString(body.transcriptText ?? fallback.transcriptText).slice(
      0,
      100000
    ),
    captionsText: cleanString(body.captionsText ?? fallback.captionsText).slice(0, 100000)
  };
  if (!candidate.title) {
    res.status(400).json({
      success: false,
      error: { code: "VIDEO_TITLE_REQUIRED", message: "Video title is required." }
    });
    return null;
  }
  if (status === "published") {
    const blockers = videoPublishBlockers(candidate);
    if (blockers.length) {
      res.status(422).json({
        success: false,
        error: {
          code: "VIDEO_NOT_READY",
          message: "Resolve video publishing requirements before publishing.",
          details: blockers
        }
      });
      return null;
    }
  }
  return candidate;
}

router.get("/discover", async (req, res) => {
  const viewer = await viewerContext(req);
  const followingOnly =
    req.query.followingOnly === "true" || req.query.followingOnly === "1";
  const query = {
    deletedAt: null,
    status: "published",
    $and: [{ $or: discoveryAccessQuery(viewer) }]
  };
  if (followingOnly) {
    query.$and.push({
      ownerUserId: { $in: Array.from(viewer.followingIds) }
    });
  }
  if (!viewer.cannabisEligible) query.cannabisSpecific = false;
  const q = cleanString(req.query.q);
  const ownerId = cleanString(req.query.ownerId);
  if (ownerId) query.ownerUserId = ownerId;
  if (q) {
    const regex = { $regex: escapeRegex(q), $options: "i" };
    query.$and.push({
      $or: [
        { title: regex },
        { description: regex },
        { ownerDisplayName: regex },
        { tags: regex },
        { growInterests: regex },
        { transcriptText: regex },
        { captionsText: regex },
        { "mediaSource.textSummary": regex }
      ]
    });
  }
  const sort =
    req.query.sort === "popular"
      ? { "metrics.viewCount": -1, publishedAt: -1 }
      : { publishedAt: -1, createdAt: -1 };
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 18) || 18));
  const videos = await Video.find(query).sort(sort).limit(limit).lean();
  res.json({ success: true, videos: videos.map((row) => videoDto(row)) });
});

router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const scope = workspaceScope(req, req.query.workspaceType, req.query.workspaceId);
  if (scope.error) {
    return res.status(403).json({
      success: false,
      error: { code: "VIDEO_WORKSPACE_DENIED", message: scope.error }
    });
  }
  const libraryQuery = {
    workspaceType: scope.workspaceType,
    workspaceId: scope.workspaceId,
    deletedAt: null
  };
  if (scope.workspaceType === "facility") {
    const role = facilityRole(req);
    if (role === "STAFF") {
      libraryQuery.$or = [
        { status: "published" },
        { status: "draft", uploaderUserId: userId }
      ];
    } else if (!FACILITY_PUBLISH_ROLES.has(role)) {
      libraryQuery.status = "published";
      libraryQuery.visibility = {
        $in: ["public", "unlisted", "facility_internal"]
      };
    }
  }
  const videos = await Video.find(libraryQuery).sort({ updatedAt: -1 }).lean();
  res.json({
    success: true,
    videos: videos.map((row) => videoDto(row, { owner: true })),
    quota: await quotaFor(req, scope),
    permissions: {
      canUpload: canWriteWorkspace(req, scope, "upload"),
      canPublish: canWriteWorkspace(req, scope, "publish"),
      canManage: canWriteWorkspace(req, scope, "publish")
    }
  });
});

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const scope = workspaceScope(req, req.body?.workspaceType, req.body?.workspaceId);
  if (scope.error || !canWriteWorkspace(req, scope, "upload")) {
    return res.status(403).json({
      success: false,
      error: {
        code: "VIDEO_UPLOAD_DENIED",
        message: scope.error || "Your Facility role cannot upload videos."
      }
    });
  }
  if (
    cleanStatus(req.body?.status) === "published" &&
    !canWriteWorkspace(req, scope, "publish")
  ) {
    return res.status(403).json({
      success: false,
      error: {
        code: "VIDEO_PUBLISH_DENIED",
        message: "Your Facility role can upload drafts but cannot publish videos."
      }
    });
  }
  const candidate = await normalizeVideoInput(req, res);
  if (!candidate) return;
  const quota = await quotaFor(req, scope);
  if (
    firstPartyMedia(candidate.mediaSource) &&
    candidate.storageBytes > quota.remainingBytes
  ) {
    return res.status(413).json({
      success: false,
      error: {
        code: "VIDEO_STORAGE_LIMIT_EXCEEDED",
        message: "This upload exceeds the remaining video storage for this workspace."
      },
      quota
    });
  }
  const video = await Video.create({
    ...candidate,
    ownerUserId: userId,
    uploaderUserId: userId,
    workspaceType: scope.workspaceType,
    workspaceId: scope.workspaceId,
    ownerDisplayName: ownerName(req),
    publishedAt: candidate.status === "published" ? new Date() : null,
    storageDeletionStatus: firstPartyMedia(candidate.mediaSource)
      ? "active"
      : "not_applicable"
  });
  res.status(201).json({
    success: true,
    video: videoDto(video, { owner: true }),
    quota: await quotaFor(req, scope)
  });
});

async function ownedVideo(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return null;
  const video = await Video.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!video) {
    res.status(404).json({
      success: false,
      error: { code: "VIDEO_NOT_FOUND", message: "Video not found." }
    });
    return null;
  }
  const scope = workspaceScope(req, video.workspaceType, video.workspaceId);
  if (
    scope.error ||
    scope.workspaceId !== video.workspaceId ||
    (video.workspaceType === "personal" && video.ownerUserId !== userId)
  ) {
    res.status(404).json({
      success: false,
      error: { code: "VIDEO_NOT_FOUND", message: "Video not found." }
    });
    return null;
  }
  return { video, scope, userId };
}

router.patch("/:id", async (req, res) => {
  const owned = await ownedVideo(req, res);
  if (!owned) return;
  if (!canWriteWorkspace(req, owned.scope, "upload")) {
    return res.status(403).json({
      success: false,
      error: { code: "VIDEO_UPDATE_DENIED", message: "Video update is not allowed." }
    });
  }
  const staffDraftOnly =
    owned.scope.workspaceType === "facility" && facilityRole(req) === "STAFF";
  if (
    staffDraftOnly &&
    (owned.video.uploaderUserId !== owned.userId || owned.video.status !== "draft")
  ) {
    return res.status(403).json({
      success: false,
      error: {
        code: "VIDEO_UPDATE_DENIED",
        message: "Facility staff can edit only drafts they uploaded."
      }
    });
  }
  const candidate = await normalizeVideoInput(req, res, owned.video);
  if (!candidate) return;
  if (staffDraftOnly && candidate.status !== "draft") {
    return res.status(403).json({
      success: false,
      error: {
        code: "VIDEO_UPDATE_DENIED",
        message: "Facility staff can save their video only as a draft."
      }
    });
  }
  if (
    candidate.status === "published" &&
    !canWriteWorkspace(req, owned.scope, "publish")
  ) {
    return res.status(403).json({
      success: false,
      error: {
        code: "VIDEO_PUBLISH_DENIED",
        message: "Your Facility role cannot publish videos."
      }
    });
  }
  const quota = await quotaFor(req, owned.scope);
  const currentBytes = firstPartyMedia(owned.video.mediaSource)
    ? Number(owned.video.storageBytes || 0)
    : 0;
  const additionalBytes = Math.max(0, candidate.storageBytes - currentBytes);
  if (additionalBytes > quota.remainingBytes) {
    return res.status(413).json({
      success: false,
      error: {
        code: "VIDEO_STORAGE_LIMIT_EXCEEDED",
        message: "This change exceeds the remaining video storage for this workspace."
      },
      quota
    });
  }
  const updated = await Video.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    {
      ...candidate,
      publishedAt:
        candidate.status === "published"
          ? owned.video.publishedAt || new Date()
          : owned.video.publishedAt || null,
      storageDeletionStatus: firstPartyMedia(candidate.mediaSource)
        ? "active"
        : "not_applicable"
    },
    { new: true }
  ).lean();
  res.json({
    success: true,
    video: videoDto(updated, { owner: true }),
    quota: await quotaFor(req, owned.scope)
  });
});

router.delete("/:id", async (req, res) => {
  const owned = await ownedVideo(req, res);
  if (!owned) return;
  if (!canWriteWorkspace(req, owned.scope, "publish")) {
    return res.status(403).json({
      success: false,
      error: {
        code: "VIDEO_DELETE_DENIED",
        message: "Only an owner or manager can permanently remove this video record."
      }
    });
  }
  const linkedCourseQuery = {
    deletedAt: null,
    "payload.lessons.videoAssetId": cleanString(req.params.id)
  };
  if (owned.video.workspaceType === "personal") {
    linkedCourseQuery.userId = owned.video.ownerUserId;
  } else if (owned.video.workspaceType === "commercial") {
    linkedCourseQuery.$or = [
      { commercialAccountId: owned.video.workspaceId },
      { "payload.commercialAccountId": owned.video.workspaceId }
    ];
  } else {
    linkedCourseQuery.$or = [
      { facilityId: owned.video.workspaceId },
      { "payload.facilityId": owned.video.workspaceId }
    ];
  }
  const linkedCourse = await CommercialRecord.findOne(linkedCourseQuery).lean();
  if (linkedCourse) {
    return res.status(409).json({
      success: false,
      error: {
        code: "VIDEO_IN_USE",
        message:
          "Detach this video from every course lesson before removing it from the library."
      }
    });
  }
  const firstParty = firstPartyMedia(owned.video.mediaSource);
  const updated = await Video.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    {
      status: "deleted",
      deletedAt: new Date(),
      storageDeletionStatus: firstParty ? "pending" : "not_applicable"
    },
    { new: true }
  ).lean();
  res.json({
    success: true,
    deleted: true,
    storageDeletionStatus: updated?.storageDeletionStatus || "not_applicable",
    quota: await quotaFor(req, owned.scope)
  });
});

router.get("/:id", async (req, res) => {
  const video = await Video.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!video) {
    return res.status(404).json({
      success: false,
      error: { code: "VIDEO_NOT_FOUND", message: "Video not found." }
    });
  }
  const viewer = await viewerContext(req);
  const owner = viewer.userId && viewer.userId === video.ownerUserId;
  const sameFacility =
    video.workspaceType === "facility" &&
    activeFacilityId(req) &&
    activeFacilityId(req) === video.workspaceId;
  const facilityReviewer = sameFacility && FACILITY_PUBLISH_ROLES.has(facilityRole(req));
  const facilityUploader =
    sameFacility && viewer.userId && viewer.userId === video.uploaderUserId;
  const accessible =
    owner ||
    facilityReviewer ||
    facilityUploader ||
    (video.status === "published" &&
      (video.visibility === "public" ||
        video.visibility === "unlisted" ||
        (video.visibility === "followers" &&
          viewer.followingIds.has(video.ownerUserId)) ||
        (video.visibility === "facility_internal" && sameFacility)));
  if (!accessible || (video.cannabisSpecific && !viewer.cannabisEligible && !owner)) {
    return res.status(404).json({
      success: false,
      error: { code: "VIDEO_NOT_FOUND", message: "Video not found." }
    });
  }
  if (!owner && video.status === "published") {
    await Video.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $inc: { "metrics.viewCount": 1 } }
    ).lean();
  }
  res.json({ success: true, video: videoDto(video, { owner }) });
});

module.exports = router;
