"use strict";

const mongoose = require("mongoose");

const IntegrationConnectionSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true },
    provider: {
      type: String,
      required: true,
      enum: ["growlink", "ubibot", "pulse"],
      index: true
    },
    label: { type: String, required: true },
    config: { type: Object, default: {} },
    credentialsEncrypted: { type: Object, default: {} },
    status: {
      type: String,
      enum: ["draft", "configured", "connected", "error", "access_requested"],
      default: "configured",
      index: true
    },
    lastTestAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

IntegrationConnectionSchema.index({ ownerUserId: 1, provider: 1, deletedAt: 1 });

module.exports = mongoose.model("IntegrationConnection", IntegrationConnectionSchema);
