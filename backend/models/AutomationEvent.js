"use strict";

const mongoose = require("mongoose");

const AutomationEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    userId: { type: String, required: true, index: true },
    growId: { type: String, default: null, index: true },
    plantId: { type: String, default: null, index: true },
    facilityId: { type: String, default: null, index: true },
    source: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    processed: { type: Boolean, default: false, index: true },
    matchedPolicyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "AutomationPolicy" }],
    errors: { type: [String], default: [] }
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

AutomationEventSchema.index({ userId: 1, source: 1, eventType: 1, createdAt: -1 });

module.exports = mongoose.model("AutomationEvent", AutomationEventSchema);
