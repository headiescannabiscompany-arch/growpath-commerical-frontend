const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["post"], default: "post" },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "CommercialPost" },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
