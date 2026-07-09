"use strict";

const mongoose = require("mongoose");
const SourceRecordSchema = require("./schemas/sourceRecord");

const PlantGrowthProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    growId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grow",
      default: null,
      index: true
    },
    plantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plant",
      default: null,
      index: true
    },
    cropProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropProfile",
      default: null,
      index: true
    },
    confirmedScientificName: { type: String, default: "" },
    cultivarName: { type: String, default: "" },
    phenoLabel: { type: String, default: "" },
    keeperStatus: {
      type: String,
      enum: [
        "unknown",
        "keeper",
        "watch",
        "reject",
        "retest",
        "mother_candidate",
        "breeding_candidate"
      ],
      default: "unknown",
      index: true
    },
    keeperReason: { type: String, default: "" },
    cloneStatus: {
      type: String,
      enum: ["unknown", "not_taken", "cut_taken", "rooted", "failed", "mother_stock"],
      default: "unknown"
    },
    motherStatus: {
      type: String,
      enum: ["none", "candidate", "active", "retired", "rejected"],
      default: "none"
    },
    confirmationStatus: {
      type: String,
      enum: ["user_confirmed", "ai_suggested", "needs_confirmation", "unknown"],
      default: "unknown",
      index: true
    },
    phenoScores: { type: [mongoose.Schema.Types.Mixed], default: [] },
    stageScorecards: { type: [mongoose.Schema.Types.Mixed], default: [] },
    sizeMetrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    timingAdjustments: { type: mongoose.Schema.Types.Mixed, default: {} },
    waterUseProfile: { type: mongoose.Schema.Types.Mixed, default: {} },
    stressSensitivities: { type: [String], default: [] },
    pestDiseaseSensitivities: { type: [String], default: [] },
    notes: { type: String, default: "" },
    sourceRecords: { type: [SourceRecordSchema], default: [] },
    archivedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

PlantGrowthProfileSchema.index(
  { user: 1, plantId: 1 },
  {
    unique: true,
    partialFilterExpression: { plantId: { $type: "objectId" } }
  }
);
PlantGrowthProfileSchema.index({ user: 1, growId: 1 });

module.exports = mongoose.model("PlantGrowthProfile", PlantGrowthProfileSchema);
