"use strict";

const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

function getUserId(req) {
  return String(req.userId || req.user?._id || "");
}

function safeRequire(path) {
  try {
    // eslint-disable-next-line global-require
    return require(path);
  } catch (e) {
    // Only ignore "module not found" for *this exact module path*.
    // If it exists but throws for another reason, do NOT swallow it.
    if (e && e.code === "MODULE_NOT_FOUND" && String(e.message || "").includes(path)) {
      return null;
    }
    throw e;
  }
}

function loadGrowModel() {
  return safeRequire("../models/Grow") || safeRequire("../models/grow") || null;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function optionalDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => String(item || "").trim()).filter(Boolean))
  );
}

function growLookupForUser(growId, userId) {
  const growFilters = [{ growId: String(growId) }];
  if (mongoose.isValidObjectId(String(growId))) growFilters.push({ _id: growId });
  return {
    $or: growFilters,
    $and: [{ $or: [{ user: userId }, { userId }] }],
    deletedAt: null
  };
}

// GET /api/personal/grows
router.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" }
    });
  }

  const Grow = loadGrowModel();
  if (!Grow?.find) {
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Grow model missing" }
    });
  }

  const grows = await Grow.find({
    $or: [{ user: userId }, { userId }],
    deletedAt: null
  })
    .sort({ createdAt: -1 })
    .lean();
  return res.status(200).json({ success: true, grows: grows || [] });
});

// POST /api/personal/grows
router.post("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" }
    });
  }

  const name = String(req.body?.name || req.body?.title || "").trim();
  if (!name) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "name required" }
    });
  }

  const Grow = loadGrowModel();
  if (!Grow?.create) {
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Grow model missing" }
    });
  }

  // Optional: enforce maxGrows if present in entitlements
  const maxGrows =
    Number(req.ctx?.entitlements?.maxGrows) ||
    (req.ctx?.entitlements?.plan === "free" ? 1 : 999999);

  if (Number.isFinite(maxGrows) && maxGrows > 0 && Grow.countDocuments) {
    const count = await Grow.countDocuments({
      $or: [{ user: userId }, { userId }],
      deletedAt: null
    });
    if (count >= maxGrows) {
      return res.status(403).json({
        success: false,
        error: { code: "LIMIT_REACHED", message: "maxGrows limit reached" },
        limit: maxGrows
      });
    }
  }

  const grow = await Grow.create({
    user: userId,
    userId,
    title: name,
    name,
    body: req.body?.body || "",
    stage: req.body?.stage,
    photo: req.body?.photo || req.body?.photoUrl || undefined,
    photoUrl: req.body?.photoUrl || req.body?.photo || undefined,
    photos: Array.isArray(req.body?.photos)
      ? req.body.photos
      : req.body?.photo || req.body?.photoUrl
        ? [req.body.photo || req.body.photoUrl]
        : [],
    strain: req.body?.strain || req.body?.cultivar || undefined,
    cultivar: req.body?.cultivar || req.body?.strain || undefined,
    notes: req.body?.notes || undefined,
    growTags: stringList(req.body?.growTags),
    growInterests:
      req.body?.growInterests && typeof req.body.growInterests === "object"
        ? req.body.growInterests
        : {},
    cropTypes: stringList(req.body?.cropTypes),
    environmentTypes: stringList(req.body?.environmentTypes),
    growingMethods: stringList(req.body?.growingMethods),
    draftSource: req.body?.draftSource === "ai_assistant" ? "ai_assistant" : "manual",
    planning:
      req.body?.planning && typeof req.body.planning === "object"
        ? {
            startType: String(req.body.planning.startType || "seed"),
            plantCount: optionalNumber(req.body.planning.plantCount),
            vegLengthWeeks: optionalNumber(req.body.planning.vegLengthWeeks),
            expectedFlowerDays: optionalNumber(req.body.planning.expectedFlowerDays),
            createStarterCalendar: Boolean(req.body.planning.createStarterCalendar)
          }
        : {},
    systemPreset: req.body?.systemPreset || undefined,
    anchorDateType: req.body?.anchorDateType || undefined,
    anchorDate: optionalDate(req.body?.anchorDate),
    startDate: optionalDate(req.body?.startDate || req.body?.anchorDate),
    germinationDate: optionalDate(req.body?.germinationDate),
    cloneCutDate: optionalDate(req.body?.cloneCutDate),
    transplantDate: optionalDate(req.body?.transplantDate),
    timezone: req.body?.timezone || req.body?.timeZone || undefined,
    flipDate: optionalDate(req.body?.flipDate),
    flowerDay1Date: optionalDate(req.body?.flowerDay1Date),
    expectedHarvestDate: optionalDate(req.body?.expectedHarvestDate),
    actualHarvestDate: optionalDate(req.body?.actualHarvestDate),
    dryStartDate: optionalDate(req.body?.dryStartDate),
    cureStartDate: optionalDate(req.body?.cureStartDate),
    potSize: req.body?.potSize || undefined,
    potCount: optionalNumber(req.body?.potCount),
    targetVpdBand: req.body?.targetVpdBand || undefined
  });

  return res.status(201).json({
    success: true,
    grow: grow?.toObject ? grow.toObject() : grow
  });
});

// PATCH /api/personal/grows/:id/photos
router.patch("/:id/photos", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" }
    });
  }

  const photoUrls = (
    Array.isArray(req.body?.photos) ? req.body.photos : [req.body?.photo]
  )
    .filter(Boolean)
    .map((url) => String(url).trim())
    .filter(Boolean);
  if (!photoUrls.length) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "photos required" }
    });
  }

  const Grow = loadGrowModel();
  if (!Grow?.findOne) {
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Grow model missing" }
    });
  }

  const grow = await Grow.findOne(growLookupForUser(req.params.id, userId));
  if (!grow) {
    return res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Grow not found" }
    });
  }

  const photos = Array.isArray(grow.photos) ? grow.photos.map(String) : [];
  for (const url of photoUrls) {
    if (!photos.includes(url)) photos.push(url);
  }
  grow.photos = photos;
  if (!grow.photo) grow.photo = photos[0];
  if (!grow.photoUrl) grow.photoUrl = photos[0];

  await grow.save();
  return res.status(200).json({
    success: true,
    grow: grow?.toObject ? grow.toObject() : grow
  });
});

module.exports = router;
