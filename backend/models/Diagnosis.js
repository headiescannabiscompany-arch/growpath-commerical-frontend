const mongoose = require("mongoose");

const DiagnosisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    photos: [String],          // image URLs
    notes: String,             // user description
    stage: String,             // optional: seedling / veg / flower
    strain: String,            // optional

    issueSummary: String,      // short label, e.g. "Nitrogen deficiency"
    severity: { type: Number, min: 1, max: 5 },  // 1 = mild, 5 = severe

    tags: [String],            // ["yellowing", "stretch", "overwatered"]

    aiExplanation: String,     // detailed explanation
    aiActions: [String],       // list of treatment steps

    fromGrowLogId: { type: String },  // optional linkage
  },
  { timestamps: true }
);

module.exports = mongoose.model("Diagnosis", DiagnosisSchema);
