"use strict";

const mongoose = require("mongoose");

const WebhookEndpointSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    facilityId: { type: String, default: null, index: true },
    url: { type: String, required: true, trim: true },
    events: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
    signingSecretEncrypted: { type: String, default: "" },
    signingSecretPreview: { type: String, default: "" },
    secretRotatedAt: { type: Date, default: null },
    failureCount: { type: Number, default: 0 },
    lastDeliveryAt: { type: Date, default: null },
    lastError: { type: String, default: "" }
  },
  { timestamps: true }
);

WebhookEndpointSchema.index({ userId: 1, facilityId: 1, createdAt: -1 });

module.exports = mongoose.model("WebhookEndpoint", WebhookEndpointSchema);
