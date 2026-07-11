"use strict";

const mongoose = require("mongoose");

const IntegrationAccessRequestSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true },
    provider: {
      type: String,
      required: true,
      enum: ["growlink", "ubibot", "pulse"],
      index: true
    },
    organization: { type: String, default: "GrowPath" },
    status: {
      type: String,
      enum: ["requested", "reviewing", "approved", "denied"],
      default: "requested",
      index: true
    }
  },
  { timestamps: true }
);

IntegrationAccessRequestSchema.index({ ownerUserId: 1, provider: 1 });

module.exports = mongoose.model(
  "IntegrationAccessRequest",
  IntegrationAccessRequestSchema
);
