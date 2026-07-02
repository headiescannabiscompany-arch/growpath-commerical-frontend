"use strict";

const mongoose = require("mongoose");
const SourceRecordSchema = require("./schemas/sourceRecord");

const EnvironmentTargetSchema = new mongoose.Schema(
  {
    stage: { type: String, default: "general", index: true },
    system: { type: String, default: "unspecified", index: true },
    parameter: { type: String, required: true },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    unit: { type: String, default: "" },
    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low"
    },
    sourceRecords: { type: [SourceRecordSchema], default: [] }
  },
  { _id: false }
);

const CropProfileSchema = new mongoose.Schema(
  {
    cropKey: { type: String, required: true, trim: true, lowercase: true, index: true },
    displayName: { type: String, required: true, trim: true, index: true },
    plantTaxon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlantTaxon",
      default: null,
      index: true
    },
    scientificName: { type: String, default: "", index: true },
    commonNames: { type: [String], default: [], index: true },
    cropCategory: { type: String, default: "unknown", index: true },
    growthHabit: { type: String, default: "" },
    productionSystems: { type: [String], default: [] },
    stages: { type: [String], default: [] },
    environmentTargets: { type: [EnvironmentTargetSchema], default: [] },
    nutritionTargets: { type: [EnvironmentTargetSchema], default: [] },
    symptomPatterns: { type: [mongoose.Schema.Types.Mixed], default: [] },
    ipmRiskNotes: { type: [String], default: [] },
    cultivarSensitivity: { type: [mongoose.Schema.Types.Mixed], default: [] },
    recommendationCautions: { type: [String], default: [] },
    sourceRecords: { type: [SourceRecordSchema], default: [] },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    curationStatus: {
      type: String,
      enum: ["draft", "needs_license_review", "reviewed", "rejected"],
      default: "draft",
      index: true
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

CropProfileSchema.index({
  cropKey: "text",
  displayName: "text",
  scientificName: "text",
  commonNames: "text",
  cropCategory: "text"
});
CropProfileSchema.index({ cropKey: 1 }, { unique: true });

module.exports = mongoose.model("CropProfile", CropProfileSchema);
