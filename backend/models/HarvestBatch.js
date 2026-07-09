"use strict";

const mongoose = require("mongoose");

const DryCureRecordSchema = new mongoose.Schema(
  {
    recordedAt: { type: Date, default: Date.now },
    stage: {
      type: String,
      enum: ["harvested", "drying", "trim", "curing", "stored", "quality_review"],
      default: "drying"
    },
    tempF: { type: Number, default: null },
    rh: { type: Number, default: null },
    jarRh: { type: Number, default: null },
    dewPointF: { type: Number, default: null },
    waterActivity: { type: Number, default: null },
    weight: { type: Number, default: null },
    weightUnit: { type: String, default: "g" },
    aromaNotes: { type: String, default: "" },
    textureNotes: { type: String, default: "" },
    qualityNotes: { type: String, default: "" },
    linkedToolRunId: { type: String, default: null }
  },
  { _id: false }
);

const HarvestBatchSchema = new mongoose.Schema(
  {
    facilityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    growId: { type: String, required: true, index: true },
    plantIds: { type: [String], default: [] },
    batchCode: { type: String, default: "", index: true },
    name: { type: String, required: true },
    harvestedAt: { type: Date, default: Date.now },
    wetWeight: { type: Number, default: null },
    dryWeight: { type: Number, default: null },
    weightUnit: { type: String, default: "g" },
    dryStartedAt: { type: Date, default: null },
    dryEndedAt: { type: Date, default: null },
    cureStartedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["harvested", "drying", "curing", "stored", "archived"],
      default: "harvested",
      index: true
    },
    dryCureRecords: { type: [DryCureRecordSchema], default: [] },
    qualityNotes: { type: String, default: "" },
    linkedToolRunIds: { type: [String], default: [] },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

HarvestBatchSchema.index({ userId: 1, growId: 1, deletedAt: 1, harvestedAt: -1 });
HarvestBatchSchema.index({ facilityId: 1, status: 1, deletedAt: 1 });

module.exports =
  mongoose.models.HarvestBatch || mongoose.model("HarvestBatch", HarvestBatchSchema);
