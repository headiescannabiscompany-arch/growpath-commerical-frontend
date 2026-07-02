const mongoose = require("mongoose");

const DiagnosisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    growId: { type: String, default: null, index: true },
    plantId: { type: String, default: null, index: true },

    photos: [String], // image URLs
    notes: String, // user description
    stage: String, // optional: seedling / veg / flower
    strain: String, // optional
    breeder: String,
    cropCommonName: { type: String, default: "" },
    scientificName: { type: String, default: "" },
    cultivarOrStrain: { type: String, default: "" },
    cropIdentity: { type: mongoose.Schema.Types.Mixed, default: {} },
    cropProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropProfile",
      default: null,
      index: true
    },
    cropProfileSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    selectedPlantContext: { type: mongoose.Schema.Types.Mixed, default: null },
    plantGrowthProfile: { type: mongoose.Schema.Types.Mixed, default: null },

    issueSummary: String, // short label, e.g. "Nitrogen deficiency"
    severity: { type: Number, min: 1, max: 5 }, // 1 = mild, 5 = severe

    tags: [String], // ["yellowing", "stretch", "overwatered"]

    aiExplanation: String, // detailed explanation
    aiActions: [String], // list of treatment steps
    aiResult: { type: mongoose.Schema.Types.Mixed, default: {} },
    providerResult: { type: mongoose.Schema.Types.Mixed, default: null },
    providerName: { type: String, default: "" },
    providerModel: { type: String, default: "" },
    growPathReasoning: { type: [String], default: [] },
    improvementNotice: { type: String, default: "" },
    feedbackCount: { type: Number, default: 0 },
    feedbackSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    diagnosisClass: { type: String, default: "" },
    patternSummary: { type: String, default: "" },
    rootZoneSummary: { type: String, default: "" },
    environmentSummary: { type: String, default: "" },
    numberSummary: { type: String, default: "" },
    urgency: { type: String, default: "" },

    fromGrowLogId: { type: String }, // optional linkage
    linkedLogId: { type: String, default: null },
    linkedTaskIds: { type: [String], default: [] },
    environment: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

module.exports = mongoose.model("Diagnosis", DiagnosisSchema);
