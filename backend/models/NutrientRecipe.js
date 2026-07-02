"use strict";

const mongoose = require("mongoose");
const SourceRecordSchema = require("./schemas/sourceRecord");

const NutrientRecipeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    growId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    version: { type: Number, required: true, default: 1 },
    rootRecipeId: { type: String, default: null, index: true },
    previousVersionId: { type: String, default: null },
    clonedFromRecipeId: { type: String, default: null },
    stage: { type: String, default: "veg" },
    medium: { type: String, default: "unspecified" },
    batchVolume: { type: Number, required: true },
    batchUnit: { type: String, enum: ["L", "gal"], required: true },
    products: { type: [mongoose.Schema.Types.Mixed], default: [] },
    releaseEnvironment: { type: mongoose.Schema.Types.Mixed, default: {} },
    waterBaseline: { type: mongoose.Schema.Types.Mixed, default: {} },
    measuredEC: { type: Number, default: null },
    measuredPH: { type: Number, default: null },
    sourceConfidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    sourceRecords: { type: [SourceRecordSchema], default: [] },
    mixingOrder: { type: [String], default: [] },
    calculation: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: "" },
    active: { type: Boolean, default: true, index: true },
    archivedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    useCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

NutrientRecipeSchema.index({ user: 1, rootRecipeId: 1, version: -1 });
NutrientRecipeSchema.index({ user: 1, growId: 1, active: 1, updatedAt: -1 });

NutrientRecipeSchema.pre("save", function setRoot(next) {
  if (!this.rootRecipeId && this._id) this.rootRecipeId = String(this._id);
  next();
});

module.exports = mongoose.model("NutrientRecipe", NutrientRecipeSchema);
