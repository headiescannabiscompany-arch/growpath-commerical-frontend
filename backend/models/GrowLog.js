"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

const GrowLogSchema = new mongoose.Schema(
  {
    facilityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    // Optional: contract does NOT require plantId
    plantId: { type: String, default: null, index: true },

    // Optional fields
    growId: { type: String, default: null, index: true },
    plantTag: { type: String, default: null, index: true },

    // Needed for legacy/behavior filter tests (?type=WATER)
    type: { type: String, default: null, index: true },

    // Optional numeric metric referenced by acceptance/service paths
    heightCm: { type: Number, default: null },

    title: { type: String, default: "" },
    note: { type: String, default: "" },

    // Legacy compat (some older code/tests may still look for `notes`)
    notes: { type: String, default: "" },

    tags: {
      type: [String],
      default: [],
      set: (arr) =>
        Array.isArray(arr)
          ? arr
              .filter((v) => typeof v === "string")
              .map((v) => v.trim())
              .filter(Boolean)
          : []
    },
    rejectedTags: {
      type: [String],
      default: [],
      set: (arr) =>
        Array.isArray(arr)
          ? arr
              .filter((v) => typeof v === "string")
              .map((v) => v.trim())
              .filter(Boolean)
          : []
    },

    date: { type: Date, default: Date.now, index: true },

    // Explicit Mixed avoids casting surprises for arbitrary JSON
    metrics: { type: Schema.Types.Mixed, default: undefined },

    photos: [{ type: String }],
    photoMetadata: { type: [Schema.Types.Mixed], default: [] },

    aiInsights: { type: [Schema.Types.Mixed], default: [] },
    linkedToolRunId: { type: String, default: null, index: true },
    linkedDiagnosisId: { type: String, default: null, index: true },
    linkedTaskIds: { type: [String], default: [] },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

// Helpful indexes for common contract queries
GrowLogSchema.index({ facilityId: 1, deletedAt: 1, date: -1 });
GrowLogSchema.index({ facilityId: 1, deletedAt: 1, createdAt: -1 });
GrowLogSchema.index({ facilityId: 1, userId: 1, deletedAt: 1, createdAt: -1 });

// Indexes that support behavior filters efficiently
GrowLogSchema.index({ facilityId: 1, growId: 1, deletedAt: 1, date: -1 });
GrowLogSchema.index({ facilityId: 1, type: 1, deletedAt: 1, date: -1 });
GrowLogSchema.index({ facilityId: 1, tags: 1, deletedAt: 1, date: -1 });
GrowLogSchema.index({ userId: 1, growId: 1, deletedAt: 1, date: -1 });

module.exports = mongoose.model("GrowLog", GrowLogSchema);
