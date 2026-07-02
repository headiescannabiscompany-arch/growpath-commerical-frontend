"use strict";

const mongoose = require("mongoose");

const ConditionSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: [
        "equals",
        "not_equals",
        "greater_than",
        "greater_than_or_equal",
        "less_than",
        "less_than_or_equal",
        "includes",
        "exists"
      ],
      required: true
    },
    value: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { _id: false }
);

const ActionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "create_task",
        "create_notification",
        "create_grow_log",
        "add_tag",
        "flag_pheno",
        "update_pheno_score",
        "request_ai_summary",
        "send_email",
        "webhook"
      ],
      required: true
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const AutomationPolicySchema = new mongoose.Schema(
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

    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scope: {
      type: String,
      enum: ["user", "grow", "plant", "facility"],
      default: "grow",
      index: true
    },
    enabled: { type: Boolean, default: true, index: true },

    trigger: {
      source: {
        type: String,
        enum: [
          "tool_run",
          "ai_diagnosis",
          "grow_log",
          "task",
          "telemetry",
          "pheno_score",
          "stress_test",
          "crop_steering",
          "calendar",
          "manual"
        ],
        required: true,
        index: true
      },
      eventType: { type: String, required: true, index: true }
    },

    conditions: { type: [ConditionSchema], default: [] },
    actions: { type: [ActionSchema], default: [] },

    cooldownMinutes: { type: Number, default: 60 },
    lastTriggeredAt: { type: Date, default: null },
    maxTriggersPerDay: { type: Number, default: 10 },
    triggerCountToday: { type: Number, default: 0 },
    triggerCountDate: { type: String, default: "" },
    triggerCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

AutomationPolicySchema.index({
  userId: 1,
  facilityId: 1,
  growId: 1,
  plantId: 1,
  "trigger.source": 1,
  "trigger.eventType": 1
});

module.exports = mongoose.model("AutomationPolicy", AutomationPolicySchema);
