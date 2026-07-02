"use strict";

const mongoose = require("mongoose");

const SourceRecordSchema = new mongoose.Schema(
  {
    sourceName: { type: String, required: true, trim: true },
    sourceType: {
      type: String,
      enum: [
        "extension",
        "federal",
        "academic",
        "api",
        "manufacturer_label",
        "manufacturer",
        "user_entered",
        "growpath_verified",
        "ai_assisted",
        "other"
      ],
      default: "user_entered"
    },
    url: { type: String, default: "" },
    citation: { type: String, default: "" },
    license: { type: String, default: "" },
    licenseReviewedAt: { type: Date, default: null },
    commercialUseAllowed: { type: Boolean, default: false },
    trainingUseAllowed: { type: Boolean, default: false },
    accessedAt: { type: Date, default: null },
    lastReviewedAt: { type: Date, default: null },
    region: { type: String, default: "" },
    cropScope: { type: String, default: "" },
    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low"
    },
    notes: { type: String, default: "" }
  },
  { _id: false }
);

module.exports = SourceRecordSchema;
