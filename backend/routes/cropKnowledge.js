"use strict";

const express = require("express");
const mongoose = require("mongoose");

const CropProfile = require("../models/CropProfile");
const OrganismProfile = require("../models/OrganismProfile");
const PlantGrowthProfile = require("../models/PlantGrowthProfile");
const PlantTaxon = require("../models/PlantTaxon");
const RegionalAlert = require("../models/RegionalAlert");
const stableObjectIdFromAny = require("../helpers/stableObjectIdFromAny");

const router = express.Router();

function userId(req) {
  return String(req.userId || req.ctx?.userId || req.user?._id || req.headers["x-test-user-id"] || "");
}

function userObjectId(req) {
  const uid = userId(req);
  return uid ? stableObjectIdFromAny(uid) : null;
}

function maybeObjectId(id) {
  return mongoose.isValidObjectId(String(id || ""))
    ? new mongoose.Types.ObjectId(String(id))
    : null;
}

function dto(row) {
  if (!row) return null;
  const value = row?.toObject ? row.toObject() : row;
  return {
    ...value,
    id: String(value._id),
    _id: String(value._id),
    submittedBy: value.submittedBy ? String(value.submittedBy) : null,
    plantTaxon: value.plantTaxon ? String(value.plantTaxon) : value.plantTaxon,
    cropProfile: value.cropProfile ? String(value.cropProfile) : value.cropProfile,
    organismId: value.organismId ? String(value.organismId) : value.organismId,
    growId: value.growId ? String(value.growId) : value.growId,
    plantId: value.plantId ? String(value.plantId) : value.plantId,
    user: value.user ? String(value.user) : value.user
  };
}

function addListFilters(query, req, fields = []) {
  if (req.query.includeArchived !== "true") query.archivedAt = null;
  if (req.query.curationStatus) query.curationStatus = String(req.query.curationStatus);
  if (req.query.status) query.status = String(req.query.status);
  if (req.query.cropCategory) query.cropCategory = String(req.query.cropCategory);
  if (req.query.scientificName) {
    query.scientificName = new RegExp(String(req.query.scientificName), "i");
  }
  const q = String(req.query.q || req.query.search || "").trim();
  if (q && fields.length) {
    query.$or = fields.map((field) => ({ [field]: new RegExp(q, "i") }));
  }
  return query;
}

async function listRows(model, query, req, sort = { updatedAt: -1 }) {
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
  return (await model.find(query).sort(sort).limit(limit).lean()).map(dto);
}

function allowedPatch(body, fields) {
  const patch = {};
  for (const field of fields) {
    if (body?.[field] !== undefined) patch[field] = body[field];
  }
  return patch;
}

const taxonFields = [
  "scientificName",
  "commonNames",
  "family",
  "genus",
  "species",
  "synonyms",
  "gbifTaxonKey",
  "usdaSymbol",
  "powoId",
  "nativeRange",
  "introducedRange",
  "cropCategory",
  "curationStatus",
  "sourceRecords"
];

const cropProfileFields = [
  "cropKey",
  "displayName",
  "plantTaxon",
  "scientificName",
  "commonNames",
  "cropCategory",
  "growthHabit",
  "productionSystems",
  "stages",
  "environmentTargets",
  "nutritionTargets",
  "symptomPatterns",
  "ipmRiskNotes",
  "cultivarSensitivity",
  "recommendationCautions",
  "sourceRecords",
  "curationStatus"
];

const organismFields = [
  "scientificName",
  "commonNames",
  "organismType",
  "role",
  "cropHosts",
  "symptoms",
  "damagePattern",
  "lifeCycle",
  "indoorRisk",
  "outdoorRisk",
  "greenhouseRisk",
  "regionLimits",
  "ipmNextChecks",
  "nonChemicalManagement",
  "pesticideDosingAllowed",
  "curationStatus",
  "sourceRecords"
];

const alertFields = [
  "organismId",
  "region",
  "status",
  "reportable",
  "reportingAgency",
  "evidenceRequired",
  "curationStatus",
  "sourceRecords"
];

const growthFields = [
  "growId",
  "plantId",
  "cropProfileId",
  "confirmedScientificName",
  "cultivarName",
  "phenoLabel",
  "confirmationStatus",
  "sizeMetrics",
  "timingAdjustments",
  "waterUseProfile",
  "stressSensitivities",
  "pestDiseaseSensitivities",
  "notes",
  "sourceRecords"
];

function normalizeCropProfile(body) {
  const displayName = String(body?.displayName || "").trim();
  const cropKey = String(body?.cropKey || displayName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    ...allowedPatch(body, cropProfileFields),
    displayName,
    cropKey,
    curationStatus: body?.curationStatus || "needs_license_review"
  };
}

