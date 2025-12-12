const mongoose = require("mongoose");

const ForumPostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    content: String,            // text
    photos: [String],           // image URLs
    tags: [String],             // "yellowing", "training", "harvest"
    strain: String,             // optional

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentCount: { type: Number, default: 0 },

    // For trending algorithm
    score: { type: Number, default: 0 },
    lastInteraction: { type: Date, default: Date.now },

    // Link from Grow Log (optional)
    growLogId: { type: String, default: null },

    // Creator courses link later
    courseId: { type: String, default: null },

    // Legacy fields (keep for compatibility)
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: String,
    body: String,
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: String,
      createdAt: { type: Date, default: Date.now }
    }],
    hidden: { type: Boolean, default: false },
    vipOnly: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForumPost", ForumPostSchema);
