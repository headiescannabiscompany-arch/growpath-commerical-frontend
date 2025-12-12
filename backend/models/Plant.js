const mongoose = require("mongoose");

const PlantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    strain: String,
    growMedium: String,
    startDate: Date,
    templates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Template" }],
    stage: {
      type: String,
      enum: ["Seedling", "Vegetative", "Flower", "Drying", "Curing"],
      default: "Seedling",
    },
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plant", PlantSchema);
