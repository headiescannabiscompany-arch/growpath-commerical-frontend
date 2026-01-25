// backend/models/Event.js
const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // allow anonymous
    type: { type: String, required: true, index: true },
    meta: { type: Object, default: {} },
    ip: { type: String, default: "" },
    ua: { type: String, default: "" }
  },
  { timestamps: true }
);

EventSchema.index({ createdAt: -1 });
EventSchema.index({ user: 1, createdAt: -1 });
EventSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("Event", EventSchema);
