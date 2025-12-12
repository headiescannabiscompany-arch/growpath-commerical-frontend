const mongoose = require("mongoose");

const CourseQuestionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  text: String,

}, { timestamps: true });

module.exports = mongoose.model("CourseQuestion", CourseQuestionSchema);