"use strict";

const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    facilityId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["OPEN", "IN_PROGRESS", "DONE"], default: "OPEN" },
    createdByUserId: { type: String, required: true, index: true },
    assignedToUserId: { type: String, default: null, index: true },
    growId: { type: String, default: null, index: true },
    plantId: { type: String, default: null, index: true },
    dueAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    allDay: { type: Boolean, default: false },
    snoozeUntil: { type: Date, default: null, index: true },
    reminderPlan: { type: mongoose.Schema.Types.Mixed, default: null },
    recurrence: { type: mongoose.Schema.Types.Mixed, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    calendarType: { type: String, default: null, index: true },
    sourceStage: { type: String, default: null },
    sourceType: { type: String, default: null, index: true },
    sourceObjectId: { type: String, default: null, index: true },
    sourceToolRunId: { type: String, default: null },
    sourceDiagnosisId: { type: String, default: null },
    linkedLogId: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

TaskSchema.index({ facilityId: 1, deletedAt: 1, createdAt: -1 });
TaskSchema.index({ facilityId: 1, deletedAt: 1 });
TaskSchema.index({ facilityId: 1, status: 1 });
TaskSchema.index({ createdByUserId: 1, growId: 1, deletedAt: 1, dueAt: 1 });

// Legacy test compatibility: default createdByUserId if missing
TaskSchema.pre("validate", function (next) {
  if (!this.createdByUserId) {
    this.createdByUserId = this.assignedToUserId || this.userId || null;
  }
  next();
});

module.exports = mongoose.model("Task", TaskSchema);
