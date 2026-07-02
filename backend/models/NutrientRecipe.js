"use strict";

const mongoose = require("mongoose");

const NutrientRecipeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    growId: { type: String, default: null, index: true },
    recipeType: { type: String, default: "nutrient_solution", index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    version: { type: Number, default: 1 },
    parentRecipeId: { type: String, default: null },

    stage: { type: String, default: "" },
    medium: { type: String, default: "" },
    batchVolume: { type: Number, default: 0 },
    batchUnit: { type: String, default: "gal" },
    products: { type: [mongoose.Schema.Types.Mixed], default: [] },
    ingredients: { type: [mongoose.Schema.Types.Mixed], default: [] },
    waterBaseline: { type: mongoose.Schema.Types.Mixed, default: {} },
    releaseEnvironment: { type: mongoose.Schema.Types.Mixed, default: {} },
    measuredEC: { type: Number, default: null },
    measuredPH: { type: Number, default: null },

    calculatedTotals: { type: mongoose.Schema.Types.Mixed, default: {} },
    calculation: { type: mongoose.Schema.Types.Mixed, default: {} },
    releaseTimeline: { type: mongoose.Schema.Types.Mixed, default: {} },
    warnings: { type: [String], default: [] },
    sourceConfidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: "" },

    useCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true, minimize: false }
);

NutrientRecipeSchema.index({ userId: 1, growId: 1, recipeType: 1, createdAt: -1 });
NutrientRecipeSchema.index({ userId: 1, name: 1, deletedAt: 1 });

module.exports =
  mongoose.models.NutrientRecipe ||
  mongoose.model("NutrientRecipe", NutrientRecipeSchema);

