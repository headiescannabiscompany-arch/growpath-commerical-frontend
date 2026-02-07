"use strict";

const mongoose = require("mongoose");

const WindowSchema = new mongoose.Schema(
  {
    min: { type: Date, required: true },
    ideal: { type: Date, required: true },
    max: { type: Date, required: true }
  },
  { _id: false }
);

const HarvestDecisionSchema = new mongoose.Schema(
  {
    facilityId: { type: String, required: true, index: true },
    growId: { type: String, required: true, index: true },

    window: { type: WindowSchema, required: true },

    recommendation: { type: String, required: true }, // e.g. WAIT_3_5_DAYS
    partialHarvest: { type: Boolean, default: false },

    confidence: { type: Number, required: true, min: 0, max: 1 },

    // Optional linkage back to analysis (audit)
    trichomeAnalysisId: { type: String, default: null, index: true },

    deletedAt: { type: Date, default: null, index: true }
  },
  {
    timestamps: true,
    minimize: false
  }
);

HarvestDecisionSchema.index({ facilityId: 1, growId: 1, deletedAt: 1, createdAt: -1 });

module.exports =
  mongoose.models.HarvestDecision ||
  mongoose.model("HarvestDecision", HarvestDecisionSchema);
