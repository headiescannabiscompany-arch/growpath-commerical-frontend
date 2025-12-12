const mongoose = require("mongoose");

const LessonSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

  title: String,
  content: String, // text/html
  videoUrl: String,
  pdfUrl: String,

  order: Number,

  analytics: {
    views: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    totalWatchTime: { type: Number, default: 0 }, // seconds
    completedCount: { type: Number, default: 0 },
    dropoffPoints: [Number] // seconds where users exited
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Lesson", LessonSchema);
