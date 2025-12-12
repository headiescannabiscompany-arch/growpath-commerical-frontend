const mongoose = require("mongoose");

const StepSchema = new mongoose.Schema(
  {
    day: Number,
    label: String,
    stage: String,
    actionType: String,
    details: String,
    nutrients: String,
  },
  { _id: false }
);

const TemplateSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: String,
    description: String,
    strain: String,
    growMedium: String,
    difficulty: { type: String, enum: ["Beginner", "Intermediate", "Advanced"] },
    durationDays: Number,
    price: { type: Number, default: 0 },
    tags: [String],
    steps: [StepSchema],
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", TemplateSchema);
