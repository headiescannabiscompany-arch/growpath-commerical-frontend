const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
  rating: { type: Number, min: 1, max: 5 },
  text: String,

  // Optional: creators replying to reviews
  creatorReply: String,
}, 
{ timestamps: true });

module.exports = mongoose.model("Review", ReviewSchema);