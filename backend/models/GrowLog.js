const mongoose = require("mongoose");

const GrowLogEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  date: { type: Date, default: Date.now },

  title: String,
  notes: String,

  photos: [String], // multiple photo URLs

  stage: { type: String, enum: ["seedling", "veg", "flower"], default: "veg" },
  week: Number,
  day: Number,
  strain: String,

  tags: [String], // AI + user tags

  aiInsights: { type: String, default: "" }, // AI explanation

  environment: {
    temp: Number,
    humidity: Number,
    vpd: Number,
    ph: Number
  },

  plant: { type: mongoose.Schema.Types.ObjectId, ref: "Plant" },
  heightCm: Number,
  stageOverride: String,

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("GrowLogEntry", GrowLogEntrySchema);