router.get("/taxa", async (req, res, next) => {
  try {
    const query = addListFilters({}, req, ["scientificName", "commonNames", "family", "genus"]);
    const items = await listRows(PlantTaxon, query, req, { scientificName: 1 });
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post("/taxa", async (req, res, next) => {
  try {
    const scientificName = String(req.body?.scientificName || "").trim();
    if (!scientificName) return res.status(400).json({ message: "scientificName is required" });
    const item = await PlantTaxon.create({
      ...allowedPatch(req.body, taxonFields),
      scientificName,
      submittedBy: userObjectId(req)
    });
    return res.status(201).json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.get("/taxa/:id", async (req, res, next) => {
  try {
    const item = await PlantTaxon.findOne({ _id: req.params.id, archivedAt: null }).lean();
    if (!item) return res.status(404).json({ message: "Taxon not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/taxa/:id", async (req, res, next) => {
  try {
    const item = await PlantTaxon.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      allowedPatch(req.body, taxonFields),
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Taxon not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/taxa/:id", async (req, res, next) => {
  try {
    const item = await PlantTaxon.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      { archivedAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Taxon not found" });
    return res.json({ archived: true, item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.get("/crop-profiles", async (req, res, next) => {
  try {
    const query = addListFilters({}, req, ["displayName", "scientificName", "commonNames", "cropCategory"]);
    const items = await listRows(CropProfile, query, req, { displayName: 1 });
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post("/crop-profiles/starter-seed", async (req, res, next) => {
  try {
    const starter = [
      ["cannabis", "Cannabis", "Cannabis sativa", "herb"],
      ["tomato", "Tomato", "Solanum lycopersicum", "vegetable"],
      ["pepper", "Pepper", "Capsicum annuum", "vegetable"],
      ["basil", "Basil", "Ocimum basilicum", "herb"]
    ];
    const items = [];
    for (const [cropKey, displayName, scientificName, cropCategory] of starter) {
      const item = await CropProfile.findOneAndUpdate(
        { cropKey },
        {
          $set: {
            cropKey,
            displayName,
            scientificName,
            cropCategory,
            curationStatus: "needs_license_review",
            submittedBy: userObjectId(req)
          },
          $setOnInsert: { sourceRecords: [] }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      items.push(dto(item));
    }
    return res.status(201).json({
      items,
      count: items.length,
      curationStatus: "needs_license_review",
      message: "Starter crop profiles seeded for review."
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/crop-profiles", async (req, res, next) => {
  try {
    const payload = normalizeCropProfile(req.body || {});
    if (!payload.displayName) return res.status(400).json({ message: "displayName is required" });
    const item = await CropProfile.create({ ...payload, submittedBy: userObjectId(req) });
    return res.status(201).json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.get("/crop-profiles/:id", async (req, res, next) => {
  try {
    const item = await CropProfile.findOne({ _id: req.params.id, archivedAt: null }).lean();
    if (!item) return res.status(404).json({ message: "Crop profile not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/crop-profiles/:id", async (req, res, next) => {
  try {
    const item = await CropProfile.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      normalizeCropProfile(req.body || {}),
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Crop profile not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/crop-profiles/:id", async (req, res, next) => {
  try {
    const item = await CropProfile.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      { archivedAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Crop profile not found" });
    return res.json({ archived: true, item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.get("/organisms", async (req, res, next) => {
  try {
    const query = addListFilters({}, req, ["scientificName", "commonNames", "organismType", "cropHosts", "symptoms"]);
    if (req.query.organismType) query.organismType = String(req.query.organismType);
    if (req.query.cropHost) query.cropHosts = String(req.query.cropHost);
    const items = await listRows(OrganismProfile, query, req, { scientificName: 1 });
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post("/organisms", async (req, res, next) => {
  try {
    const scientificName = String(req.body?.scientificName || "").trim();
    if (!scientificName) return res.status(400).json({ message: "scientificName is required" });
    const item = await OrganismProfile.create({
      ...allowedPatch(req.body, organismFields),
      scientificName,
      submittedBy: userObjectId(req)
    });
    return res.status(201).json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.get("/organisms/:id", async (req, res, next) => {
  try {
    const item = await OrganismProfile.findOne({ _id: req.params.id, archivedAt: null }).lean();
    if (!item) return res.status(404).json({ message: "Organism not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/organisms/:id", async (req, res, next) => {
  try {
    const item = await OrganismProfile.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      allowedPatch(req.body, organismFields),
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Organism not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/organisms/:id", async (req, res, next) => {
  try {
    const item = await OrganismProfile.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      { archivedAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Organism not found" });
    return res.json({ archived: true, item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.get("/regional-alerts", async (req, res, next) => {
  try {
    const query = addListFilters({}, req);
    if (req.query.organismId) {
      const id = maybeObjectId(req.query.organismId);
      if (id) query.organismId = id;
    }
    if (req.query.region) query.region = String(req.query.region);
    const items = await listRows(RegionalAlert, query, req, { updatedAt: -1 });
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post("/regional-alerts", async (req, res, next) => {
  try {
    const organismId = maybeObjectId(req.body?.organismId);
    const region = String(req.body?.region || "").trim();
    if (!organismId || !region) {
      return res.status(400).json({ message: "organismId and region are required" });
    }
    const item = await RegionalAlert.create({
      ...allowedPatch(req.body, alertFields),
      organismId,
      region,
      submittedBy: userObjectId(req)
    });
    return res.status(201).json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.get("/regional-alerts/:id", async (req, res, next) => {
  try {
    const item = await RegionalAlert.findOne({ _id: req.params.id, archivedAt: null }).lean();
    if (!item) return res.status(404).json({ message: "Regional alert not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/regional-alerts/:id", async (req, res, next) => {
  try {
    const patch = allowedPatch(req.body, alertFields);
    if (req.body?.organismId) patch.organismId = maybeObjectId(req.body.organismId);
    const item = await RegionalAlert.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      patch,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Regional alert not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/regional-alerts/:id", async (req, res, next) => {
  try {
    const item = await RegionalAlert.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null },
      { archivedAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Regional alert not found" });
    return res.json({ archived: true, item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.get("/plant-growth-profiles", async (req, res, next) => {
  try {
    const objectUser = userObjectId(req);
    if (!objectUser) return res.status(401).json({ message: "Not authenticated" });
    const query = { user: objectUser, archivedAt: null };
    if (req.query.growId) {
      const growId = maybeObjectId(req.query.growId);
      if (growId) query.growId = growId;
    }
    if (req.query.plantId) {
      const plantId = maybeObjectId(req.query.plantId);
      if (plantId) query.plantId = plantId;
    }
    const items = await listRows(PlantGrowthProfile, query, req);
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post("/plant-growth-profiles", async (req, res, next) => {
  try {
    const objectUser = userObjectId(req);
    if (!objectUser) return res.status(401).json({ message: "Not authenticated" });
    const patch = allowedPatch(req.body, growthFields);
    if (req.body?.cropProfileId) {
      patch.cropProfile = maybeObjectId(req.body.cropProfileId);
    }
    if (req.body?.growId) patch.growId = maybeObjectId(req.body.growId);
    if (req.body?.plantId) patch.plantId = maybeObjectId(req.body.plantId);
    const filter = patch.plantId
      ? { user: objectUser, plantId: patch.plantId }
      : { user: objectUser, _id: maybeObjectId(req.body?._id) || new mongoose.Types.ObjectId() };
    const item = await PlantGrowthProfile.findOneAndUpdate(
      filter,
      { ...patch, user: objectUser, archivedAt: null },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.status(201).json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.get("/plant-growth-profiles/:id", async (req, res, next) => {
  try {
    const objectUser = userObjectId(req);
    if (!objectUser) return res.status(401).json({ message: "Not authenticated" });
    const item = await PlantGrowthProfile.findOne({
      _id: req.params.id,
      user: objectUser,
      archivedAt: null
    }).lean();
    if (!item) return res.status(404).json({ message: "Plant growth profile not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/plant-growth-profiles/:id", async (req, res, next) => {
  try {
    const objectUser = userObjectId(req);
    if (!objectUser) return res.status(401).json({ message: "Not authenticated" });
    const patch = allowedPatch(req.body, growthFields);
    if (req.body?.cropProfileId) patch.cropProfile = maybeObjectId(req.body.cropProfileId);
    if (req.body?.growId) patch.growId = maybeObjectId(req.body.growId);
    if (req.body?.plantId) patch.plantId = maybeObjectId(req.body.plantId);
    const item = await PlantGrowthProfile.findOneAndUpdate(
      { _id: req.params.id, user: objectUser, archivedAt: null },
      patch,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Plant growth profile not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/plant-growth-profiles/:id", async (req, res, next) => {
  try {
    const objectUser = userObjectId(req);
    if (!objectUser) return res.status(401).json({ message: "Not authenticated" });
    const item = await PlantGrowthProfile.findOneAndUpdate(
      { _id: req.params.id, user: objectUser, archivedAt: null },
      { archivedAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Plant growth profile not found" });
    return res.json({ archived: true, item: dto(item) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
