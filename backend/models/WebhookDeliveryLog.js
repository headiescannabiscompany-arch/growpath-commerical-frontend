"use strict";

const mongoose = require("mongoose");

const WebhookDeliveryLogSchema = new mongoose.Schema(
  {
    webhookId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "WebhookEndpoint"
    },
    userId: { type: String, required: true, index: true },
    facilityId: { type: String, default: null, index: true },
    event: { type: String, required: true, index: true },
    status: { type: String, enum: ["success", "failed", "skipped"], required: true },
    attemptCount: { type: Number, default: 0 },
    httpStatus: { type: Number, default: null },
    error: { type: String, default: "" },
    requestId: { type: String, default: "" },
    deliveredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

WebhookDeliveryLogSchema.index({ webhookId: 1, createdAt: -1 });
WebhookDeliveryLogSchema.index({ userId: 1, facilityId: 1, createdAt: -1 });

module.exports = mongoose.model("WebhookDeliveryLog", WebhookDeliveryLogSchema);
