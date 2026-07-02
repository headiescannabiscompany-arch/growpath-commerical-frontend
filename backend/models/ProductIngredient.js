"use strict";

const mongoose = require("mongoose");

const NutrientFormSchema = new mongoose.Schema(
  {
    nutrient: { type: String, required: true },
    form: { type: String, required: true },
    chemicalName: { type: String, default: "" },
    availabilityClass: {
      type: String,
      enum: ["immediate", "fast", "medium", "slow", "very_slow", "unknown"],
      default: "unknown"
    },
    estimatedReleaseDays: {
      min: { type: Number, default: null },
      max: { type: Number, default: null }
    },
    releaseMechanism: { type: String, default: "unknown" },
    pHEffect: { type: String, default: "depends" },
    ecImpact: { type: String, default: "unknown" },
    mobility: { type: String, default: "unknown" },
    solubility: { type: String, default: "unknown" },
    notes: { type: String, default: "" }
  },
  { _id: false }
);

const ProductIngredientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: "" },
    category: { type: String, default: "nutrient" },
    chemistryKey: { type: String, default: "custom", index: true },
    labelNPK: {
      N: { type: Number, default: 0 },
      P: { type: Number, default: 0 },
      K: { type: Number, default: 0 }
    },
    elemental: { type: mongoose.Schema.Types.Mixed, default: {} },
    nutrientForms: { type: [NutrientFormSchema], default: [] },
    conditions: { type: mongoose.Schema.Types.Mixed, default: {} },
    bestUseCases: { type: [String], default: [] },
    badUseCases: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    densityGml: { type: Number, default: null },
    organicOrSynthetic: { type: String, default: "unknown" },
    sourceType: {
      type: String,
      enum: ["user_entered", "manufacturer", "extension_reference", "lab_tested", "curated_default"],
      default: "user_entered"
    },
    confidence: { type: String, enum: ["low", "medium", "high"], default: "low" },
    sourceUrl: { type: String, default: "" },
    favorite: { type: Boolean, default: false }
  },
  { timestamps: true }
);

ProductIngredientSchema.index({ user: 1, name: 1, brand: 1 });

module.exports = mongoose.model("ProductIngredient", ProductIngredientSchema);
