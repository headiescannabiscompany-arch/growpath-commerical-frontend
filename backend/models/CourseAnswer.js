const mongoose = require("mongoose");

const CourseAnswerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: "CourseQuestion" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  text: String,

}, { timestamps: true });

module.exports = mongoose.model("CourseAnswer", CourseAnswerSchema);