"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

const GrowpathModuleRecordSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    recordType: { type: String, required: true, index: true },
    title: { type: String, required: true },
    status: { type: String, default: "active", index: true },

    growId: { type: String, default: null, index: true },
    plantId: { type: String, default: null, index: true },
    phenoPlantId: { type: String, default: null, index: true },
    geneticsId: { type: String, default: null, index: true },
    facilityId: { type: String, default: null, index: true },
    harvestBatchId: { type: String, default: null, index: true },
    cloneBatchId: { type: String, default: null, index: true },
    cropProfileId: { type: String, default: null, index: true },

    cropIdentity: { type: Schema.Types.Mixed, default: null },
    selectedPlantContext: { type: Schema.Types.Mixed, default: null },
    inputs: { type: Schema.Types.Mixed, default: {} },
    outputs: { type: Schema.Types.Mixed, default: {} },
    payload: { type: Schema.Types.Mixed, default: {} },
    localRuleResult: { type: Schema.Types.Mixed, default: null },
    aiVerificationResult: { type: Schema.Types.Mixed, default: null },
    agreementStatus: { type: String, default: "not_run" },
    userDecision: { type: String, default: "not_decided" },
    outcome: { type: Schema.Types.Mixed, default: null },

    warnings: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    limitations: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    tasksToCreate: { type: [Schema.Types.Mixed], default: [] },
    linkedTaskIds: { type: [String], default: [] },
    linkedLogId: { type: String, default: null },
    linkedTimelineEventId: { type: String, default: null },
    linkedToolRunId: { type: String, default: null, index: true },
    linkedRecipeId: { type: String, default: null, index: true },

    sourceRecords: { type: [Schema.Types.Mixed], default: [] },
    sourceConfidence: { type: String, default: null },
    confidence: { type: String, default: null },
    schemaVersion: { type: Number, default: 1 },
    moduleVersion: { type: String, default: "2026.07" },
    immutableSnapshot: { type: Schema.Types.Mixed, default: null },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

GrowpathModuleRecordSchema.index({ userId: 1, recordType: 1, createdAt: -1 });
GrowpathModuleRecordSchema.index({ userId: 1, growId: 1, createdAt: -1 });
GrowpathModuleRecordSchema.index({ userId: 1, plantId: 1, createdAt: -1 });
GrowpathModuleRecordSchema.index({ userId: 1, linkedToolRunId: 1 });

GrowpathModuleRecordSchema.pre("validate", function normalize(next) {
  this.title = String(this.title || this.recordType || "GrowPath module record").trim();
  this.status = String(this.status || "active");
  this.schemaVersion = Number.isFinite(Number(this.schemaVersion))
    ? Number(this.schemaVersion)
    : 1;
  this.moduleVersion = String(this.moduleVersion || "2026.07");
  if (!this.immutableSnapshot) {
    this.immutableSnapshot = {
      recordType: this.recordType,
      title: this.title,
      growId: this.growId || null,
      plantId: this.plantId || null,
      linkedToolRunId: this.linkedToolRunId || null,
      schemaVersion: this.schemaVersion,
      moduleVersion: this.moduleVersion,
      inputs: this.inputs || {},
      outputs: this.outputs || {},
      warnings: this.warnings || [],
      recommendations: this.recommendations || []
    };
  }
  next();
});

module.exports = mongoose.model("GrowpathModuleRecord", GrowpathModuleRecordSchema);
