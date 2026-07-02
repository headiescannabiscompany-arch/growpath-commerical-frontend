"use strict";

const mongoose = require("mongoose");

const ToolRunSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    growId: { type: String, required: true, index: true },
    plantId: { type: String, default: null, index: true },
    cropProfileId: { type: String, default: null },
    cropIdentity: { type: mongoose.Schema.Types.Mixed, default: null },
    selectedPlantContext: { type: mongoose.Schema.Types.Mixed, default: null },
    plantGrowthProfile: { type: mongoose.Schema.Types.Mixed, default: null },

    toolName: { type: String, required: true, index: true },
    toolType: { type: String, required: true, index: true },
    schemaVersion: { type: Number, default: 1 },
    calculatorVersion: { type: String, default: "1" },
    status: { type: String, default: "completed", index: true },

    inputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    outputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    warnings: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    formulas: { type: [String], default: [] },
    confidence: { type: mongoose.Schema.Types.Mixed, default: null },
    uncertainty: { type: mongoose.Schema.Types.Mixed, default: null },

    sourceType: { type: String, default: "manual_tool_run", index: true },
    sourceObjectId: { type: String, default: null },
    linkedLogId: { type: String, default: null },
    linkedTaskIds: { type: [String], default: [] },
    linkedRecipeId: { type: String, default: null },
    linkedDiagnosisId: { type: String, default: null },
    linkedTimelineEventId: { type: String, default: null },
    immutableSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true, minimize: false }
);

ToolRunSchema.index({ userId: 1, growId: 1, createdAt: -1 });
ToolRunSchema.index({ userId: 1, toolType: 1, createdAt: -1 });

module.exports = mongoose.models.ToolRun || mongoose.model("ToolRun", ToolRunSchema);

