const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    text: String,
    photos: [String],

    plant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plant",
      default: null,
    },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likeCount: { type: Number, default: 0 },

    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],

    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
