"use strict";

const mongoose = require("mongoose");

const TelemetrySourceSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true },
    growId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["pulse", "growlink", "upload", "manual"],
      index: true
    },
    name: { type: String, required: true },
    timezone: { type: String, required: true, default: "America/New_York" },
    isActive: { type: Boolean, default: true },
    config: { type: Object, default: {} },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

TelemetrySourceSchema.index({ growId: 1, deletedAt: 1 });

module.exports = mongoose.model("TelemetrySource", TelemetrySourceSchema);
