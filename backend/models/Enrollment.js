const mongoose = require("mongoose");

const EnrollmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  paid: { type: Boolean, default: false },
  pricePaid: Number,
  transactionId: String,
  completedLessons: [String],
  lastLessonId: { type: String, default: null },
  viewedLessons: [String],

  progress: { type: Number, default: 0 },
  certificateIssued: { type: Boolean, default: false },

  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model("Enrollment", EnrollmentSchema);
