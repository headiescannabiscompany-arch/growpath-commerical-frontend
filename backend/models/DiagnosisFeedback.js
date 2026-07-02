const mongoose = require("mongoose");

const DiagnosisFeedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    diagnosis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnosis",
      required: true,
      index: true
    },
    growId: { type: String, default: null, index: true },
    plantId: { type: String, default: null, index: true },

    issueSummary: { type: String, default: "" },
    diagnosisClass: { type: String, default: "" },
    providerName: { type: String, default: "" },
    providerModel: { type: String, default: "" },

    verdict: {
      type: String,
      enum: ["helpful", "not_accurate", "unsure", "confirmed", "ruled_out"],
      required: true
    },
    confirmedIssue: { type: String, default: "" },
    symptomChange: {
      type: String,
      enum: ["improved", "same", "worse", "unknown"],
      default: "unknown"
    },
    notes: { type: String, default: "" },
    actionsTaken: { type: [String], default: [] },
    observedAfterDays: { type: Number, default: null },
    outcomeWindowDays: { type: Number, default: null },
    consentForModelTraining: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

DiagnosisFeedbackSchema.index({ user: 1, diagnosis: 1, createdAt: -1 });

module.exports = mongoose.model("DiagnosisFeedback", DiagnosisFeedbackSchema);
