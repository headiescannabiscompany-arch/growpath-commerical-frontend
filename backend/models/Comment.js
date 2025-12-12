const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    parentId: { type: String, default: null }, // for replies, optional
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", CommentSchema);
