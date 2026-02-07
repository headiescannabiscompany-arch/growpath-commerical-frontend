"use strict";

const mongoose = require("mongoose");

const GrowNoteSchema = new mongoose.Schema(
  {
    facilityId: { type: String, required: true, index: true },
    growId: { type: String, required: true, index: true },

    body: { type: String, required: true },
    tags: { type: [String], default: [] },

    // Soft delete
    deletedAt: { type: Date, default: null, index: true }
  },
  {
    timestamps: true, // createdAt/updatedAt as Date
    minimize: false
  }
);

GrowNoteSchema.index({ facilityId: 1, growId: 1, deletedAt: 1, createdAt: -1 });

module.exports = mongoose.models.GrowNote || mongoose.model("GrowNote", GrowNoteSchema);
