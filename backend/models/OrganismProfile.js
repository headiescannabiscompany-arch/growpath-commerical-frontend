"use strict";

const mongoose = require("mongoose");
const SourceRecordSchema = require("./schemas/sourceRecord");

const OrganismProfileSchema = new mongoose.Schema(
  {
    scientificName: { type: String, required: true, trim: true, index: true },
    commonNames: { type: [String], default: [], index: true },
    organismType: { type: String, default: "unknown", index: true },
    role: { type: String, default: "unknown", index: true },
    cropHosts: { type: [String], default: [], index: true },
    symptoms: { type: [String], default: [] },
    damagePattern: { type: String, default: "" },
    lifeCycle: { type: String, default: "" },
    indoorRisk: { type: String, default: "unknown" },
    outdoorRisk: { type: String, default: "unknown" },
    greenhouseRisk: { type: String, default: "unknown" },
    regionLimits: { type: [String], default: [] },
    ipmNextChecks: { type: [String], default: [] },
    nonChemicalManagement: { type: [String], default: [] },
    pesticideDosingAllowed: { type: Boolean, default: false },
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

OrganismProfileSchema.index({
  scientificName: "text",
  commonNames: "text",
  organismType: "text",
  cropHosts: "text",
  symptoms: "text",
  damagePattern: "text"
});

module.exports = mongoose.model("OrganismProfile", OrganismProfileSchema);
