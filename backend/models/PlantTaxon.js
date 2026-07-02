"use strict";

const mongoose = require("mongoose");
const SourceRecordSchema = require("./schemas/sourceRecord");

const PlantTaxonSchema = new mongoose.Schema(
  {
    scientificName: { type: String, required: true, trim: true, index: true },
    commonNames: { type: [String], default: [], index: true },
    family: { type: String, default: "", index: true },
    genus: { type: String, default: "", index: true },
    species: { type: String, default: "", index: true },
    synonyms: { type: [String], default: [] },
    gbifTaxonKey: { type: String, default: "" },
    usdaSymbol: { type: String, default: "" },
    powoId: { type: String, default: "" },
    nativeRange: { type: [String], default: [] },
    introducedRange: { type: [String], default: [] },
    cropCategory: { type: String, default: "unknown", index: true },
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

PlantTaxonSchema.index({
  scientificName: "text",
  commonNames: "text",
  family: "text",
  genus: "text",
  cropCategory: "text"
});

module.exports = mongoose.model("PlantTaxon", PlantTaxonSchema);
