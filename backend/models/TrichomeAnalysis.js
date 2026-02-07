"use strict";

const mongoose = require("mongoose");

const DistributionSchema = new mongoose.Schema(
  {
    clear: { type: Number, required: true, min: 0, max: 1 },
    cloudy: { type: Number, required: true, min: 0, max: 1 },
    amber: { type: Number, required: true, min: 0, max: 1 }
  },
  { _id: false }
);

const TrichomeAnalysisSchema = new mongoose.Schema(
  {
    facilityId: { type: String, required: true, index: true },
    growId: { type: String, required: true, index: true },

    images: { type: [String], default: [] },
    zones: { type: [String], default: [] }, // keep permissive; schema pack enforces allowed enums

    distribution: { type: DistributionSchema, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },

    notes: { type: String, default: "" },

    deletedAt: { type: Date, default: null, index: true }
  },
  {
    timestamps: true,
    minimize: false
  }
);

TrichomeAnalysisSchema.index({ facilityId: 1, growId: 1, deletedAt: 1, createdAt: -1 });

module.exports =
  mongoose.models.TrichomeAnalysis ||
  mongoose.model("TrichomeAnalysis", TrichomeAnalysisSchema);
