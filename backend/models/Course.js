const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  title: String,
  description: String,
  category: String,
  tags: [String], // search tags
  difficulty: { type: String, enum: ["Beginner", "Intermediate", "Advanced"] },
  coverImage: String,

  price: { type: Number, default: 0 }, // free or paid
  isPublished: { type: Boolean, default: false },

  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Ratings
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }
},
{ timestamps: true });

module.exports = mongoose.model("Course", CourseSchema);
