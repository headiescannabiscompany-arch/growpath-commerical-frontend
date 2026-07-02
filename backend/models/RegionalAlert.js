"use strict";

const mongoose = require("mongoose");
const SourceRecordSchema = require("./schemas/sourceRecord");

const RegionalAlertSchema = new mongoose.Schema(
  {
    organismId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganismProfile",
      required: true,
      index: true
    },
    region: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ["invasive", "regulated", "watchlist", "native", "unknown"],
      default: "unknown",
      index: true
    },
    reportable: { type: Boolean, default: false },
    reportingAgency: { type: String, default: "" },
    evidenceRequired: { type: [String], default: [] },
    curationStatus: {
      type: String,
      enum: ["draft", "needs_license_review", "reviewed", "rejected"],
      default: "draft",
      index: true
    },
    sourceRecords: { type: [SourceRecordSchema], default: [] },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    archivedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

RegionalAlertSchema.index({ organismId: 1, region: 1 }, { unique: true });

module.exports = mongoose.model("RegionalAlert", RegionalAlertSchema);
